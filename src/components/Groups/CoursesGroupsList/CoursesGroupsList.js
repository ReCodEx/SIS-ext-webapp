import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';
import { lruMemoize } from 'reselect';
import { Badge, Button } from 'react-bootstrap';

import ResourceRenderer from '../../helpers/ResourceRenderer';
import DayOfWeek from '../../widgets/DayOfWeek';
import { AddUserIcon, GroupIcon, LabsIcon, LectureIcon, LinkIcon, LoadingIcon, VisibleIcon } from '../../icons';

import './CoursesGroupsList.css';
import { TheButtonGroup } from '../../widgets/TheButton';
import { Link } from 'react-router';
import {
  recodexGroupAssignmentsLink,
  recodexGroupEditLink,
  recodexGroupStudentsLink,
} from '../../helpers/recodexLinks.js';

/**
 * Convert time in minutes (from midnight) to string H:MM
 * @param {Number} minutes
 * @returns {String}
 */
const getTimeStr = minutes =>
  minutes ? `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, '0')}` : '';

/**
 * Retrieve course name in the given locale (with fallbacks).
 * @param {Object} course
 * @param {String} locale
 * @returns {String}
 */
const getCourseName = ({ course }, locale) => {
  const key = `caption_${locale}`;
  return course?.[key] || course?.caption_en || course?.caption_cs || '???';
};

/**
 * Retrieve full (hierarchical) group name in the given locale (with fallbacks).
 * @param {String} groupId
 * @param {Object} groups
 * @param {String} locale
 * @returns {String}
 */
const getGroupName = (groupId, groups, locale) => {
  let group = groups[groupId];
  const names = [];
  while (group && group.parentGroupId) {
    const name = group.name?.[locale] || group.name?.en || group.name?.cs || '???';
    names.unshift(name);
    group = groups[group.parentGroupId];
  }
  return names.join(' > ');
};

/**
 * Return augmented courses (with localized fullName) sorted by their fullName.
 * @param {Array} courses
 * @param {String} locale
 * @returns {Array}
 */
const getSortedCourses = lruMemoize((courses, locale) =>
  courses
    .map(course => ({ ...course, fullName: getCourseName(course, locale) }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, locale))
);

/**
 * Construct a structure of sisId => [groups] where each group is augmented with localized fullName.
 * Each list of groups is sorted by their fullName.
 * @param {Object} groups
 * @param {String} locale
 * @returns {Object} key is sisId (of a scheduling event), value is array of (augmented) groups
 */
const getSisGroups = lruMemoize((groups, locale) => {
  const sisGroups = {};
  Object.values(groups).forEach(group => {
    const sisIds = group?.attributes?.group || [];
    if (Array.isArray(sisIds) && sisIds.length > 0) {
      // we make a copy of the group so we can augment it with localized fullName
      const groupCopy = { ...group, fullName: getGroupName(group.id, groups, locale) };
      sisIds.forEach(sisId => {
        if (!sisGroups[sisId]) {
          sisGroups[sisId] = [];
        }
        sisGroups[sisId].push(groupCopy);
      });
    }
  });

  // sort groups for each sisId by their fullName
  Object.values(sisGroups).forEach(groupsForSisId => {
    groupsForSisId.sort((a, b) => a.fullName.localeCompare(b.fullName, locale));
  });

  return sisGroups;
});

/*
 * Component displaying list of courses (with scheduling events) and their groups.
 */
