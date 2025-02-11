import { createSelector } from 'reselect';
import { loggedInUserIdSelector } from './auth.js';
import { getJsData } from '../helpers/resourceManager';

const getUsers = state => state.sisUsers;
const getResources = users => users.get('resources');

export const usersSelector = createSelector(getUsers, getResources);
export const getUserDataSelector = createSelector(usersSelector, users => id => getJsData(users.get(id)));
export const getUserStateSelector = createSelector(usersSelector, users => id => users.getIn([id, 'state']));

export const loggedInSisUserSelector = createSelector([usersSelector, loggedInUserIdSelector], (users, id) =>
  id && users ? users.get(id) : null
);
