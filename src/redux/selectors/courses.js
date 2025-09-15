import { createSelector } from 'reselect';
import { isReady } from '../helpers/resourceManager';

const getCourses = state => state.courses;
const getStudent = courses => courses.get('student');
const getTeacher = courses => courses.get('teacher');
// const getParam = (state, param) => param;

const studentsSelector = createSelector(getCourses, getStudent);
const teachersSelector = createSelector(getCourses, getTeacher);

export const studentSisEventsSelector = createSelector(
  studentsSelector,
  events => (year, term) => events.get(`${year}-${term}`)
);

export const getStudentSisEventsRefetchedSelector = createSelector(
  studentsSelector,
  courses => (year, term) => courses.getIn([`${year}-${term}`, 'refetched'], false)
);

export const allStudentSisEventsReadySelector = createSelector(studentsSelector, courses =>
  courses.every(record => isReady(record))
);

export const teacherSisEventsSelector = createSelector(
  teachersSelector,
  courses => (year, term) => courses.get(`${year}-${term}`)
);

export const getTeacherSisEventsRefetchedSelector = createSelector(
  teachersSelector,
  courses => (year, term) => courses.getIn([`${year}-${term}`, 'refetched'], false)
);

export const allTeacherSisEventsReadySelector = createSelector(teachersSelector, courses =>
  courses.every(record => isReady(record))
);
