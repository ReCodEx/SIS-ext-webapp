import { createSelector } from 'reselect';

// import { isReady, getJsData } from '../helpers/resourceManager';
// import { isStudentRole, isSupervisorRole } from '../../components/helpers/usersRoles.js';

// const getParam = (state, id) => id;

const getTerms = state => state.terms;
const getResources = terms => terms.get('resources');

/**
 * Select terms part of the state
 */
export const termsSelector = createSelector(getTerms, getResources);
