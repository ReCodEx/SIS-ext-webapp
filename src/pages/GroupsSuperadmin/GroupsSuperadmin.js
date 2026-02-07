import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Modal, Badge, Dropdown, ButtonGroup, Row, Col } from 'react-bootstrap';
import { FormattedMessage, injectIntl } from 'react-intl';
import { FORM_ERROR } from 'final-form';
import { lruMemoize } from 'reselect';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import GroupsTreeView from '../../components/Groups/GroupsTreeView';
import TermLabel from '../../components/Terms/TermLabel';
import AddAttributeForm, { INITIAL_VALUES as ADD_FORM_INITIAL_VALUES } from '../../components/forms/AddAttributeForm';
import PlantTermGroupsForm, {
  initialValuesCreator as plantFormInitialValuesCreator,
} from '../../components/forms/PlantTermGroupsForm';
import Icon, {
  ArchiveIcon,
  CloseIcon,
  GroupIcon,
  LoadingIcon,
  ManagementIcon,
  PlantIcon,
} from '../../components/icons';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';
import Button, { TheButtonGroup } from '../../components/widgets/TheButton';
import Callout from '../../components/widgets/Callout';
import Markdown from '../../components/widgets/Markdown';

import {
  fetchAllGroups,
  addGroupAttribute,
  removeGroupAttribute,
  createTermGroup,
  setGroupArchived,
} from '../../redux/modules/groups.js';
import { fetchAllTerms } from '../../redux/modules/terms.js';
import { fetchUserIfNeeded } from '../../redux/modules/users.js';
import { addNotification } from '../../redux/modules/notifications.js';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import { getGroups } from '../../redux/selectors/groups.js';
import { termsSelector } from '../../redux/selectors/terms.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

import { isSuperadminRole } from '../../components/helpers/usersRoles.js';
import { getErrorMessage } from '../../locales/apiErrorMessages.js';
import { getGroups as getGroupsHelper } from '../../components/Groups/helpers.js';

import { isEmptyObject } from '../../helpers/common.js';

const DEFAULT_EXPIRATION = 7; // days

// keep only courses (term parents) and term groups
const plantingGroupFilter = group => group.attributes?.course?.length > 0 || group.attributes?.term?.length > 0;

const plantingCheckboxPredicate = (group, term) =>
  group.attributes?.course?.length > 0 &&
  !group.children.some(g => g.attributes?.term?.includes(`${term.year}-${term.term}`));

const plantingCheckboxSelector = lruMemoize(term => group => plantingCheckboxPredicate(group, term));

const highlightClassGenerator = lruMemoize(
  term => group => (group.attributes?.term?.includes(`${term.year}-${term.term}`) ? 'text-success fw-bold' : '')
);

const getPlantingCandidates = (groups, term) => {
  const candidates = {};
  getGroupsHelper(groups, 'en', true)
    .filter(g => plantingCheckboxPredicate(g, term) && g.attributes?.['for-term']?.includes(`${term.term}`))
    .forEach(g => {
      candidates[g.id] = true;
    });
  return candidates;
};

const getGroupsForArchiving = lruMemoize((groups, terms) => {
  const nowTs = Date.now() / 1000;
  const archivedTerms = {};
  terms.filter(t => t.archiveAfter && t.archiveAfter <= nowTs).forEach(t => (archivedTerms[`${t.year}-${t.term}`] = t));

  const groupsForArchiving = {};
  Object.values(groups)
    .filter(g => g.attributes?.term && g.attributes?.term.some(t => archivedTerms[t]))
    .forEach(g => {
      groupsForArchiving[g.id] = true;
    });

  return groupsForArchiving;
});

const archivingGroupFilter = group => group.attributes?.term?.length > 0;

const archivingCheckboxSelector = lruMemoize(groups => group => group.id in groups);

