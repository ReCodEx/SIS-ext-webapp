import { createSelector } from 'reselect';
import { isTokenValid } from '../helpers/token';

const getAuth = state => state.auth;
const getAccessToken = auth => auth.get('accessToken');
const getLoggedInUserId = auth => auth.get('userId');

/**
 * Select access token from the state.
 */
export const jwtSelector = createSelector(getAuth, auth => auth.get('jwt'));
export const accessTokenSelector = createSelector(getAuth, getAccessToken);
export const accessTokenExpiration = createSelector(accessTokenSelector, token =>
  token ? token.get('exp') * 1000 : 0
);
export const loggedInUserIdSelector = createSelector(getAuth, getLoggedInUserId);

export const loginStatusSelector = createSelector(getAuth, auth => auth.getIn(['status', 'recodex']));

export const loginErrorSelector = createSelector(getAuth, auth => auth.getIn(['errors', 'recodex'])?.toJS() || null);

export const isLoggedIn = createSelector(
  getAuth,
  auth => Boolean(auth.get('userId')) && isTokenValid(auth.get('accessToken').toJS())
);
