import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Modal, Badge, Dropdown, ButtonGroup, Row, Col } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
import { FORM_ERROR } from 'final-form';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import GroupsTreeView from '../../components/Groups/GroupsTreeView';
import TermLabel from '../../components/Terms/TermLabel';
import AddAttributeForm, { INITIAL_VALUES as ADD_FORM_INITIAL_VALUES } from '../../components/forms/AddAttributeForm';
import PlantTermGroupsForm, {
  initialValuesCreator as plantFormInitialValuesCreator,
} from '../../components/forms/PlantTermGroupsForm';
import Icon, { CloseIcon, GroupIcon, ManagementIcon } from '../../components/icons';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';
import Button from '../../components/widgets/TheButton';
import Callout from '../../components/widgets/Callout';
import Markdown from '../../components/widgets/Markdown';

import { fetchAllGroups, addGroupAttribute, removeGroupAttribute } from '../../redux/modules/groups.js';
import { fetchAllTerms } from '../../redux/modules/terms.js';
import { fetchUserIfNeeded } from '../../redux/modules/users.js';
import { addNotification } from '../../redux/modules/notifications.js';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import { getGroups } from '../../redux/selectors/groups.js';
import { termsSelector } from '../../redux/selectors/terms.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

import { isSuperadminRole } from '../../components/helpers/usersRoles.js';

const DEFAULT_EXPIRATION = 7; // days

class GroupsSuperadmin extends Component {
  state = {
    modalGroup: null,
    modalGroupPending: false,
    modalGroupError: null,
    plantTerm: null,
    modalPlant: false,
    plantTexts: null,
  };

  openModalGroup = modalGroup =>
    this.setState({ modalGroup, modalGroupPending: false, modalGroupError: null, modalPlant: false });

  closeModalGroup = () =>
    this.setState({
      modalGroup: null,
      modalGroupPending: false,
      modalGroupError: null,
    });

  openModalPlant = () => this.setState({ modalPlant: true, modalGroup: null });

  closeModalPlant = () => this.setState({ modalPlant: false });

  cancelGroupPlanting = () => this.setState({ plantTexts: null });

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
    this.setState({ plantTexts });
    this.closeModalPlant();
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

                          <Button variant="secondary" size="sm" onClick={this.cancelGroupPlanting}>
                            <CloseIcon gapRight />
                            <FormattedMessage id="generic.cancel" defaultMessage="Cancel" />
                          </Button>
                        </Callout>
                      )}

                      <GroupsTreeView
                        groups={groups}
                        addAttribute={this.openModalGroup}
                        removeAttribute={removeAttribute}
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
                          <Button variant="secondary" onClick={this.cancelGroupPlanting}>
                            <Icon icon="leaf" gapRight />
                            <FormattedMessage
                              id="app.groupsSupervisor.cancelPlantTermButton"
                              defaultMessage="Cancel Group Planting"
                            />
                          </Button>
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
  })
)(GroupsSuperadmin);
