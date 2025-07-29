import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { Table } from 'react-bootstrap';
import { lruMemoize } from 'reselect';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import DateTime from '../../components/widgets/DateTime';
import Button, { TheButtonGroup } from '../../components/widgets/TheButton';
import Icon, { LoadingIcon, RefreshIcon, TermIcon, WarningIcon } from '../../components/icons';
import { fetchUserIfNeeded, syncUser, syncUserReset } from '../../redux/modules/users.js';
import { fetchSisUser, fetchSisUserIfNeeded } from '../../redux/modules/sisUsers.js';
import {
  loggedInUserSelector,
  isUserSyncing,
  isUserUpdated,
  isUserSyncFailed,
  isUserSyncCanceled,
} from '../../redux/selectors/users.js';
import { loggedInSisUserSelector } from '../../redux/selectors/sisUsers.js';
import { isLoading, hasFailed, getJsData } from '../../redux/helpers/resourceManager';

import { safeGet } from '../../helpers/common.js';
import Callout from '../../components/widgets/Callout/Callout.js';

class Terms extends Component {
  componentDidMount() {
    //this.props.loadAsync(id);
  }

  componentDidUpdate(prevProps) {
    //this.props.loadAsync(id);
  }

  static loadAsync = ({ userId }, dispatch) =>
    Promise.all([dispatch(fetchUserIfNeeded(userId)), dispatch(fetchSisUserIfNeeded(userId, 30))]);

  render() {
    const {
      loggedInUser,
      loggedInSisUser,
      fetchSisUser,
      syncUser,
      syncReset,
      isUserSyncing = false,
      isUserUpdated = false,
      isUserSyncCanceled = false,
      isUserSyncFailed = false,
    } = this.props;

    return (
      <Page
        resource={loggedInUser}
        icon={<TermIcon />}
        title={<FormattedMessage id="app.terms.title" defaultMessage="Terms" />}>
        {user => {
          return (
            <Box title={<FormattedMessage id="app.terms.termsList.title" defaultMessage="List of terms" />}>
              <Table bordered>
                <thead>
                  <tr>
                    <td></td>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <th className="text-nowrap"></th>
                  </tr>
                </tbody>
              </Table>
            </Box>
          );
        }}
      </Page>
    );
  }
}

Terms.propTypes = {
  loggedInUser: ImmutablePropTypes.map,
  loggedInSisUser: ImmutablePropTypes.map,
  isUserSyncing: PropTypes.bool,
  isUserUpdated: PropTypes.bool,
  isUserSyncCanceled: PropTypes.bool,
  isUserSyncFailed: PropTypes.bool,
  loadAsync: PropTypes.func.isRequired,
  fetchSisUser: PropTypes.func.isRequired,
  fetchSisUserIfNeeded: PropTypes.func.isRequired,
  syncUser: PropTypes.func.isRequired,
  syncReset: PropTypes.func.isRequired,
};

export default connect(
  state => {
    const loggedInUser = loggedInUserSelector(state);
    return {
      loggedInUser,
      loggedInSisUser: loggedInSisUserSelector(state),
      isUserSyncing: isUserSyncing(state, loggedInUser && loggedInUser.getIn(['data', 'id'], '')),
      isUserUpdated: isUserUpdated(state, loggedInUser && loggedInUser.getIn(['data', 'id'], '')),
      isUserSyncCanceled: isUserSyncCanceled(state, loggedInUser && loggedInUser.getIn(['data', 'id'], '')),
      isUserSyncFailed: isUserSyncFailed(state, loggedInUser && loggedInUser.getIn(['data', 'id'], '')),
    };
  },
  dispatch => ({
    loadAsync: userId => Terms.loadAsync({ userId }, dispatch),
    fetchSisUser: (userId, expiration = null) => dispatch(fetchSisUser(userId, expiration)),
    fetchSisUserIfNeeded: (userId, expiration = null) => dispatch(fetchSisUserIfNeeded(userId, expiration)),
    syncUser: userId => dispatch(syncUser(userId)),
    syncReset: userId => dispatch(syncUserReset(userId)),
  })
)(Terms);
