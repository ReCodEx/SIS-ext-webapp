import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Modal } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import Button, { TheButtonGroup } from '../../components/widgets/TheButton';
import { CloseIcon, ManagementIcon } from '../../components/icons';
// import ResourceRenderer from '../../components/helpers/ResourceRenderer';

import { fetchAllGroups } from '../../redux/modules/groups.js';
import { fetchUserIfNeeded } from '../../redux/modules/users.js';
import { fetchAllTerms } from '../../redux/modules/terms.js';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import { getGroups } from '../../redux/selectors/groups.js';
import { termsSelector } from '../../redux/selectors/terms.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

import { isSuperadminRole } from '../../components/helpers/usersRoles.js';
import Callout from '../../components/widgets/Callout/Callout.js';

const DEFAULT_EXPIRATION = 7; // days

/*
const getSortedTerms = lruMemoize(terms => {
  const now = Math.floor(Date.now() / 1000);
  return terms
    .filter(term => term.teachersFrom <= now && term.teachersUntil >= now)
    .sort((b, a) => a.year * 10 + a.term - (b.year * 10 + b.term));
});

const getGroupAdmins = group => {
  const res = Object.values(group.admins)
    .map(admin => admin.lastName)
    .join(', ');
  return res ? ` [${res}]` : '';
};
*/

class GroupsSuperadmin extends Component {
  state = {
    modalPending: false,
    modalError: null,
    selectGroups: null,
    selectedGroupId: '',
  };

  closeModal = () =>
    this.setState({
      modalPending: false,
      modalError: null,
      selectGroups: null,
      selectedGroupId: '',
    });

  // handleGroupChange = ev => this.setState({ selectedGroupId: ev.target.value });

  completeModalOperation = () => {
    // const { loggedInUserId, loadAsync } = this.props;
    // this.setState({ modalPending: true });
    this.closeModal();
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
    const { loggedInUser, groups } = this.props;

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
                title={<FormattedMessage id="app.groupsSupervisor.currentlyManagedGroups" defaultMessage="Groups" />}>
                {Object.values(groups).map(group => (
                  <div key={group.id}>{group.id}</div>
                ))}
              </Box>

              <Modal show={false} backdrop="static" size="xl" fullscreen="xl-down" onHide={this.closeModal}>
                <Modal.Header closeButton={!this.state.modalPending}>
                  <Modal.Title>
                    <FormattedMessage
                      id="app.groupsSupervisor.addAttributeModal.title"
                      defaultMessage="Add Attribute to Group"
                    />
                  </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                  {this.state.modalError && (
                    <Callout variant="danger" className="mt-3">
                      <p>
                        <FormattedMessage id="generic.operationFailed" defaultMessage="The operation has failed" />:
                      </p>
                      <pre>{this.state.modalError}</pre>
                    </Callout>
                  )}
                </Modal.Body>

                <Modal.Footer>
                  <div className="text-center w-100">
                    <TheButtonGroup>
                      <Button variant="secondary" disabled={this.state.modalPending} onClick={this.closeModal}>
                        <CloseIcon gapRight />
                        <FormattedMessage id="generic.cancel" defaultMessage="Cancel" />
                      </Button>
                    </TheButtonGroup>
                  </div>
                </Modal.Footer>
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
  })
)(GroupsSuperadmin);