class GroupsSuperadmin extends Component {
  /*
   * There are several modes the page can be operating in, which are controlled by the state properties:
   * - Adding new attribute to a group (modalGroup is set)
   * - Planting term groups stage 1 -- updating planted group texts in a modal.
   * - Planting term groups stage 2 -- selecting parent groups before confirming planting
   * - Archiving old term groups -- selecting groups to be archived
   */
  state = {
    operationPending: false, // an async operation (adding attribute, planting groups, archiving groups) is pending
    selectedGroups: null, // groups with checkboxes (if  checkboxes are shown)
    selectedGroupsCount: 0, // number of selected groups (for easy access without iterating over selectedGroups)
    modalGroup: null, // group for which the "add attribute" modal is open (also controls whether the modal is open)
    modalGroupError: null, // error message to be displayed in the "add attribute" modal if the operation fails
    modalPlant: false, // whether the "plant term groups" modal is open
    plantTerm: null, // term selected for planting, if null, the first term in the list is used
    plantTexts: null, // texts for the groups to be planted (not null indicates that stage 2 of planting is active)
    plantGroupsErrors: null, // object groupId -> error message for groups that failed to be planted (only relevant in stage 2 of planting)
    plantedGroups: 0, // number of groups successfully planted in the last planting operation
    archiving: false, // whether the page is in "archiving mode" (selecting groups for archiving)
    archivedGroups: 0, // number of groups successfully archived in the last archiving operation
    archivedErrors: 0, // number of groups that failed to be archived in the last archiving operation
  };

  pageInDefaultMode = () =>
    !this.state.modalGroup && !this.state.plantTexts && !this.state.modalPlant && !this.state.archiving;

  changeSelectedGroups = (id, newState) => {
    if (
      this.state.selectedGroups &&
      !this.state.operationPending &&
      Boolean(this.state.selectedGroups[id]) !== Boolean(newState)
    ) {
      const selectedGroups = { ...this.state.selectedGroups, [id]: Boolean(newState) };
      const selectedGroupsCount = Object.values(selectedGroups).filter(v => v).length;
      this.setState({ selectedGroups, selectedGroupsCount });
    }
  };

  /*
   * Adding new attribute to a group
   */

  openModalGroup = modalGroup => {
    if (this.pageInDefaultMode() && !this.state.operationPending) {
      this.setState({
        modalGroup,
        operationPending: false,
        modalGroupError: null,
        modalPlant: false,
        plantedGroups: 0,
        archivedGroups: 0,
        archivedErrors: 0,
      });
    }
  };

  closeModalGroup = () =>
    this.setState({
      modalGroup: null,
      operationPending: false,
      modalGroupError: null,
    });

  addAttributeFormSubmit = async values => {
    if (this.state.modalGroup) {
      const key = values.mode === 'other' ? values.key.trim() : values.mode;
      const value = values.mode === 'other' ? values.value.trim() : values[values.mode].trim();
      try {
        await this.props.addAttribute(this.state.modalGroup.id, key, value);
        this.closeModalGroup();
        return undefined; // no error
      } catch (err) {
        return { [FORM_ERROR]: err?.message || err.toString() };
      }
    } else {
      return Promise.resolve();
    }
  };

  /*
   * Planting term groups
   */

  openModalPlant = (groups, term) => {
    if (!this.pageInDefaultMode() || this.state.operationPending) {
      return;
    }

    const selectedGroups = getPlantingCandidates(groups, term);
    this.setState({
      modalPlant: true,
      modalGroup: null,
      selectedGroups,
      plantTexts: null,
      selectedGroupsCount: Object.keys(selectedGroups).length,
      operationPending: false,
      plantGroupsErrors: null,
      plantedGroups: 0,
      archivedGroups: 0,
      archivedErrors: 0,
    });
  };

  closeModalPlant = () => this.setState({ modalPlant: false, selectedGroups: null, selectedGroupsCount: 0 });

  cancelGroupPlanting = () => {
    if (!this.state.operationPending) {
      this.setState({
        plantTexts: null,
        selectedGroups: null,
        selectedGroupsCount: 0,
        operationPending: false,
        plantGroupsErrors: null,
        plantedGroups: 0,
      });
    }
  };

