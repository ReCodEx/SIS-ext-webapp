import { createSelector } from 'reselect';
import { isReady } from '../helpers/resourceManager';

const getCourses = state => state.courses;
const getStudent = courses => courses.get('student');
const getTeacher = courses => courses.get('teacher');
// const getParam = (state, param) => param;

const studentsSelector = createSelector(getCourses, getStudent);
const teachersSelector = createSelector(getCourses, getTeacher);

export const studentCoursesSelector = createSelector(
  studentsSelector,
  courses => (year, term) => courses.get(`${year}-${term}`)
);

export const getStudentCoursesRefetchedSelector = createSelector(
  studentsSelector,
  courses => (year, term) => courses.getIn([`${year}-${term}`, 'refetched'], false)
);

export const allStudentCoursesReadySelector = createSelector(studentsSelector, courses =>
  courses.every(record => isReady(record))
);

export const teacherCoursesSelector = createSelector(
  teachersSelector,
  courses => (year, term) => courses.get(`${year}-${term}`)
);

export const getTeacherCoursesRefetchedSelector = createSelector(
  teachersSelector,
  courses => (year, term) => courses.getIn([`${year}-${term}`, 'refetched'], false)
);

export const allTeacherCoursesReadySelector = createSelector(teachersSelector, courses =>
  courses.every(record => isReady(record))
);
