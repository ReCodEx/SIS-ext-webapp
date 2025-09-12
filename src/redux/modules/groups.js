import { handleActions } from 'redux-actions';

import { createRecord, resourceStatus, createActionsWithPostfixes } from '../helpers/resourceManager';
import { createApiAction } from '../middleware/apiMiddleware.js';

export const additionalActionTypes = {
  ...createActionsWithPostfixes('FETCH', 'siscodex/groups'),
  ...createActionsWithPostfixes('JOIN', 'siscodex/groups'),
};

/**
 * Actions
 */

const _fetchGroups = (affiliation, eventIds = undefined, courseIds = undefined) =>
  createApiAction({
    type: additionalActionTypes.FETCH,
    endpoint: `/groups/${affiliation}`,
    method: 'GET',
    meta: { affiliation },
    query: { eventIds, courseIds },
  });

export const fetchStudentGroups = eventIds => _fetchGroups('student', eventIds);

export const fetchTeacherGroups = (eventIds, courseIds) => _fetchGroups('teacher', eventIds, courseIds);

export const joinGroup = groupId =>
  createApiAction({
    type: additionalActionTypes.JOIN,
    endpoint: `/groups/${groupId}/join`,
    method: 'POST',
    meta: { groupId },
  });

/**
 * Reducer
 */
const reducer = handleActions(
  {
    [additionalActionTypes.FETCH_PENDING]: state => state.set('state', resourceStatus.RELOADING),

    [additionalActionTypes.FETCH_FULFILLED]: (state, { payload }) =>
      createRecord({ state: resourceStatus.FULFILLED, data: payload }),

    [additionalActionTypes.FETCH_REJECTED]: (state, { payload }) =>
      state.set('state', resourceStatus.FAILED).set('error', payload),

    [additionalActionTypes.JOIN_PENDING]: (state, { meta: { groupId } }) =>
      state.setIn(['data', groupId, 'membership'], 'joining'),

    [additionalActionTypes.JOIN_FULFILLED]: (state, { meta: { groupId } }) =>
      state.setIn(['data', groupId, 'membership'], 'student'),

    [additionalActionTypes.JOIN_REJECTED]: (state, { meta: { groupId }, payload }) =>
      state.setIn(['data', groupId, 'membership'], null).set('error', payload),
  },
  createRecord()
);

export default reducer;