  plantTermGroupsFormSubmit = plantTexts => {
    this.setState({
      plantTexts,
      operationPending: false,
      plantGroupsErrors: null,
      plantedGroups: 0,
      modalPlant: false,
    });
  };

  plantGroups = async term => {
    const {
      createTermGroup,
      reloadGroups,
      intl: { formatMessage },
    } = this.props;

    if (this.state.selectedGroupsCount === 0 || this.state.operationPending) {
      return;
    }

    this.setState({ operationPending: true, plantGroupsErrors: null, plantedGroups: 0 });

    // start creating the groups
    const termId = `${term.year}-${term.term}`;
    const promises = {};
    Object.keys(this.state.selectedGroups)
      .filter(id => this.state.selectedGroups[id])
      .forEach(id => {
        promises[id] = createTermGroup(id, termId, this.state.plantTexts);
      });

    // wait for all promises and handle errors
    const plantGroupsErrors = {};
    let plantedGroups = 0;
    for (const id of Object.keys(promises)) {
      try {
        await promises[id];
        ++plantedGroups;
      } catch (err) {
        plantGroupsErrors[id] = getErrorMessage(formatMessage)(err);
      }
    }

    await reloadGroups();

    if (Object.keys(plantGroupsErrors).length > 0) {
      // still planting, but also show errors
      this.setState({ plantGroupsErrors, selectedGroups: {} });
    } else {
      // terminate planing
      this.setState({ plantTexts: null, selectedGroups: null });
    }

    this.setState({ operationPending: false, selectedGroupsCount: 0, plantedGroups });
  };

  /*
   * Archiving
   */

  startArchiving = (groups, terms) => {
    if (this.pageInDefaultMode() && !this.state.operationPending) {
      const selectedGroups = getGroupsForArchiving(groups, terms);
      this.setState({
        archiving: true,
        selectedGroups,
        selectedGroupsCount: Object.keys(selectedGroups).length,
        plantGroupsErrors: null,
        plantedGroups: 0,
        archivedGroups: 0,
        archivedErrors: 0,
      });
    }
  };

  archiveSelectedGroups = async () => {
    const { setGroupArchived, reloadGroups } = this.props;

    if (this.state.selectedGroupsCount === 0 || this.state.operationPending) {
      return;
    }

    const promises = {};
    Object.keys(this.state.selectedGroups)
      .filter(id => this.state.selectedGroups[id])
      .forEach(id => {
        promises[id] = setGroupArchived(id, true);
      });

    // wait for all promises and handle errors
    let archivedGroups = 0;
    let archivedErrors = 0;
    for (const id of Object.keys(promises)) {
      try {
        await promises[id];
        ++archivedGroups;
      } catch (err) {
        ++archivedErrors;
      }
    }

    await reloadGroups();

    this.cancelArchiving();
    this.setState({ archivedGroups, archivedErrors });
  };

  cancelArchiving = () => this.setState({ archiving: false, selectedGroups: null, selectedGroupsCount: 0 });

  /*
   * Lifecycle management and data loading
   */

