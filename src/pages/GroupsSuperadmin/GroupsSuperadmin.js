import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Modal, Badge, Dropdown, ButtonGroup, Row, Col } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
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
import Icon, { CloseIcon, GroupIcon, LoadingIcon, ManagementIcon } from '../../components/icons';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';
import Button, { TheButtonGroup } from '../../components/widgets/TheButton';
import Callout from '../../components/widgets/Callout';
import Markdown from '../../components/widgets/Markdown';

import {
  fetchAllGroups,
  addGroupAttribute,
  removeGroupAttribute,
  createTermGroup,
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

const DEFAULT_EXPIRATION = 7; // days

// keep only courses (term parents) and term groups
const plantingGroupFilter = group => group.attributes?.course?.length > 0 || group.attributes?.term?.length > 0;

const plantingCheckboxSelector = lruMemoize(
  term => group =>
    group.attributes?.course?.length > 0 &&
    !group.children.some(g => g.attributes?.term?.includes(`${term.year}-${term.term}`))
);

class GroupsSuperadmin extends Component {
  state = {
    modalGroup: null,
    modalGroupPending: false,
    modalGroupError: null,
    plantTerm: null,
    modalPlant: false,
    plantTexts: null,
    plantGroups: null,
    plantGroupsCount: 0,
    plantGroupsPending: false,
    plantGroupsErrors: null,
    plantedGroups: 5,
  };

  openModalGroup = modalGroup =>
    this.setState({ modalGroup, modalGroupPending: false, modalGroupError: null, modalPlant: false });

  closeModalGroup = () =>
    this.setState({
      modalGroup: null,
      modalGroupPending: false,
      modalGroupError: null,
    });

  openModalPlant = () =>
    this.setState({
      modalPlant: true,
      modalGroup: null,
      plantGroups: null,
      plantTexts: null,
      plantGroupsCount: 0,
      plantGroupsPending: false,
      plantGroupsErrors: null,
      plantedGroups: 0,
    });

  closeModalPlant = () => this.setState({ modalPlant: false });

  cancelGroupPlanting = () => {
    if (!this.state.plantGroupsPending) {
      this.setState({
        plantTexts: null,
        plantGroups: null,
        plantGroupsCount: 0,
        plantGroupsPending: false,
        plantGroupsErrors: null,
        plantedGroups: 0,
      });
    }
  };

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

  plantTermGroupsFormSubmit = plantTexts => {
    this.setState({
      plantTexts,
      plantGroups: {},
      plantGroupsCount: 0,
      plantGroupsPending: false,
      plantGroupsErrors: null,
      plantedGroups: 0,
    });
    this.closeModalPlant();
  };

  changePlantGroups = (id, newState) => {
    if (
      this.state.plantGroups &&
      !this.state.plantGroupsPending &&
      Boolean(this.state.plantGroups[id]) !== Boolean(newState)
    ) {
      const plantGroups = { ...this.state.plantGroups, [id]: Boolean(newState) };
      const plantGroupsCount = Object.values(plantGroups).filter(v => v).length;
      this.setState({ plantGroups, plantGroupsCount });
    }
  };

  plantGroups = async term => {
    const { createTermGroup, reloadGroups } = this.props;
    if (this.state.plantGroupsCount === 0) {
      return;
    }

    this.setState({ plantGroupsPending: true, plantGroupsErrors: null, plantedGroups: 0 });

    // start creating the groups
    const termId = `${term.year}-${term.term}`;
    const promises = {};
    Object.keys(this.state.plantGroups)
      .filter(id => this.state.plantGroups[id])
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
        plantGroupsErrors[id] = getErrorMessage(err);
      }
    }

    await reloadGroups();

    if (Object.keys(plantGroupsErrors).length > 0) {
      // still planting, but also show errors
      this.setState({ plantGroupsErrors, plantGroups: {} });
    } else {
      // terminate planing
      this.setState({ plantTexts: null, plantGroups: null });
    }

    this.setState({ plantGroupsPending: false, plantGroupsCount: 0, plantedGroups });
  };

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
                              disabled={this.state.plantGroupsCount === 0 || this.state.plantGroupsPending}>
                              {this.state.plantGroupsPending ? <LoadingIcon gapRight /> : <Icon icon="leaf" gapRight />}
                              <FormattedMessage
                                id="app.groupsSupervisor.plantTermGroupsConfirmButton"
                                defaultMessage="Plant Term Groups"
                              />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={this.state.plantGroupsPending}
                              onClick={this.cancelGroupPlanting}>
                              <CloseIcon gapRight />
                              <FormattedMessage id="generic.cancel" defaultMessage="Cancel" />
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

                      <GroupsTreeView
                        groups={groups}
                        errors={this.state.plantTexts ? this.state.plantGroupsErrors : null}
                        filter={this.state.plantTexts ? plantingGroupFilter : null}
                        checkboxes={
                          this.state.plantTexts ? plantingCheckboxSelector(this.state.plantTerm || terms[0]) : null
                        }
                        checked={this.state.plantGroups}
                        addAttribute={!this.state.plantTexts ? this.openModalGroup : null}
                        removeAttribute={!this.state.plantTexts ? removeAttribute : null}
                        setChecked={this.state.plantTexts ? this.changePlantGroups : null}
                      />

                      <hr />

                      <div className="text-center">
                        {terms && terms.length > 0 && !this.state.plantTexts && (
                          <Dropdown as={ButtonGroup}>
                            <Button variant="success" onClick={this.openModalPlant}>
                              <Icon icon="leaf" gapRight />
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
                          <TheButtonGroup>
                            <Button
                              variant={this.state.plantGroupsErrors ? 'danger' : 'success'}
                              onClick={() => this.plantGroups(this.state.plantTerm || terms[0])}
                              disabled={this.state.plantGroupsCount === 0 || this.state.plantGroupsPending}>
                              {this.state.plantGroupsPending ? <LoadingIcon gapRight /> : <Icon icon="leaf" gapRight />}
                              <FormattedMessage
                                id="app.groupsSupervisor.plantTermGroupsConfirmButton"
                                defaultMessage="Plant Term Groups"
                              />
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={this.state.plantGroupsPending}
                              onClick={this.cancelGroupPlanting}>
                              <CloseIcon gapRight />
                              <FormattedMessage
                                id="app.groupsSupervisor.cancelPlantTermButton"
                                defaultMessage="Cancel Group Planting"
                              />
                            </Button>
                          </TheButtonGroup>
                        )}
                      </div>
                    </>
                  </Box>

                  <Modal
                    show={Boolean(this.state.modalGroup)}
                    backdrop="static"
                    size="xl"
                    fullscreen="xl-down"
                    onHide={this.closeModalGroup}>
                    <Modal.Header closeButton={!this.state.modalGroupPending}>
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
  })
)(GroupsSuperadmin);
