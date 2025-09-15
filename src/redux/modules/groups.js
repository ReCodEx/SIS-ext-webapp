import { handleActions } from 'redux-actions';

import { createRecord, resourceStatus, createActionsWithPostfixes } from '../helpers/resourceManager';
import { createApiAction } from '../middleware/apiMiddleware.js';

export const additionalActionTypes = {
  ...createActionsWithPostfixes('FETCH', 'siscodex/groups'),
  ...createActionsWithPostfixes('BIND', 'siscodex/groups'),
  ...createActionsWithPostfixes('UNBIND', 'siscodex/groups'),
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

export const bindGroup = (groupId, eventId) =>
  createApiAction({
    type: additionalActionTypes.BIND,
    endpoint: `/groups/${groupId}/bind/${eventId}`,
    method: 'POST',
    meta: { groupId, eventId },
  });

export const unbindGroup = (groupId, eventId) =>
  createApiAction({
    type: additionalActionTypes.UNBIND,
    endpoint: `/groups/${groupId}/bind/${eventId}`,
    method: 'DELETE',
    meta: { groupId, eventId },
  });

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

    // bindings
    [additionalActionTypes.BIND_PENDING]: (state, { meta: { groupId, eventId } }) =>
      state
        .updateIn(['data', groupId, 'attributes', 'group'], groups => groups.push(eventId))
        .setIn(['data', groupId, 'pending'], 'binding'),

    [additionalActionTypes.BIND_FULFILLED]: (state, { meta: { groupId } }) =>
      state.removeIn(['data', groupId, 'pending']),

    [additionalActionTypes.BIND_REJECTED]: (state, { meta: { groupId, eventId }, payload }) =>
      state
        .updateIn(['data', groupId, 'attributes', 'group'], groups => groups.filter(id => id !== eventId))
        .removeIn(['data', groupId, 'pending'])
        .set('error', payload),

    [additionalActionTypes.UNBIND_PENDING]: (state, { meta: { groupId } }) =>
      state.setIn(['data', groupId, 'pending'], 'unbinding'),

    [additionalActionTypes.UNBIND_FULFILLED]: (state, { meta: { groupId, eventId } }) =>
      state
        .updateIn(['data', groupId, 'attributes', 'group'], groups => groups.filter(id => id !== eventId))
        .removeIn(['data', groupId, 'pending']),

    [additionalActionTypes.UNBIND_REJECTED]: (state, { meta: { groupId }, payload }) =>
      state.removeIn(['data', groupId, 'pending']).set('error', payload),

    // user joining
    [additionalActionTypes.JOIN_PENDING]: (state, { meta: { groupId } }) =>
      state.setIn(['data', groupId, 'membership'], 'student').setIn(['data', groupId, 'pending'], 'joining'),

    [additionalActionTypes.JOIN_FULFILLED]: (state, { meta: { groupId } }) =>
      state.removeIn(['data', groupId, 'pending']),

    [additionalActionTypes.JOIN_REJECTED]: (state, { meta: { groupId }, payload }) =>
      state.setIn(['data', groupId, 'membership'], null).removeIn(['data', groupId, 'pending']).set('error', payload),
  },
  createRecord()
);

export default reducer;
