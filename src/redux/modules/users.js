import { handleActions } from 'redux-actions';
import { fromJS } from 'immutable';

import factory, {
  initialState,
  createRecord,
  resourceStatus,
  createActionsWithPostfixes,
} from '../helpers/resourceManager';

import { actionTypes as authActionTypes } from './authTypes.js';

export const additionalActionTypes = {
  // createActionsWithPostfixes generates all 4 constants for async operations
  ...createActionsWithPostfixes('FETCH_BY_IDS', 'siscodex/users'),
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

/**
 * Reducer
 */
const reducer = handleActions(
  Object.assign({}, reduceActions, {
    [actionTypes.UPDATE_FULFILLED]: (state, { payload, meta: { id } }) =>
      state.setIn(
        ['resources', id, 'data'],
        fromJS(payload.user && typeof payload.user === 'object' ? payload.user : payload)
      ),

    [additionalActionTypes.FETCH_BY_IDS_PENDING]: (state, { meta: { ids } }) =>
      state.update('resources', users => {
        ids.forEach(id => {
          if (!users.has(id)) {
            users = users.set(id, createRecord());
          }
        });
        return users;
      }),

    [additionalActionTypes.FETCH_BY_IDS_FULFILLED]: (state, { payload, meta: { ids } }) =>
      state.update('resources', users => {
        payload.forEach(user => {
          users = users.set(user.id, createRecord({ state: resourceStatus.FULFILLED, data: user }));
        });
        // in case some of the users were not returned in payload
        ids.forEach(id => {
          if (users.has(id) && users.getIn([id, 'data'], null) === null) {
            users = users.delete(id);
          }
        });
        return users;
      }),

    [additionalActionTypes.FETCH_BY_IDS_REJECTED]: (state, { meta: { ids } }) =>
      state.update('resources', users => {
        ids.forEach(id => {
          if (users.has(id) && users.getIn([id, 'data'], null) === null) {
            users = users.delete(id);
          }
        });
        return users;
      }),

    [authActionTypes.LOGIN_FULFILLED]: (state, { payload: { user } }) =>
      user && user.id
        ? state.setIn(['resources', user.id], createRecord({ state: resourceStatus.FULFILLED, data: user }))
        : state,
  }),
  initialState
);

export default reducer;
