import { handleActions } from 'redux-actions';
// import { fromJS } from 'immutable';

import factory, {
  initialState,
  getJsData,
  isLoading,
  defaultNeedsRefetching,
  createRecord,
  resourceStatus,
} from '../helpers/resourceManager';
import { defaultSelectorFactory } from '../helpers/resourceManager/utils.js';
import { createApiAction } from '../middleware/apiMiddleware.js';

import { additionalActionTypes as userActionTypes } from './users.js';

export const additionalActionTypes = {};

const resourceName = 'sisUsers';
const apiEndpointFactory = id => `/users/${id}/sisuser`;
const { actionTypes, reduceActions } = factory({ resourceName, apiEndpointFactory });

export { actionTypes };

/**
 * Actions
 */

export const fetchSisUser = (id, expiration = null) =>
  createApiAction({
    type: actionTypes.FETCH,
    endpoint: `/users/${id}/sisuser`,
    method: 'POST',
    meta: { id },
    body: { expiration },
  });

const getItem = (id, getState) => {
  const state = defaultSelectorFactory(resourceName)(getState());
  return !state ? null : state.getIn(['resources', id]);
};

const archivedPromises = {};
export const fetchSisUserIfNeeded =
  (id, expiration = null) =>
  (dispatch, getState) => {
    if (defaultNeedsRefetching(getItem(id, getState))) {
      archivedPromises[id] = dispatch(fetchSisUser(id, expiration));
    }

    const item = getItem(id, getState);
    return isLoading(item)
      ? archivedPromises[id]
      : Promise.resolve({
          value: getJsData(item),
        });
  };

const reducer = handleActions(
  Object.assign({}, reduceActions, {
    [userActionTypes.SYNC_FULFILLED]: (state, { payload: { sisUser }, meta: { id } }) =>
      state.setIn(
        ['resources', id],
        createRecord({ state: resourceStatus.FULFILLED, data: { sisUser, updated: false, failed: false } })
      ),
  }),
  initialState
);

export default reducer;
