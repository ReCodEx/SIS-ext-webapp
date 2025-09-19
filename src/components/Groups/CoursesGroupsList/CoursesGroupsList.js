import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';
import { lruMemoize } from 'reselect';
import { Badge } from 'react-bootstrap';

import ResourceRenderer from '../../helpers/ResourceRenderer';
import DayOfWeek from '../../widgets/DayOfWeek';
import {
  AddIcon,
  AddUserIcon,
  AdminRoleIcon,
  BindIcon,
  GroupIcon,
  LabsIcon,
  LectureIcon,
  LinkIcon,
  LoadingIcon,
  ObserverIcon,
  SupervisorIcon,
  StudentsIcon,
  UnbindIcon,
  VisibleIcon,
} from '../../icons';

import './CoursesGroupsList.css';
import Button, { TheButtonGroup } from '../../widgets/TheButton';
import {
  recodexGroupAssignmentsLink,
  recodexGroupEditLink,
  recodexGroupStudentsLink,
} from '../../helpers/recodexLinks.js';
import { minutesToTimeStr } from '../../helpers/stringFormatters.js';

/**
 * Retrieve course name in the given locale (with fallbacks).
 * @param {Object} sisEvent (with course sub-object)
 * @param {String} locale
 * @returns {String}
 */
const getCourseName = ({ course }, locale) => {
  const key = `caption_${locale}`;
  return course?.[key] || course?.caption_en || course?.caption_cs || '???';
};

/**
 * Return augmented sisEvents (with localized fullName) sorted by their fullName.
 * @param {Array} sisEvents
 * @param {String} locale
 * @returns {Array}
 */
const getSortedSisEvents = lruMemoize((sisEvents, locale) =>
  sisEvents
    .map(event => ({ ...event, fullName: getCourseName(event, locale) }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, locale))
);

const augmentGroupObject = (groups, id, locale) => {
  const group = groups[id];
  if (group && !('fullName' in group)) {
    if (group.parentGroupId) {
      // handle ancestors recursively
      augmentGroupObject(groups, group.parentGroupId, locale);

      // use the parent to update our values
      group.fullName = groups[group.parentGroupId].fullName || '';
      if (group.fullName) {
        group.fullName += ' ❭ ';
      }
      group.fullName += group.name?.[locale] || group.name?.en || group.name?.cs || '???';
      group.isAdmin = groups[group.parentGroupId].isAdmin || group.membership === 'admin';
    } else {
      // root group has special treatment
      groups[id].fullName = '';
      groups[id].isAdmin = false;
    }
  }
};

/**
 * Preprocessing function that returns a sorted array of all groups
 * (augmented with localized fullName and isAdmin flag).
 * @param {Object} groups
 * @param {String} locale
 * @returns {Array}
 */
const getGroups = lruMemoize((groups, locale) => {
  // make a copy of groups so we can augment it
  const result = {};
  Object.keys(groups).forEach(id => {
    result[id] = { ...groups[id] };
  });

  Object.keys(result).forEach(id => {
    if (!result[id].fullName) {
      augmentGroupObject(result, id, locale);
    }
  });

  return Object.values(result).sort((a, b) => a.fullName.localeCompare(b.fullName, locale));
});

const getAttrValues = (group, key) => {
  const values = group?.attributes?.[key];
  return Array.isArray(values) ? values : []; // ensure we always return an array
};
/**
 * Construct a structure of sisId => [groups] where each group is augmented with localized fullName.
 * Each list of groups is sorted by their fullName.
 * @param {Object} groups
 * @param {String} locale
 * @returns {Object} key is sisId (of a scheduling event), value is array of (augmented) groups
 */
const getSisGroups = lruMemoize((groups, locale) => {
  const sisGroups = {};
  getGroups(groups, locale).forEach(group => {
    getAttrValues(group, 'group').forEach(sisId => {
      if (!sisGroups[sisId]) {
        sisGroups[sisId] = [];
      }
      sisGroups[sisId].push(group); // groups are already sorted, push preserves the order
    });
  });
  return sisGroups;
});

/**
 * Check if a group is suitable for a course in a specific term.
 * @param {Object} sisEvent
 * @param {Object} group
 * @param {Object} groups map of all groups (to access ancestors), keys are group ids
 * @returns {Boolean} true if the group is suitable for binding to the course
 */
const isSuitableForCourse = (sisEvent, group, groups) => {
  const courseCode = sisEvent?.course?.code;
  if (!courseCode || !sisEvent?.year || !sisEvent?.term) {
    return false;
  }
  const termKey = `${sisEvent.year}-${sisEvent.term}`;

  if (getAttrValues(group, 'group').includes(sisEvent.sisId)) {
    return false; // already bound to this event
  }
  let courseCovered = false;
  let termCovered = false;

  while (group && (!courseCovered || !termCovered)) {
    courseCovered = courseCovered || getAttrValues(group, 'course').includes(courseCode);
    termCovered = termCovered || getAttrValues(group, 'term').includes(termKey);
    group = groups[group.parentGroupId];
  }

  return courseCovered && termCovered;
};