  componentDidMount() {
    this.props.loadAsync(this.props.loggedInUserId);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loggedInUserId !== this.props.loggedInUserId) {
      this.props.loadAsync(this.props.loggedInUserId);
    }
  }

  static loadAsync = ({ userId }, dispatch, expiration = DEFAULT_EXPIRATION) =>
    Promise.all([
      dispatch(fetchUserIfNeeded(userId, { allowReload: true })),
      dispatch(fetchAllGroups()),
      dispatch(fetchAllTerms()),
    ]);

  render() {
    const { loggedInUser, groups, terms, removeAttribute } = this.props;

    return (
      <Page
        resource={[loggedInUser, groups]}
        icon={<ManagementIcon />}
        title={
          <FormattedMessage id="app.groupsSupervisor.title" defaultMessage="Manage All Groups and Their Associations" />
        }>
        {(user, groups) =>
          isSuperadminRole(user.role) ? (
            <ResourceRenderer resourceArray={terms}>
              {terms => (
                <>
                  <Box
                    unlimitedHeight
                    title={
                      <FormattedMessage id="app.groupsSupervisor.currentlyManagedGroups" defaultMessage="Groups" />
                    }>
                    <>
                      {this.state.plantTexts && (
                        <Callout variant="success" icon="leaf">
                          <h5>
                            <FormattedMessage
                              id="app.groupsSupervisor.plantTermGroupsInfo"
                              defaultMessage="Planting groups for term {termLabel}"
                              values={{ termLabel: <TermLabel term={this.state.plantTerm || terms[0]} /> }}
                            />
                          </h5>

                          <FormattedMessage
                            id="app.groupsSupervisor.plantTermGroupsExplanation"
                            defaultMessage="Organizational groups will be created for the selected term using the following names and descriptions:"
                          />

                          <Row>
                            <Col xs={12} xl={6}>
                              <div className="border border-success-subtle rounded-1 p-3 pb-0 my-2">
                                <h5 className="text-muted">
                                  <Icon icon={['far', 'flag']} gapRight />
                                  <FormattedMessage id="app.plantTermGroupsForm.czech" defaultMessage="Czech" />
                                </h5>
                                <strong>{this.state.plantTexts.cs.name}</strong>
                                <Markdown source={this.state.plantTexts.cs.description} />
                              </div>
                            </Col>
                            <Col xs={12} xl={6}>
                              <div className="border border-success-subtle rounded-1 p-3 pb-0 my-2">
                                <h5 className="text-muted">
                                  <Icon icon={['far', 'flag']} gapRight />
                                  <FormattedMessage id="app.plantTermGroupsForm.english" defaultMessage="English" />
                                </h5>
                                <strong>{this.state.plantTexts.en.name}</strong>
                                <Markdown source={this.state.plantTexts.en.description} />
                              </div>
                            </Col>
                          </Row>

                          <p>
                            <FormattedMessage
                              id="app.groupsSupervisor.plantTermGroupsSelectParents"
                              defaultMessage="Please, select courses in which the term groups will be planted."
                            />
                          </p>

                          <TheButtonGroup>
                            <Button
                              variant={this.state.plantGroupsErrors ? 'danger' : 'success'}
                              size="sm"
                              onClick={() => this.plantGroups(this.state.plantTerm || terms[0])}
                              disabled={this.state.selectedGroupsCount === 0 || this.state.operationPending}>
                              {this.state.operationPending ? <LoadingIcon gapRight /> : <PlantIcon gapRight />}
                              <FormattedMessage
                                id="app.groupsSupervisor.plantTermGroupsConfirmButton"
                                defaultMessage="Plant Term Groups"
                              />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={this.state.operationPending}
                              onClick={this.cancelGroupPlanting}>
                              <CloseIcon gapRight />
                              <FormattedMessage id="generic.cancel" defaultMessage="Cancel" />
                            </Button>
                          </TheButtonGroup>
                        </Callout>
                      )}

                      {this.state.archiving && (
                        <Callout variant="success" icon={<ArchiveIcon />}>
                          <h5>
                            <FormattedMessage
                              id="app.groupsSupervisor.archivingGroupsHeading"
                              defaultMessage="Archiving Old Term Groups"
                            />
                          </h5>

                          <p>
                            <FormattedMessage
                              id="app.groupsSupervisor.archivingGroupsInfo"
                              defaultMessage="Selected term groups will be archived (with all their sub-groups). This operation may be reverted in ReCodEx by individually excavating the groups from the archive."
                            />
                          </p>

                          <TheButtonGroup>
                            <Button
                              variant="danger"
                              onClick={this.archiveSelectedGroups}
                              disabled={this.state.selectedGroupsCount === 0 || this.state.operationPending}>
                              {this.state.operationPending ? <LoadingIcon gapRight /> : <ArchiveIcon gapRight />}
                              <FormattedMessage
                                id="app.groupsSupervisor.archiveButton"
                                defaultMessage="Archive Selected Groups"
                              />
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={this.cancelArchiving}
                              disabled={this.state.operationPending}>
                              <CloseIcon gapRight />
                              <FormattedMessage
                                id="app.groupsSupervisor.cancelArchivingButton"
                                defaultMessage="Cancel Archiving"
                              />
                            </Button>
                          </TheButtonGroup>
                        </Callout>
                      )}

                      {this.state.plantedGroups > 0 && (
                        <Callout variant="success">
                          <CloseIcon
                            onClick={() => this.setState({ plantedGroups: 0 })}
                            className="float-end clickable pt-1"
                          />
                          <FormattedMessage
                            id="app.groupsSupervisor.plantingSucceeded"
                            defaultMessage="Total {count} {count, plural, one {group} other {groups}} have been successfully planted."
                            values={{ count: this.state.plantedGroups }}
                          />
                        </Callout>
                      )}

                      {this.state.plantGroupsErrors && (
                        <Callout variant="danger">
                          <FormattedMessage
                            id="app.groupsSupervisor.plantingFailed"
                            defaultMessage="Planting has failed. Some of the groups could not be created. Their parent groups are marked below."
                          />
                        </Callout>
                      )}

                      {this.state.archivedGroups + this.state.archivedErrors > 0 && (
                        <Callout
                          variant={
                            this.state.archivedErrors === 0
                              ? 'success'
                              : this.state.archivedGroups === 0
                                ? 'danger'
                                : 'warning'
                          }>
                          <CloseIcon
                            onClick={() => this.setState({ archivedGroups: 0, archivedErrors: 0 })}
                            className="float-end clickable pt-1"
                          />

                          {this.state.archivedErrors === 0 ? (
                            <FormattedMessage
                              id="app.groupsSupervisor.archivingResultSuccess"
                              defaultMessage="Total {archivedGroups} {archivedGroups, plural, one {group} other {groups}} were successfully archived."
                              values={{
                                archivedGroups: this.state.archivedGroups,
                              }}
                            />
                          ) : this.state.archivedGroups === 0 ? (
                            <FormattedMessage
                              id="app.groupsSupervisor.archivingResultFailure"
                              defaultMessage="Selected {archivedErrors} {archivedErrors, plural, one {group} other {groups}} failed to be archived. Please, try the operation again or try archiving the groups individually in ReCodEx."
                              values={{
                                archivedErrors: this.state.archivedErrors,
                              }}
                            />
                          ) : (
                            <FormattedMessage
                              id="app.groupsSupervisor.archivingResult"
                              defaultMessage="Total {archivedGroups} {archivedGroups, plural, one {group} other {groups}} were successfully archived, but {archivedErrors} {archivedErrors, plural, one {group} other {groups}} failed. Please, try the operation again or try archiving the groups individually in ReCodEx."
                              values={{
                                archivedGroups: this.state.archivedGroups,
                                archivedErrors: this.state.archivedErrors,
                              }}
                            />
                          )}
                        </Callout>
                      )}

                      <GroupsTreeView
                        groups={groups}
                        errors={this.state.plantTexts ? this.state.plantGroupsErrors : null}
                        filter={
                          this.state.plantTexts
                            ? plantingGroupFilter
                            : this.state.archiving
                              ? archivingGroupFilter
                              : null
                        }
                        checkboxes={
                          this.state.plantTexts
                            ? plantingCheckboxSelector(this.state.plantTerm || terms[0])
                            : this.state.archiving
                              ? archivingCheckboxSelector(getGroupsForArchiving(groups, terms))
                              : null
                        }
                        highlight={
                          this.state.plantTexts ? highlightClassGenerator(this.state.plantTerm || terms[0]) : null
                        }
                        checked={this.state.selectedGroups}
                        addAttribute={this.pageInDefaultMode() ? this.openModalGroup : null}
                        removeAttribute={this.pageInDefaultMode() ? removeAttribute : null}
                        setChecked={this.state.plantTexts || this.state.archiving ? this.changeSelectedGroups : null}
                      />

                      <hr />

                      <div className="text-center">
                        <TheButtonGroup>
                          {terms && terms.length > 0 && this.pageInDefaultMode() && (
                            <Dropdown as={ButtonGroup}>
                              <Button
                                variant="success"
                                onClick={() => this.openModalPlant(groups, this.state.plantTerm || terms[0])}>
                                <PlantIcon gapRight />
                                <FormattedMessage
                                  id="app.groupsSupervisor.plantTermButton"
                                  defaultMessage="Plant groups for"
                                />{' '}
                                <TermLabel term={this.state.plantTerm || terms[0]} />
                              </Button>
                              <Dropdown.Toggle split variant="success" id="dropdown-split-basic" />
                              <Dropdown.Menu>
                                {terms.map(term => (
                                  <Dropdown.Item key={term.id} onClick={() => this.setState({ plantTerm: term })}>
                                    <TermLabel term={term} />
                                  </Dropdown.Item>
                                ))}
                              </Dropdown.Menu>
                            </Dropdown>
                          )}

                          {this.state.plantTexts && (
                            <>
                              <Button
                                variant={this.state.plantGroupsErrors ? 'danger' : 'success'}
                                onClick={() => this.plantGroups(this.state.plantTerm || terms[0])}
                                disabled={this.state.selectedGroupsCount === 0 || this.state.operationPending}>
                                {this.state.operationPending ? <LoadingIcon gapRight /> : <PlantIcon gapRight />}
                                <FormattedMessage
                                  id="app.groupsSupervisor.plantTermGroupsConfirmButton"
                                  defaultMessage="Plant Term Groups"
                                />
                              </Button>
                              <Button
                                variant="secondary"
                                disabled={this.state.operationPending}
                                onClick={this.cancelGroupPlanting}>
                                <CloseIcon gapRight />
                                <FormattedMessage
                                  id="app.groupsSupervisor.cancelPlantTermButton"
                                  defaultMessage="Cancel Group Planting"
                                />
                              </Button>
                            </>
                          )}

                          {this.pageInDefaultMode() && !isEmptyObject(getGroupsForArchiving(groups, terms)) && (
                            <Button
                              variant="danger"
                              onClick={() => this.startArchiving(groups, terms)}
                              disabled={this.state.operationPending}>
                              <ArchiveIcon gapRight />
                              <FormattedMessage
                                id="app.groupsSupervisor.startArchivingButton"
                                defaultMessage="Select Groups for Archiving"
                              />
                            </Button>
                          )}
                          {this.state.archiving && (
                            <>
                              <Button
                                variant="danger"
                                onClick={this.archiveSelectedGroups}
                                disabled={this.state.selectedGroupsCount === 0 || this.state.operationPending}>
                                {this.state.operationPending ? <LoadingIcon gapRight /> : <ArchiveIcon gapRight />}
                                <FormattedMessage
                                  id="app.groupsSupervisor.archiveButton"
                                  defaultMessage="Archive Selected Groups"
                                />
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={this.cancelArchiving}
                                disabled={this.state.operationPending}>
                                <CloseIcon gapRight />
                                <FormattedMessage
                                  id="app.groupsSupervisor.cancelArchivingButton"
                                  defaultMessage="Cancel Archiving"
                                />
                              </Button>
                            </>
                          )}
                        </TheButtonGroup>
                      </div>
                    </>
                  </Box>

                  <Modal
                    show={Boolean(this.state.modalGroup)}
                    backdrop="static"
                    size="xl"
                    fullscreen="xl-down"
                    onHide={this.closeModalGroup}>
                    <Modal.Header closeButton={!this.state.operationPending}>
                      <Modal.Title>
                        <FormattedMessage
                          id="app.groupsSupervisor.addAttributeModal.title"
                          defaultMessage="Add Attribute to Group"
                        />
                      </Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                      <h5>
                        <GroupIcon gapRight={3} className="text-muted" />
                        {this.state.modalGroup?.fullName}
                      </h5>

                      {this.state.modalGroup?.attributes &&
                        Object.keys(this.state.modalGroup?.attributes).length > 0 && (
                          <div>
                            <strong className="me-2">
                              <FormattedMessage
                                id="app.groupsSupervisor.addAttributeModal.existingAttributes"
                                defaultMessage="Existing attributes"
                              />
                              :
                            </strong>

                            {Object.keys(this.state.modalGroup?.attributes || {}).map(key =>
                              this.state.modalGroup.attributes[key].map(value => (
                                <Badge key={`${key}=${value}`} className="text-nowrap ms-1" bg="secondary">
                                  {key}: {value}
                                </Badge>
                              ))
                            )}
                          </div>
                        )}

                      <hr />

                      {this.state.modalGroupError && (
                        <Callout variant="danger" className="mt-3">
                          <p>
                            <FormattedMessage id="generic.operationFailed" defaultMessage="The operation has failed" />:
                          </p>
                          <pre>{this.state.modalGroupError}</pre>
                        </Callout>
                      )}

                      <AddAttributeForm
                        initialValues={ADD_FORM_INITIAL_VALUES}
                        onSubmit={this.addAttributeFormSubmit}
                        onClose={this.closeModalGroup}
                        attributes={this.state.modalGroup?.attributes || null}
                      />
                    </Modal.Body>
                  </Modal>

                  {terms && terms.length > 0 && (
                    <Modal
                      show={Boolean(this.state.modalPlant)}
                      backdrop="static"
                      size="xl"
                      fullscreen="xl-down"
                      onHide={this.closeModalPlant}>
                      <Modal.Header closeButton>
                        <Modal.Title>
                          <FormattedMessage
                            id="app.groupsSupervisor.plantTermGroupsModal.title"
                            defaultMessage="Define Group Parameters for Term"
                          />{' '}
                          <TermLabel term={this.state.plantTerm || terms[0]} />
                        </Modal.Title>
                      </Modal.Header>

                      <Modal.Body>
                        <PlantTermGroupsForm
                          initialValues={plantFormInitialValuesCreator(this.state.plantTerm || terms[0])}
                          onSubmit={this.plantTermGroupsFormSubmit}
                          onClose={this.closeModalPlant}
                        />
                      </Modal.Body>
                    </Modal>
                  )}
                </>
              )}
            </ResourceRenderer>
          ) : (
            <Callout type="warning">
              <FormattedMessage
                id="app.groupsSupervisor.notSuperadmin"
                defaultMessage="This page is available to ReCodEx administrators only."
              />
            </Callout>
          )
        }
      </Page>
    );
  }
}

