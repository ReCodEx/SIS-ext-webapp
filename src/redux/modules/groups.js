import { handleActions } from 'redux-actions';

import { createRecord, resourceStatus, createActionsWithPostfixes } from '../helpers/resourceManager';
import { createApiAction } from '../middleware/apiMiddleware.js';
import { fromJS } from 'immutable';

export const additionalActionTypes = {
  ...createActionsWithPostfixes('FETCH', 'siscodex/groups'),
  ...createActionsWithPostfixes('BIND', 'siscodex/groups'),
  ...createActionsWithPostfixes('UNBIND', 'siscodex/groups'),
  ...createActionsWithPostfixes('CREATE', 'siscodex/groups'),
  ...createActionsWithPostfixes('CREATE_TERM', 'siscodex/groups'),
  ...createActionsWithPostfixes('JOIN', 'siscodex/groups'),
  ...createActionsWithPostfixes('ADD_ATTRIBUTE', 'siscodex/groups'),
  ...createActionsWithPostfixes('REMOVE_ATTRIBUTE', 'siscodex/groups'),
  ...createActionsWithPostfixes('SET_ARCHIVED', 'siscodex/groups'),
};

/**
 * Actions
 */

const _fetchGroups = (affiliation, eventIds = undefined, courseIds = undefined) =>
  createApiAction({
    type: additionalActionTypes.FETCH,
    endpoint: `/groups${affiliation ? '/' : ''}${affiliation || ''}`,
    method: 'GET',
    meta: { affiliation },
    query: { eventIds, courseIds },
  });

export const fetchAllGroups = () => _fetchGroups(undefined);
export const fetchStudentGroups = eventIds => _fetchGroups('student', eventIds);
export const fetchTeacherGroups = (eventIds, courseIds) => _fetchGroups('teacher', eventIds, courseIds);

export const bindGroup = (groupId, event) =>
  createApiAction({
    type: additionalActionTypes.BIND,
    endpoint: `/groups/${groupId}/bind/${event.id}`,
    method: 'POST',
    meta: { groupId, eventId: event.id, eventSisId: event.sisId },
  });

export const unbindGroup = (groupId, event) =>
  createApiAction({
    type: additionalActionTypes.UNBIND,
    endpoint: `/groups/${groupId}/bind/${event.id}`,
    method: 'DELETE',
    meta: { groupId, eventId: event.id, eventSisId: event.sisId },
  });

export const createGroup = (parentId, event) =>
  createApiAction({
    type: additionalActionTypes.CREATE,
    endpoint: `/groups/${parentId}/create/${event.id}`,
    method: 'POST',
    meta: { parentId, eventId: event.id, eventSisId: event.sisId },
  });

export const createTermGroup = (parentId, term, texts) =>
  createApiAction({
    type: additionalActionTypes.CREATE_TERM,
    endpoint: `/groups/${parentId}/create-term/${term}`,
    method: 'POST',
    meta: { parentId, term },
    body: { texts },
  });

export const joinGroup = groupId =>
  createApiAction({
    type: additionalActionTypes.JOIN,
    endpoint: `/groups/${groupId}/join`,
    method: 'POST',
    meta: { groupId },
  });

export const addGroupAttribute = (groupId, key, value) =>
  createApiAction({
    type: additionalActionTypes.ADD_ATTRIBUTE,
    endpoint: `/groups/${groupId}/add-attribute`,
    method: 'POST',
    meta: { groupId, key, value },
    body: { key, value },
  });

export const removeGroupAttribute = (groupId, key, value) =>
  createApiAction({
    type: additionalActionTypes.REMOVE_ATTRIBUTE,
    endpoint: `/groups/${groupId}/remove-attribute`,
    method: 'POST',
    meta: { groupId, key, value },
    body: { key, value },
  });

export const setGroupArchived = (groupId, value) =>
  createApiAction({
    type: additionalActionTypes.SET_ARCHIVED,
    endpoint: `/groups/${groupId}/archived`,
    method: 'POST',
    meta: { groupId, value },
    body: { value },
  });

/**
 * Reducer
 */
const fixAttributes = payload => {
  Object.values(payload).forEach(group => {
    group.attributes = !group.attributes || Array.isArray(group.attributes) ? {} : group.attributes;
  });
  return payload;
};

const reducer = handleActions(
  {
    [additionalActionTypes.FETCH_PENDING]: state => state.set('state', resourceStatus.RELOADING),

    [additionalActionTypes.FETCH_FULFILLED]: (state, { payload }) =>
      createRecord({ state: resourceStatus.FULFILLED, data: fixAttributes(payload) }),

    [additionalActionTypes.FETCH_REJECTED]: (state, { payload }) =>
      state.set('state', resourceStatus.FAILED).set('error', payload),

    // group management
    [additionalActionTypes.BIND_PENDING]: (state, { meta: { groupId, eventSisId } }) =>
      state
        .updateIn(['data', groupId, 'attributes', 'group'], groups =>
          groups ? groups.push(eventSisId) : fromJS([eventSisId])
        )
        .setIn(['data', groupId, 'pending'], 'binding'),

    [additionalActionTypes.BIND_FULFILLED]: (state, { meta: { groupId } }) =>
      state.removeIn(['data', groupId, 'pending']),

    [additionalActionTypes.BIND_REJECTED]: (state, { meta: { groupId, eventSisId }, payload }) =>
      state
        .updateIn(['data', groupId, 'attributes', 'group'], groups => groups?.filter(id => id !== eventSisId))
        .removeIn(['data', groupId, 'pending'])
        .set('error', payload),

    [additionalActionTypes.UNBIND_PENDING]: (state, { meta: { groupId } }) =>
      state.setIn(['data', groupId, 'pending'], 'unbinding'),

    [additionalActionTypes.UNBIND_FULFILLED]: (state, { meta: { groupId, eventSisId } }) =>
      state
        .updateIn(['data', groupId, 'attributes', 'group'], groups => groups?.filter(id => id !== eventSisId))
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

    // attributes
    [additionalActionTypes.ADD_ATTRIBUTE_PENDING]: (state, { meta: { groupId, key, value } }) =>
      state.setIn(['data', groupId, 'pending'], 'adding'),

    [additionalActionTypes.ADD_ATTRIBUTE_FULFILLED]: (state, { meta: { groupId, key, value } }) =>
      state
        .updateIn(['data', groupId, 'attributes', key], attributes =>
          attributes ? attributes.push(value) : fromJS([value])
        )
        .removeIn(['data', groupId, 'pending']),

    [additionalActionTypes.ADD_ATTRIBUTE_REJECTED]: (state, { meta: { groupId }, payload }) =>
      state.removeIn(['data', groupId, 'pending']).set('error', payload),

    [additionalActionTypes.REMOVE_ATTRIBUTE_PENDING]: (state, { meta: { groupId, key, value } }) =>
      state.setIn(['data', groupId, 'pending'], 'removing'),

    [additionalActionTypes.REMOVE_ATTRIBUTE_FULFILLED]: (state, { meta: { groupId, key, value } }) =>
      state
        .updateIn(['data', groupId, 'attributes', key], attributes => attributes?.filter(val => val !== value))
        .removeIn(['data', groupId, 'pending']),

    [additionalActionTypes.REMOVE_ATTRIBUTE_REJECTED]: (state, { meta: { groupId }, payload }) =>
      state.removeIn(['data', groupId, 'pending']).set('error', payload),
  },
  createRecord()
);

export default reducer;
