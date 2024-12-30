import { handleActions } from 'redux-actions';
import { fromJS } from 'immutable';
import { decode, isTokenValid } from '../helpers/token';
import { createApiAction } from '../middleware/apiMiddleware.js';
import { logout } from '../helpers/api/tools.js';

import { actionTypes, statusTypes } from './authTypes.js';
export { actionTypes, statusTypes };

const getUserId = token => token.get('sub');

/**
 * Actions
 */

export const login = token =>
  createApiAction({
    type: actionTypes.LOGIN,
    method: 'POST',
    endpoint: '/login',
    body: { token },
  });

export { logout }; // this logically belongs here, but since logout is required internally, we needed to declare it inside api tools

export const refresh = () =>
  createApiAction({
    type: actionTypes.LOGIN,
    method: 'POST',
    endpoint: '/login/refresh',
  });

export const decodeAndValidateAccessToken = (token, now = Date.now()) => {
  let decodedToken = null;
  if (token) {
    try {
      decodedToken = decode(token);
      if (isTokenValid(decodedToken, now) === false) {
        decodedToken = null;
      }
    } catch (e) {
      // silent error
    }
  }

  return fromJS(decodedToken);
};

/**
 * Authentication reducer.
 * @param  {string} accessToken An access token to initialise the reducer
 * @return {function} The initialised reducer
 */
const auth = (accessToken, now = Date.now()) => {
  const decodedToken = decodeAndValidateAccessToken(accessToken, now);
  const initialState =
    accessToken && decodedToken
      ? fromJS({
          status: {},
          jwt: accessToken,
          accessToken: decodedToken,
          userId: getUserId(decodedToken),
        })
      : fromJS({
          status: {},
          jwt: null,
          accessToken: null,
          userId: null,
        });

  return handleActions(
    {
      [actionTypes.LOGIN_PENDING]: state =>
        state.setIn(['status', 'recodex'], statusTypes.LOGGING_IN).deleteIn(['errors', 'recodex']),

      [actionTypes.LOGIN_FULFILLED]: (state, { payload: { accessToken } }) =>
        state.getIn(['status', 'recodex']) === statusTypes.LOGGING_IN // this should prevent re-login, when explicit logout ocurred whilst refreshing token
          ? state
              .setIn(['status', 'recodex'], statusTypes.LOGGED_IN)
              .deleteIn(['errors', 'recodex'])
              .set('jwt', accessToken)
              .set('accessToken', decodeAndValidateAccessToken(accessToken))
              .set('userId', getUserId(decodeAndValidateAccessToken(accessToken)))
          : state,

      [actionTypes.LOGIN_REJECTED]: (state, { payload }) =>
        state
          .setIn(['status', 'recodex'], statusTypes.LOGIN_FAILED)
          .setIn(['errors', 'recodex'], fromJS(payload))
          .set('jwt', null)
          .set('accessToken', null)
          .set('userId', null),
      [actionTypes.LOGOUT]: state =>
        state
          .update('status', services => services.map(() => statusTypes.LOGGED_OUT))
          .delete('errors')
          .set('jwt', null)
          .set('accessToken', null)
          .set('userId', null),
    },
    initialState
  );
};

export default auth;
