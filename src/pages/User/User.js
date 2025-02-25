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
import Icon, { LoadingIcon, RefreshIcon, UserProfileIcon, WarningIcon } from '../../components/icons';
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

const comparedProperties = [
  {
    id: 'login',
    key: ['sisLogin'],
    sisKey: ['login'],
    caption: <FormattedMessage id="app.user.diffBox.login" defaultMessage="LDAP ID (SIS/CAS login)" />,
  },
  {
    id: 'titlesBeforeName',
    key: ['name', 'titlesBeforeName'],
    caption: <FormattedMessage id="app.user.diffBox.titlesBeforeName" defaultMessage="Titles before" />,
  },
  {
    id: 'firstName',
    key: ['name', 'firstName'],
    caption: <FormattedMessage id="app.user.diffBox.firstName" defaultMessage="First name" />,
  },
  {
    id: 'lastName',
    key: ['name', 'lastName'],
    caption: <FormattedMessage id="app.user.diffBox.lastName" defaultMessage="Last name" />,
  },
  {
    id: 'titlesAfterName',
    key: ['name', 'titlesAfterName'],
    caption: <FormattedMessage id="app.user.diffBox.titlesAfterName" defaultMessage="Titles after" />,
  },
  {
    id: 'email',
    key: ['email'],
    caption: <FormattedMessage id="app.user.diffBox.email" defaultMessage="Email" />,
  },
];

const buildDiffIndex = lruMemoize((user, sisUser) =>
  Object.fromEntries(
    comparedProperties.map(({ id, key, sisKey }) => [
      id,
      Boolean(sisUser && safeGet(user, key) !== safeGet(sisUser, sisKey || key)),
    ])
  )
);

class User extends Component {
  componentDidMount() {
    const id = this.props.loggedInUser?.getIn(['data', 'id']);
    if (id) {
      this.props.loadAsync(id);
    }
  }

