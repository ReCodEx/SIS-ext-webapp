import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Modal, Badge } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
import { FORM_ERROR } from 'final-form';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import GroupsTreeView from '../../components/Groups/GroupsTreeView';
import AddAttributeForm from '../../components/forms/AddAttributeForm';
import { GroupIcon, ManagementIcon } from '../../components/icons';

import { fetchAllGroups, addGroupAttribute, removeGroupAttribute } from '../../redux/modules/groups.js';
import { fetchUserIfNeeded } from '../../redux/modules/users.js';
import { addNotification } from '../../redux/modules/notifications.js';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import { getGroups } from '../../redux/selectors/groups.js';
import { termsSelector } from '../../redux/selectors/terms.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

import { isSuperadminRole } from '../../components/helpers/usersRoles.js';
import Callout from '../../components/widgets/Callout/Callout.js';

const DEFAULT_EXPIRATION = 7; // days

const ADD_FORM_INITIAL_VALUES = {
  mode: 'course',
  course: '',
  term: '',
  group: '',
  key: '',
  value: '',
};

class GroupsSuperadmin extends Component {
  state = {
    modalGroup: null,
    modalPending: false,
    modalError: null,
  };

  openModal = modalGroup => this.setState({ modalGroup, modalPending: false, modalError: null });

  closeModal = () =>
    this.setState({
      modalGroup: null,
      modalPending: false,
      modalError: null,
    });

  addAttributeFormSubmit = async values => {
    if (this.state.modalGroup) {
      const key = values.mode === 'other' ? values.key.trim() : values.mode;
      const value = values.mode === 'other' ? values.value.trim() : values[values.mode].trim();
      try {
        await this.props.addAttribute(this.state.modalGroup.id, key, value);
        this.closeModal();
        return undefined; // no error
      } catch (err) {
        return { [FORM_ERROR]: err?.message || err.toString() };
      }
    } else {
      return Promise.resolve();
    }
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
    Promise.all([dispatch(fetchUserIfNeeded(userId, { allowReload: true })), dispatch(fetchAllGroups())]);

  render() {
    const { loggedInUser, groups, removeAttribute } = this.props;

    return (
      <Page
        resource={[loggedInUser, groups]}
        icon={<ManagementIcon />}
        title={
          <FormattedMessage id="app.groupsSupervisor.title" defaultMessage="Manage All Groups and Their Associations" />
        }>
        {(user, groups) =>
          isSuperadminRole(user.role) ? (
            <>
              <Box
                unlimitedHeight
                title={<FormattedMessage id="app.groupsSupervisor.currentlyManagedGroups" defaultMessage="Groups" />}>
                <GroupsTreeView groups={groups} addAttribute={this.openModal} removeAttribute={removeAttribute} />
              </Box>

              <Modal
                show={Boolean(this.state.modalGroup)}
                backdrop="static"
                size="xl"
                fullscreen="xl-down"
                onHide={this.closeModal}>
                <Modal.Header closeButton={!this.state.modalPending}>
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

                  {this.state.modalGroup?.attributes && Object.keys(this.state.modalGroup?.attributes).length > 0 && (
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

                  {this.state.modalError && (
                    <Callout variant="danger" className="mt-3">
                      <p>
                        <FormattedMessage id="generic.operationFailed" defaultMessage="The operation has failed" />:
                      </p>
                      <pre>{this.state.modalError}</pre>
                    </Callout>
                  )}

                  <AddAttributeForm
                    initialValues={ADD_FORM_INITIAL_VALUES}
                    onSubmit={this.addAttributeFormSubmit}
                    onClose={this.closeModal}
                    attributes={this.state.modalGroup?.attributes || null}
                  />
                </Modal.Body>
              </Modal>
            </>
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