GroupsSuperadmin.propTypes = {
  loggedInUserId: PropTypes.string,
  loggedInUser: ImmutablePropTypes.map,
  terms: ImmutablePropTypes.list,
  groups: ImmutablePropTypes.map,
  loadAsync: PropTypes.func.isRequired,
  addAttribute: PropTypes.func.isRequired,
  removeAttribute: PropTypes.func.isRequired,
  createTermGroup: PropTypes.func.isRequired,
  reloadGroups: PropTypes.func.isRequired,
  setGroupArchived: PropTypes.func.isRequired,
  intl: PropTypes.object,
};

export default connect(
  state => ({
    loggedInUserId: loggedInUserIdSelector(state),
    loggedInUser: loggedInUserSelector(state),
    terms: termsSelector(state),
    groups: getGroups(state),
  }),
  dispatch => ({
    loadAsync: (userId, expiration = DEFAULT_EXPIRATION) =>
      GroupsSuperadmin.loadAsync({ userId }, dispatch, expiration),
    addAttribute: (groupId, key, value) => dispatch(addGroupAttribute(groupId, key, value)),
    removeAttribute: (groupId, key, value) =>
      dispatch(removeGroupAttribute(groupId, key, value)).catch(err =>
        dispatch(addNotification(err?.message || err.toString(), false))
      ),
    createTermGroup: (parentId, term, texts) => dispatch(createTermGroup(parentId, term, texts)),
    reloadGroups: () => dispatch(fetchAllGroups()),
    setGroupArchived: (groupId, value) => dispatch(setGroupArchived(groupId, value)),
  })
)(injectIntl(GroupsSuperadmin));