  componentDidUpdate(prevProps) {
    const id = this.props.loggedInUser?.getIn(['data', 'id']);
    const prevId = prevProps.loggedInUser?.getIn(['data', 'id']);
    if (id && id !== prevId) {
      this.props.loadAsync(id);
    }
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
    const sisUserData = getJsData(loggedInSisUser)?.sisUser;
    const sisUserUpdated = Boolean(getJsData(loggedInSisUser)?.updated);
    const sisUserUpdateFailed = Boolean(getJsData(loggedInSisUser)?.failed);

    return (
      <Page
        resource={loggedInUser}
        icon={<UserProfileIcon />}
        title={<FormattedMessage id="app.user.title" defaultMessage="Personal Data" />}>
        {user => {
          const diffIndex = buildDiffIndex(user, sisUserData);
          return (
            <Box title={<FormattedMessage id="app.user.diffBox.title" defaultMessage="User's profile" />}>
              {sisUserUpdated && (
                <Callout variant="info">
                  <FormattedMessage
                    id="app.user.sisUserLoadedCallout"
                    defaultMessage="The SIS user data were successfully (re)loaded."
                  />
                </Callout>
              )}
              {sisUserUpdateFailed && (
                <Callout variant="danger">
                  <FormattedMessage id="app.user.sisUserFailedCallout" defaultMessage="SIS data (re)loading failed." />
                </Callout>
              )}

              {isUserUpdated && (
                <Callout variant="success">
                  <FormattedMessage
                    id="app.user.userUpdatedCallout"
                    defaultMessage="The ReCodEx user data were successfully updated by current SIS data."
                  />
                </Callout>
              )}

              {isUserSyncCanceled && (
                <Callout variant="warning">
                  <FormattedMessage
                    id="app.user.userSyncCanceledCallout"
                    defaultMessage="User sync operation was canceled, because the ReCodEx profile data were outdated and needed to be reloaded. Please, re-start the operation if it is still desired."
                  />
                </Callout>
              )}

              {isUserSyncFailed && (
                <Callout variant="danger">
                  <FormattedMessage
                    id="app.user.userSyncFailedCallout"
                    defaultMessage="User sync operation failed. Reload the page and try again later."
                  />
                </Callout>
              )}

              <Table bordered>
                <thead>
                  <tr>
                    <td></td>
                    <td className="border-end-0 fs-5 w-50">ReCodEx</td>
                    <td className="border-start-0 border-end-0"></td>
                    <td className="border-start-0 fs-5 w-50">SIS</td>
                  </tr>
                  <tr>
                    <th className="text-nowrap">ID:</th>
                    <td className="border-end-0">{user.id}</td>
                    <td className="border-start-0 border-end-0"></td>
                    <td className="border-start-0">{user.sisId}</td>
                  </tr>
                  <tr>
                    <td className="p-1"></td>
                    <td className="p-1" colSpan={3}></td>
                  </tr>
                </thead>

                <tbody>
                  {comparedProperties.map(({ id, key, sisKey, caption }) => (
                    <tr key={id} className={diffIndex[id] ? 'table-warning' : ''}>
                      <th className="text-nowrap">{caption}:</th>
                      <td className="border-end-0">{safeGet(user, key)}</td>
                      <td className="border-start-0 border-end-0">
                        {diffIndex[id] && <Icon icon="left-long" gapRight={3} className="text-success" />}
                      </td>
                      <td className="border-start-0">
                        {sisUserData ? (
                          <>
                            {safeGet(sisUserData, sisKey || key)}
                            {isLoading(loggedInSisUser) && <LoadingIcon gapLeft />}
                          </>
                        ) : isLoading(loggedInSisUser) ? (
                          <i>
                            <LoadingIcon gapRight />
                            <FormattedMessage id="generic.loading" defaultMessage="Loading..." />
                          </i>
                        ) : hasFailed(loggedInSisUser) ? (
                          <i>
                            <WarningIcon gapRight className="text-danger" />
                            <FormattedMessage
                              id="app.resourceRenderer.loadingFailed"
                              defaultMessage="Loading failed."
                            />
                          </i>
                        ) : (
                          <i className="opacity-25">
                            <FormattedMessage id="app.user.diffBox.notLoadedYet" defaultMessage="not loaded yet" />
                          </i>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="p-1"></td>
                    <td className="p-1" colSpan={3}></td>
                  </tr>
                  <tr className="small">
                    <td className="text-nowrap text-muted">
                      <FormattedMessage id="app.user.diffBox.lastLoaded" defaultMessage="Last loaded" />:
                    </td>
                    <td className="opacity-50 border-end-0">
                      <DateTime unixts={user.updatedAt} showRelative />
                    </td>
                    <td className="border-start-0 border-end-0"></td>
                    <td className="border-start-0 opacity-50">
                      {sisUserData && <DateTime unixts={sisUserData.updatedAt} showRelative />}
                    </td>
                  </tr>
                </tfoot>
              </Table>

              <div className="text-center">
                <TheButtonGroup>
                  {(isUserSyncing || Object.values(diffIndex).some(v => v)) && (
                    <Button
                      variant={isUserSyncFailed ? 'danger' : 'success'}
                      disabled={isUserSyncing}
                      confirm={
                        diffIndex.email ? (
                          <FormattedMessage
                            id="app.user.syncButtonConfirmEmail"
                            defaultMessage="You are about to update your e-mail address so you will be required to verify it afterwards in ReCodEx. The e-mail address is also used as your local login if you already have local account (yout local password will not be changed)."
                          />
                        ) : null
                      }
                      confirmId="email-sync-confirm"
                      onClick={() => syncUser(user.id)}>
                      {isUserSyncing ? <LoadingIcon gapRight /> : <Icon icon="left-long" gapRight />}
                      <FormattedMessage
                        id="app.user.syncButton"
                        defaultMessage="Update ReCodEx profile with data from SIS"
                      />
                    </Button>
                  )}
                  <Button
                    variant={sisUserUpdateFailed ? 'danger' : 'primary'}
                    disabled={isLoading(loggedInSisUser)}
                    onClick={() => {
                      syncReset(user.id);
                      return fetchSisUser(user.id, 0);
                    }}>
                    {isLoading(loggedInSisUser) ? <LoadingIcon gapRight /> : <RefreshIcon gapRight />}
                    <FormattedMessage id="app.user.fetchSisButton" defaultMessage="Reload SIS data" />
                  </Button>
                </TheButtonGroup>
              </div>
            </Box>
          );
        }}
      </Page>
    );
  }
}

User.propTypes = {
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
    loadAsync: userId => User.loadAsync({ userId }, dispatch),
    fetchSisUser: (userId, expiration = null) => dispatch(fetchSisUser(userId, expiration)),
    fetchSisUserIfNeeded: (userId, expiration = null) => dispatch(fetchSisUserIfNeeded(userId, expiration)),
    syncUser: userId => dispatch(syncUser(userId)),
    syncReset: userId => dispatch(syncUserReset(userId)),
  })
)(User);
