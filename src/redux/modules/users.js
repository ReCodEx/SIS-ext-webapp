import { createAction, handleActions } from 'redux-actions';

import factory, {
  initialState,
  createRecord,
  resourceStatus,
  createActionsWithPostfixes,
} from '../helpers/resourceManager';
import { createApiAction } from '../middleware/apiMiddleware.js';

import { actionTypes as authActionTypes } from './authTypes.js';

export const additionalActionTypes = {
  ...createActionsWithPostfixes('SYNC', 'siscodex/users'),
  RESET_SYNC: 'siscodex/users/RESET_SYNC',
};

const resourceName = 'users';
const { actions, actionTypes, reduceActions } = factory({ resourceName });

export { actionTypes };

/**
 * Actions
 */

export const fetchManyEndpoint = '/users';

export const fetchUser = actions.fetchResource;
export const fetchUserIfNeeded = actions.fetchOneIfNeeded;

export const syncUser = id =>
  createApiAction({
    type: additionalActionTypes.SYNC,
    endpoint: `/users/${id}/sync`,
    method: 'POST',
    meta: { id },
  });

export const syncUserReset = createAction(additionalActionTypes.RESET_SYNC, id => ({ id }));

/**
 * Reducer
 */
const reducer = handleActions(
  Object.assign({}, reduceActions, {
    [additionalActionTypes.SYNC_PENDING]: (state, { meta: { id } }) =>
      state
        .setIn(['resources', id, 'syncing'], true)
        .removeIn(['resources', id, 'updated'])
        .removeIn(['resources', id, 'syncCanceled'])
        .removeIn(['resources', id, 'syncFailed']),

    [additionalActionTypes.SYNC_FULFILLED]: (
      state,
      { payload: { user, updated = false, canceled = false }, meta: { id } }
    ) =>
      state
        .setIn(['resources', id], createRecord({ state: resourceStatus.FULFILLED, data: user }))
        .setIn(['resources', id, 'syncing'], false)
        .setIn(['resources', id, 'updated'], updated)
        .setIn(['resources', id, 'syncCanceled'], canceled),

    [additionalActionTypes.SYNC_REJECTED]: (state, { meta: { id } }) =>
      state.setIn(['resources', id, 'syncing'], false).setIn(['resources', id, 'syncFailed'], true),

    [authActionTypes.LOGIN_FULFILLED]: (state, { payload: { user } }) =>
      user && user.id
        ? state.setIn(['resources', user.id], createRecord({ state: resourceStatus.FULFILLED, data: user }))
        : state,

    [additionalActionTypes.RESET_SYNC]: (state, { payload: { id } }) =>
      state.setIn(['resources', id, 'updated'], false).setIn(['resources', id, 'syncFailed'], false),
  }),
  initialState
);

export default reducer;
