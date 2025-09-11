import { createSelector } from 'reselect';

const getTerms = state => state.terms;
const getResources = terms => terms.get('resources');

/**
 * Select terms part of the state
 */
export const termsSelector = createSelector(getTerms, getResources);
