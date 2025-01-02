import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { library } from '@fortawesome/fontawesome-svg-core';
import { far as regularIcons } from '@fortawesome/free-regular-svg-icons';
import { fas as solidIcons } from '@fortawesome/free-solid-svg-icons';
import { fab as brandIcons } from '@fortawesome/free-brands-svg-icons';

import LayoutContainer from '../LayoutContainer';
import { loggedInUserIdSelector, accessTokenSelector } from '../../redux/selectors/auth.js';
import { fetchUserIfNeeded } from '../../redux/modules/users.js';
import { fetchUserStatus } from '../../redux/selectors/users.js';
import { isTokenValid, isTokenInNeedOfRefreshment } from '../../redux/helpers/token';
import { addNotification } from '../../redux/modules/notifications.js';
import { logout, refresh } from '../../redux/modules/auth.js';
import { resourceStatus } from '../../redux/helpers/resourceManager';
import { suspendAbortPendingRequestsOptimization } from '../../pages/routes.js';
import { SESSION_EXPIRED_MESSAGE } from '../../redux/helpers/api/tools.js';
import withRouter, { withRouterProps } from '../../helpers/withRouter.js';

import './siscodex.css';

library.add(regularIcons, solidIcons, brandIcons);

const reloadIsRequired = (...statuses) =>
  statuses.includes(resourceStatus.FAILED) && !statuses.includes(resourceStatus.PENDING);

class App extends Component {
  static ignoreNextLocationChangeFlag = false;

  static loadAsync = (params, dispatch, { userId }) =>
    userId
      ? Promise.all([dispatch((dispatch, getState) => dispatch(fetchUserIfNeeded(userId)))]).catch(response => {
          if (response && response.status === 403) {
            dispatch(logout()); // if requests demanding basic info about user are unauthorized, the user is either blocked or something fishy is going on...
          }
        })
      : Promise.resolve();

  constructor() {
    super();
    this.isRefreshingToken = false;
    this.reloadsCount = 0;
  }

  componentDidMount() {
    this.props.loadAsync(this.props.userId);
    this.reloadsCount = 0;
  }

  componentDidUpdate(prevProps) {
    this.checkAuthentication();

    if (this.props.userId !== prevProps.userId) {
      this.reloadsCount = 0;
    }

    if (
      this.props.userId !== prevProps.userId ||
      (this.reloadsCount < 3 && reloadIsRequired(this.props.fetchUserStatus))
    ) {
      this.reloadsCount++;
      this.props.loadAsync(this.props.userId);
    }
  }

  /**
   * The validation in react-router does not cover all cases - validity of the token
   * must be checked more often.
   */
  checkAuthentication = () => {
    const { isLoggedIn, accessToken, refreshToken, logout, addNotification } = this.props;

    const token = accessToken ? accessToken.toJS() : null;
    if (isLoggedIn) {
      if (!isTokenValid(token)) {
        logout();
        addNotification(SESSION_EXPIRED_MESSAGE, false);
      } else if (isTokenInNeedOfRefreshment(token) && !this.isRefreshingToken) {
        suspendAbortPendingRequestsOptimization();
        this.isRefreshingToken = true;
        refreshToken()
          .catch(() => {
            logout();
            addNotification(SESSION_EXPIRED_MESSAGE, false);
          })
          .then(() => {
            this.isRefreshingToken = false;
          });
      }
    }
  };

  render() {
    return (
      <Routes>
        <Route path="*" element={<LayoutContainer />} />
      </Routes>
    );
  }
}

App.propTypes = {
  accessToken: PropTypes.object,
  userId: PropTypes.string,
  isLoggedIn: PropTypes.bool.isRequired,
  fetchUserStatus: PropTypes.string,
  loadAsync: PropTypes.func.isRequired,
  refreshToken: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
  addNotification: PropTypes.func.isRequired,
  location: withRouterProps.location,
};

export default withRouter(
  connect(
    state => {
      const userId = loggedInUserIdSelector(state);
      return {
        accessToken: accessTokenSelector(state),
        userId,
        isLoggedIn: Boolean(userId),
        fetchUserStatus: fetchUserStatus(state, userId),
      };
    },
    dispatch => ({
      loadAsync: userId => App.loadAsync({}, dispatch, { userId }),
      refreshToken: () => dispatch(refresh()),
      logout: () => dispatch(logout()),
      addNotification: (msg, successful) => dispatch(addNotification(msg, successful)),
    })
  )(App)
);