const getParentCandidates = lruMemoize((sisEvent, groups, locale) =>
  getGroups(groups, locale).filter(group => isSuitableForCourse(sisEvent, group, groups))
);

/**
 * Get a sorted list of groups suitable for binding to the given course in the given term.
 * @param {Object} sisEvent
 * @param {Object} groups
 * @param {String} locale
 * @returns {Array} list of suitable group objects (augmented with localized fullName and isAdmin flag)
 */
const getBindingCandidates = lruMemoize((sisEvent, groups, locale) =>
  getGroups(groups, locale).filter(
    group =>
      !group.organizational &&
      (group.isAdmin || group.membership === 'supervisor') &&
      isSuitableForCourse(sisEvent, group, groups)
  )
);

/*
 * Component displaying list of sisEvents (with scheduling events) and their groups.
 */
const CoursesGroupsList = ({
  sisEvents,
  groups,
  allowHiding = false,
  joinGroup = null,
  bind = null,
  unbind = null,
  create = null,
  intl: { locale },
}) => {
  const [showAllState, setShowAll] = useState(false);
  const showAll = allowHiding ? showAllState : true;

  return (
    <ResourceRenderer resource={groups}>
      {groups => {
        const sisGroups = getSisGroups(groups || {}, locale);

        return (
          <ResourceRenderer resource={sisEvents}>
            {sisEvents => {
              if (!sisEvents || sisEvents.length === 0) {
                return (
                  <div className="m-3 text-center text-muted">
                    <FormattedMessage
                      id="app.coursesGroupsList.noCourses"
                      defaultMessage="There are currently no courses available for this term."
                    />
                  </div>
                );
              }

              const sortedSisEvents = getSortedSisEvents(sisEvents, locale);
              const filteredSisEvents = sortedSisEvents.filter(sisEvent => sisGroups[sisEvent.sisId]?.length > 0);

              return (
                <>
                  <table
                    className={`coursesGroupsList ${allowHiding && filteredSisEvents.length < sortedSisEvents.length ? 'mb-3' : ''}`}>
                    {(showAll ? sortedSisEvents : filteredSisEvents).map(sisEvent => (
                      <tbody key={sisEvent.id}>
                        <tr>
                          <td className="text-muted text-nowrap">
                            {sisEvent.type === 'lecture' && (
                              <LectureIcon
                                tooltip={
                                  <FormattedMessage id="app.coursesGroupsList.lecture" defaultMessage="Lecture" />
                                }
                                tooltipId={sisEvent.id}
                                tooltipPlacement="bottom"
                              />
                            )}
                            {sisEvent.type === 'labs' && (
                              <LabsIcon
                                tooltip={<FormattedMessage id="app.coursesGroupsList.labs" defaultMessage="Labs" />}
                                tooltipId={sisEvent.id}
                                tooltipPlacement="bottom"
                              />
                            )}
                          </td>

                          {sisEvent.dayOfWeek === null && sisEvent.time === null ? (
                            <td colSpan={3} className="text-nowrap text-muted small text-center fw-italic">
                              (
                              <FormattedMessage
                                id="app.coursesGroupsList.notScheduled"
                                defaultMessage="not scheduled"
                              />
                              )
                            </td>
                          ) : (
                            <>
                              <td className="text-nowrap fw-bold">
                                <DayOfWeek dow={sisEvent.dayOfWeek} />
                              </td>
                              <td className="text-nowrap fw-bold">{minutesToTimeStr(sisEvent.time)}</td>
                              <td className="text-nowrap text-muted">
                                {sisEvent.fortnight && (
                                  <>
                                    (
                                    {sisEvent.firstWeek % 2 === 1 ? (
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
                            </>
                          )}

                          <td className="text-nowrap fw-bold">{sisEvent.room}</td>
                          <td className="text-nowrap fw-bold">{sisEvent.fullName}</td>
                          <td className="w-100 text-nowrap">
                            <Badge bg="secondary"> {sisEvent.sisId}</Badge>
                          </td>
                          <td className="text-end text-nowrap">
                            <TheButtonGroup>
                              {create && (
                                <Button
                                  variant="success"
                                  size="xs"
                                  onClick={() => create(sisEvent, getParentCandidates(sisEvent, groups, locale))}>
                                  <AddIcon gapRight />
                                  <FormattedMessage
                                    id="app.coursesGroupsList.create"
                                    defaultMessage="Create New Group"
                                  />
                                </Button>
                              )}
                              {bind && (
                                <Button
                                  variant="success"
                                  size="xs"
                                  onClick={() => bind(sisEvent, getBindingCandidates(sisEvent, groups, locale))}>
                                  <BindIcon gapRight />
                                  <FormattedMessage
                                    id="app.coursesGroupsList.bind"
                                    defaultMessage="Bind Existing Group"
                                  />
                                </Button>
                              )}
                            </TheButtonGroup>
                          </td>
                        </tr>

                        {sisGroups[sisEvent.sisId]?.map(group => (
                          <tr key={group.id}>
                            <td colSpan={3} className="text-end text-muted">
                              {group.membership === 'admin' && (
                                <AdminRoleIcon
                                  gapRight
                                  className="text-primary"
                                  tooltipId={`admin-${group.id}`}
                                  tooltipPlacement="bottom"
                                  tooltip={
                                    <FormattedMessage
                                      id="app.coursesGroupsList.admin"
                                      defaultMessage="You are an administrator of this group"
                                    />
                                  }
                                />
                              )}
                              {group.membership === 'supervisor' && (
                                <SupervisorIcon
                                  gapRight
                                  className="text-primary"
                                  tooltipId={`supervisor-${group.id}`}
                                  tooltipPlacement="bottom"
                                  tooltip={
                                    <FormattedMessage
                                      id="app.coursesGroupsList.supervisor"
                                      defaultMessage="You are a supervisor of this group"
                                    />
                                  }
                                />
                              )}
                              {group.membership === 'observer' && (
                                <ObserverIcon
                                  gapRight
                                  className="opacity-50"
                                  tooltipId={`observer-${group.id}`}
                                  tooltipPlacement="bottom"
                                  tooltip={
                                    <FormattedMessage
                                      id="app.coursesGroupsList.observer"
                                      defaultMessage="You are an observer of this group"
                                    />
                                  }
                                />
                              )}
                              {group.membership === 'student' && (
                                <StudentsIcon
                                  gapRight
                                  className="text-success"
                                  tooltipId={`student-${group.id}`}
                                  tooltipPlacement="bottom"
                                  tooltip={
                                    <FormattedMessage
                                      id="app.coursesGroupsList.student"
                                      defaultMessage="You are a student of this group"
                                    />
                                  }
                                />
                              )}
                              {group.pending && <LoadingIcon gapRight />}

                              <GroupIcon
                                tooltip={
                                  <FormattedMessage id="app.coursesGroupsList.group" defaultMessage="ReCodEx group" />
                                }
                                tooltipId={group.id}
                                tooltipPlacement="bottom"
                              />
                            </td>
                            <td colSpan={4} className="w-100">
                              {group.fullName}
                            </td>
                            <td className="text-nowrap text-end">
                              {group.pending ? (
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
                                    <a href={recodexGroupAssignmentsLink(group.id)}>
                                      <Button variant="primary" size="xs">
                                        <LinkIcon gapRight />
                                        <FormattedMessage
                                          id="app.coursesGroupsList.recodexGroupAssignments"
                                          defaultMessage="Group Assignments"
                                        />
                                      </Button>
                                    </a>
                                  )}

                                  {recodexGroupStudentsLink(group.id) &&
                                    group.membership &&
                                    group.membership !== 'student' && (
                                      <a href={recodexGroupStudentsLink(group.id)}>
                                        <Button variant="primary" size="xs">
                                          <LinkIcon gapRight />
                                          <FormattedMessage
                                            id="app.coursesGroupsList.recodexGroupStudents"
                                            defaultMessage="Group Students"
                                          />
                                        </Button>
                                      </a>
                                    )}

                                  {(group.isAdmin || group.membership === 'supervisor') && (
                                    <>
                                      {recodexGroupEditLink(group.id) && (
                                        <a href={recodexGroupEditLink(group.id)}>
                                          <Button variant="warning" size="xs">
                                            <LinkIcon gapRight />
                                            <FormattedMessage
                                              id="app.coursesGroupsList.recodexGroupEdit"
                                              defaultMessage="Edit Group"
                                            />
                                          </Button>
                                        </a>
                                      )}
                                      {unbind && (
                                        <Button
                                          variant="danger"
                                          size="xs"
                                          onClick={() => unbind(group.id, sisEvent)}
                                          confirmId={`unbind-${group.id}-${sisEvent.id}`}
                                          confirm={
                                            <FormattedMessage
                                              id="app.coursesGroupsList.unbindConfirm"
                                              defaultMessage="Do you really want to unbind the course from this group? The group will remain unchanged, but the students will no longer be able to join it via SIS-CodEx extension."
                                            />
                                          }>
                                          <UnbindIcon gapRight />
                                          <FormattedMessage
                                            id="app.coursesGroupsList.unbind"
                                            defaultMessage="Unbind Group"
                                          />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </TheButtonGroup>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>

                  {allowHiding && filteredSisEvents.length < sortedSisEvents.length && (
                    <div className="text-center text-muted small m-2">
                      <FormattedMessage
                        id="app.coursesGroupsList.infoCoursesWithoutGroups"
                        defaultMessage="You are enrolled for {count} {count, plural, one {course} other {courses}} which do not have any groups yet."
                        values={{ count: sortedSisEvents.length - filteredSisEvents.length }}
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
  sisEvents: ImmutablePropTypes.list,
  groups: ImmutablePropTypes.map,
  allowHiding: PropTypes.bool,
  joinGroup: PropTypes.func,
  bind: PropTypes.func,
  unbind: PropTypes.func,
  create: PropTypes.func,
  intl: PropTypes.shape({ locale: PropTypes.string.isRequired }).isRequired,
};

export default injectIntl(CoursesGroupsList);