const CoursesGroupsList = ({ courses, groups, allowHiding = false, joinGroup = null, intl: { locale } }) => {
  const [showAllState, setShowAll] = useState(false);
  const showAll = allowHiding ? showAllState : true;

  return (
    <ResourceRenderer resource={groups}>
      {groups => {
        const sisGroups = getSisGroups(groups || {}, locale);

        return (
          <ResourceRenderer resource={courses}>
            {courses => {
              if (!courses || courses.length === 0) {
                return (
                  <div className="m-3 text-center text-muted">
                    <FormattedMessage
                      id="app.coursesGroupsList.noCourses"
                      defaultMessage="There are currently no courses available for this term."
                    />
                  </div>
                );
              }

              const sortedCourses = getSortedCourses(courses, locale);
              const filteredCourses = sortedCourses.filter(course => sisGroups[course.sisId]?.length > 0);

              return (
                <>
                  <table
                    className={`coursesGroupsList ${allowHiding && filteredCourses.length < sortedCourses.length ? 'mb-3' : ''}`}>
                    {(showAll ? sortedCourses : filteredCourses).map(course => (
                      <tbody key={course.id}>
                        <tr>
                          <td className="text-muted text-nowrap">
                            {course.type === 'lecture' && (
                              <LectureIcon
                                tooltip={
                                  <FormattedMessage id="app.coursesGroupsList.lecture" defaultMessage="Lecture" />
                                }
                                tooltipId={course.id}
                                tooltipPlacement="bottom"
                              />
                            )}
                            {course.type === 'labs' && (
                              <LabsIcon
                                tooltip={<FormattedMessage id="app.coursesGroupsList.labs" defaultMessage="Labs" />}
                                tooltipId={course.id}
                                tooltipPlacement="bottom"
                              />
                            )}
                          </td>
                          <td className="text-nowrap fw-bold">
                            <DayOfWeek dow={course.dayOfWeek} />
                          </td>
                          <td className="text-nowrap fw-bold">{getTimeStr(course.time)}</td>
                          <td className="text-nowrap text-muted">
                            {course.fortnight && (
                              <>
                                (
                                {course.firstWeek % 2 === 1 ? (
                                  <FormattedMessage
                                    id="app.coursesGroupsList.firstWeekOdd"
                                    defaultMessage="odd weeks"
                                  />
                                ) : (
                                  <FormattedMessage
                                    id="app.coursesGroupsList.firstWeekEven"
                                    defaultMessage="even weeks"
                                  />
                                )}
                                )
                              </>
                            )}
                          </td>
                          <td className="text-nowrap fw-bold">{course.room}</td>
                          <td className="text-nowrap fw-bold">{course.fullName}</td>
                          <td className="w-100 text-nowrap">
                            <Badge bg="secondary"> {course.sisId}</Badge>
                          </td>
                          <td />
                        </tr>

                        {sisGroups[course.sisId]?.map(group => (
                          <tr key={group.id}>
                            <td colSpan={2} className="text-end text-muted">
                              <GroupIcon
                                tooltip={
                                  <FormattedMessage id="app.coursesGroupsList.group" defaultMessage="ReCodEx group" />
                                }
                                tooltipId={group.id}
                                tooltipPlacement="bottom"
                              />
                            </td>
                            <td colSpan={5} className="w-100">
                              {group.fullName}
                            </td>
                            <td className="text-nowrap text-end">
                              {group.membership === 'joining' ? (
                                <LoadingIcon />
                              ) : (
                                <TheButtonGroup>
                                  {joinGroup && group.membership === null && (
                                    <Button
                                      variant="warning"
                                      size="xs"
                                      onClick={() => joinGroup(group.id, Object.keys(sisGroups))}>
                                      <AddUserIcon gapRight />
                                      <FormattedMessage id="app.coursesGroupsList.join" defaultMessage="Join" />
                                    </Button>
                                  )}

                                  {recodexGroupAssignmentsLink(group.id) && group.membership === 'student' && (
                                    <Link to={recodexGroupAssignmentsLink(group.id)}>
                                      <Button variant="primary" size="xs">
                                        <LinkIcon gapRight />
                                        <FormattedMessage
                                          id="app.coursesGroupsList.recodexGroupAssignments"
                                          defaultMessage="Group Assignments"
                                        />
                                      </Button>
                                    </Link>
                                  )}

                                  {recodexGroupStudentsLink(group.id) &&
                                    group.membership &&
                                    group.membership !== 'student' && (
                                      <Link to={recodexGroupStudentsLink(group.id)}>
                                        <Button variant="primary" size="xs">
                                          <LinkIcon gapRight />
                                          <FormattedMessage
                                            id="app.coursesGroupsList.recodexGroupStudents"
                                            defaultMessage="Group Students"
                                          />
                                        </Button>
                                      </Link>
                                    )}

                                  {recodexGroupEditLink(group.id) && group.membership === 'admin' && (
                                    <Link to={recodexGroupEditLink(group.id)}>
                                      <Button variant="warning" size="xs">
                                        <LinkIcon gapRight />
                                        <FormattedMessage
                                          id="app.coursesGroupsList.recodexGroupEdit"
                                          defaultMessage="Edit Group"
                                        />
                                      </Button>
                                    </Link>
                                  )}
                                </TheButtonGroup>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>

                  {allowHiding && filteredCourses.length < sortedCourses.length && (
                    <div className="text-center text-muted small m-2">
                      <FormattedMessage
                        id="app.coursesGroupsList.infoCoursesWithoutGroups"
                        defaultMessage="You are enrolled for {count} {count, plural, one {course} other {courses}} which do not have any groups yet."
                        values={{ count: sortedCourses.length - filteredCourses.length }}
                      />

                      <Button variant="primary" size="xs" className="ms-3" onClick={() => setShowAll(!showAll)}>
                        <VisibleIcon visible={!showAll} gapRight />
                        {showAll ? (
                          <FormattedMessage
                            id="app.coursesGroupsList.hideCourses"
                            defaultMessage="Hide Courses Without Groups"
                          />
                        ) : (
                          <FormattedMessage
                            id="app.coursesGroupsList.showAllCourses"
                            defaultMessage="Show All Courses"
                          />
                        )}
                      </Button>
                    </div>
                  )}
                </>
              );
            }}
          </ResourceRenderer>
        );
      }}
    </ResourceRenderer>
  );
};

CoursesGroupsList.propTypes = {
  courses: ImmutablePropTypes.list,
  groups: ImmutablePropTypes.map,
  allowHiding: PropTypes.bool,
  joinGroup: PropTypes.func,
  intl: PropTypes.shape({ locale: PropTypes.string.isRequired }).isRequired,
};

export default injectIntl(CoursesGroupsList);
