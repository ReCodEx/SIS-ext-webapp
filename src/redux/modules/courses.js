import { handleActions } from 'redux-actions';
import { fromJS } from 'immutable';

import { createRecord, resourceStatus, createActionsWithPostfixes } from '../helpers/resourceManager';
import { createApiAction } from '../middleware/apiMiddleware.js';

export const additionalActionTypes = {
  ...createActionsWithPostfixes('FETCH', 'siscodex/courses'),
};

/**
 * Actions
 */

const _fetchCourses = (year, term, affiliation, expiration = undefined) =>
  createApiAction({
    type: additionalActionTypes.FETCH,
    endpoint: '/courses',
    method: 'POST',
    meta: { year, term, affiliation },
    body: { year, term, affiliation, expiration },
  });

export const fetchStudentCourses = (year, term, expiration = undefined) =>
  _fetchCourses(year, term, 'student', expiration);

export const fetchTeacherCourses = (year, term, expiration = undefined) =>
  _fetchCourses(year, term, 'teacher', expiration);

/**
 * Reducer
 */
const reducer = handleActions(
  {
    [additionalActionTypes.FETCH_PENDING]: (state, { meta: { year, term, affiliation } }) =>
      state.hasIn([affiliation, `${year}-${term}`])
        ? state.setIn([affiliation, `${year}-${term}`], createRecord())
        : state
            .setIn([affiliation, `${year}-${term}`, 'state'], resourceStatus.RELOADING)
            .setIn([affiliation, `${year}-${term}`, 'refetched'], null),

    [additionalActionTypes.FETCH_FULFILLED]: (state, { meta: { year, term, affiliation }, payload }) =>
      state
        .setIn(
          [affiliation, `${year}-${term}`],
          createRecord({ state: resourceStatus.FULFILLED, data: payload[affiliation] })
        )
        .setIn([affiliation, `${year}-${term}`, 'refetched'], payload.refetched || false),

    [additionalActionTypes.FETCH_REJECTED]: (state, { meta: { year, term, affiliation }, payload }) =>
      state
        .setIn([affiliation, `${year}-${term}`, 'state'], resourceStatus.FAILED)
        .setIn([affiliation, `${year}-${term}`, 'error'], payload),
  },
  fromJS({
    student: {},
    teacher: {},
  })
);

export default reducer;
