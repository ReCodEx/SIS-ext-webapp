import { createSelector } from 'reselect';

import { isReady, getJsData } from '../helpers/resourceManager';
import { isStudentRole, isSupervisorRole } from '../../components/helpers/usersRoles.js';

import { loggedInUserIdSelector } from './auth.js';

const getParam = (state, id) => id;

const getUsers = state => state.users;
const getResources = users => users.get('resources');

/**
 * Select users part of the state
 */
export const usersSelector = createSelector(getUsers, getResources);

export const fetchUserStatus = createSelector([usersSelector, getParam], (users, id) => users.getIn([id, 'state']));

export const getUser = userId => createSelector(usersSelector, users => users.get(userId));
export const getUserSelector = createSelector(usersSelector, users => userId => users.get(userId));
export const getReadyUserSelector = createSelector(usersSelector, users => userId => {
  const user = users.get(userId);
  return user && isReady(user) ? getJsData(user) : null;
});

export const getRole = userId =>
  createSelector(getUser(userId), user => (user ? user.getIn(['data', 'privateData', 'role']) : null));

export const isStudent = userId => createSelector(getRole(userId), role => isStudentRole(role));

export const isSupervisor = userId => createSelector(getRole(userId), role => isSupervisorRole(role));

export const loggedInUserSelector = createSelector([usersSelector, loggedInUserIdSelector], (users, id) =>
  id && users ? users.get(id) : null
);

export const isUserSyncing = createSelector([usersSelector, getParam], (users, id) =>
  users.getIn([id, 'syncing'], false)
);
export const isUserUpdated = createSelector([usersSelector, getParam], (users, id) =>
  users.getIn([id, 'updated'], false)
);
export const isUserSyncCanceled = createSelector([usersSelector, getParam], (users, id) =>
  users.getIn([id, 'syncCanceled'], false)
);
export const isUserSyncFailed = createSelector([usersSelector, getParam], (users, id) =>
  users.getIn([id, 'syncFailed'], false)
);
