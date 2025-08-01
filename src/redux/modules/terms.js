import { handleActions } from 'redux-actions';
import factory, { initialState } from '../helpers/resourceManager';

const resourceName = 'terms';
const { actions, actionTypes, reduceActions } = factory({ resourceName });

export { actionTypes };

/**
 * Actions
 */

export const fetchAllTerms = actions.fetchMany;
export const fetchTerm = actions.fetchResource;
export const fetchTermIfNeeded = actions.fetchOneIfNeeded;
export const createTerm = actions.addResource;
export const deleteTerm = actions.removeResource;
export const updateTerm = actions.updateResource;

/**
 * Reducer
 */
const reducer = handleActions(Object.assign({}, reduceActions, {}), initialState);

export default reducer;
