import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { lruMemoize } from 'reselect';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import CoursesGroupsList from '../../components/Groups/CoursesGroupsList';
import Button from '../../components/widgets/TheButton';
import { DownloadIcon, GroupFocusIcon, LoadingIcon, RefreshIcon, TermIcon } from '../../components/icons';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';

import { fetchTeacherCourses } from '../../redux/modules/courses.js';
import { fetchTeacherGroups } from '../../redux/modules/groups.js';
import { fetchUser, fetchUserIfNeeded } from '../../redux/modules/users.js';
import { fetchAllTerms } from '../../redux/modules/terms.js';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import {
  teacherSisEventsSelector,
  getTeacherSisEventsRefetchedSelector,
  allTeacherSisEventsReadySelector,
} from '../../redux/selectors/courses.js';
import { getGroups } from '../../redux/selectors/groups.js';
import { termsSelector } from '../../redux/selectors/terms.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

import { isSupervisorRole } from '../../components/helpers/usersRoles.js';
import Callout from '../../components/widgets/Callout/Callout.js';
import DateTime from '../../components/widgets/DateTime/DateTime.js';

import { isReady } from '../../redux/helpers/resourceManager';

const DEFAULT_EXPIRATION = 7; // days

const getSortedTerms = lruMemoize(terms => {
  const now = Math.floor(Date.now() / 1000);
  return terms
    .filter(term => term.teachersFrom <= now && term.teachersUntil >= now)
    .sort((b, a) => a.year * 10 + a.term - (b.year * 10 + b.term));
});

const getAllSisIds = results => {
  const eventIds = new Set();
  const courseIds = new Set();
  results.forEach(({ value }) => {
    [...(value?.teacher || []), ...(value?.guarantor || [])].forEach(sisEvent => {
      if (sisEvent?.sisId) {
        eventIds.add(sisEvent.sisId);
      }
      if (sisEvent?.course?.code) {
        courseIds.add(sisEvent.course.code);
      }
    });
  });
  return [Array.from(eventIds), Array.from(courseIds)];
};

class GroupsTeacher extends Component {
  componentDidMount() {
    this.props.loadAsync(this.props.loggedInUserId);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.loggedInUserId !== this.props.loggedInUserId) {
      this.props.loadAsync(this.props.loggedInUserId);
    }
  }

  static loadAsync = ({ userId }, dispatch, expiration = DEFAULT_EXPIRATION) =>
    Promise.all([
      dispatch(fetchUserIfNeeded(userId, { allowReload: true })),
      dispatch(fetchAllTerms()).then(({ value }) => {
        const now = Math.floor(Date.now() / 1000);
        return Promise.all(
          value
            .filter(term => term.teachersFrom <= now && term.teachersUntil >= now)
            .map(term =>
              dispatch(fetchTeacherCourses(term.year, term.term, expiration)).catch(
                () => dispatch(fetchTeacherCourses(term.year, term.term)) // fallback (no expiration = from cache only)
              )
            )
        ).then(values => {
          const [eventIds, courseIds] = getAllSisIds(values);
          return Promise.all([
            eventIds.length + courseIds.length > 0
              ? dispatch(fetchTeacherGroups(eventIds, courseIds))
              : Promise.resolve(),
            dispatch(fetchUser(userId, { allowReload: true })),
          ]);
        });
      }),
    ]);

  render() {
    const {
      loggedInUser,
      terms,
      coursesSelector,
      coursesRefetchedSelector,
      allTeacherCoursesReady,
      groups,
      loadAsync,
    } = this.props;
    const userReady = isReady(loggedInUser);

    return (
      <Page
        resource={loggedInUser}
        icon={<GroupFocusIcon />}
        title={<FormattedMessage id="app.groupsTeacher.title" defaultMessage="Create Groups for SIS Courses" />}>
        {user =>
          isSupervisorRole(user.role) ? (
            <ResourceRenderer resourceArray={terms}>
              {terms => (
                <>
                  <Callout type="info" className="mb-3">
                    <Button
                      variant="primary"
                      size="sm"
                      className="float-end"
                      disabled={!userReady || !allTeacherCoursesReady}
                      onClick={() => loadAsync(user.id, 0)}>
                      {userReady && allTeacherCoursesReady ? <RefreshIcon gapRight /> : <LoadingIcon gapRight />}
                      <FormattedMessage id="app.groups.refreshButton" defaultMessage="Reload from SIS" />
                    </Button>
                    <FormattedMessage
                      id="app.groupsTeacher.lastRefreshInfo"
                      defaultMessage="The list of courses taught by you was last downloaded from SIS"
                    />
                    &nbsp;&nbsp;
                    <i>
                      <DateTime unixts={user.sisEventsLoaded} showSeconds showRelative />
                    </i>
                    .
                  </Callout>

                  {getSortedTerms(terms).length > 0 ? (
                    getSortedTerms(terms).map((term, idx) => (
                      <Box
                        key={`${term.year}-${term.term}`}
                        title={
                          <>
                            <TermIcon gapRight={3} className="text-muted" />
                            <strong>
                              {term.year}-{term.term}
                            </strong>{' '}
                            <small className="text-muted ms-2">
                              (
                              {term.term === 1 && (
                                <FormattedMessage id="app.groups.term.winter" defaultMessage="Winter Term" />
                              )}
                              {term.term === 2 && (
                                <FormattedMessage id="app.groups.term.summer" defaultMessage="Summer Term" />
                              )}
                              )
                            </small>
                            {coursesRefetchedSelector(term.year, term.term) && (
                              <DownloadIcon
                                gapLeft={3}
                                className="text-success"
                                tooltip={
                                  <FormattedMessage
                                    id="app.groups.coursesRefetched"
                                    defaultMessage="The courses were just re-downloaded from SIS."
                                  />
                                }
                                tooltipId={`fresh-${term.year}-${term.term}`}
                                tooltipPlacement="bottom"
                              />
                            )}
                          </>
                        }
                        unlimitedHeight
                        collapsable
                        isOpen={idx === 0}>
                        <CoursesGroupsList sisEvents={coursesSelector(term.year, term.term)} groups={groups} />
                      </Box>
                    ))
                  ) : (
                    <Callout type="info">
                      <FormattedMessage
                        id="app.groupsTeacher.noActiveTerms"
                        defaultMessage="There are currently no terms available for teachers."
                      />
                    </Callout>
                  )}
                </>
              )}
            </ResourceRenderer>
          ) : (
            <Callout type="warning">
              <FormattedMessage
                id="app.groupsTeacher.notTeacher"
                defaultMessage="This page is available only to teachers."
              />
            </Callout>
          )
        }
      </Page>
    );
  }
}

GroupsTeacher.propTypes = {
  loggedInUserId: PropTypes.string,
  loggedInUser: ImmutablePropTypes.map,
  terms: ImmutablePropTypes.list,
  coursesSelector: PropTypes.func,
  coursesRefetchedSelector: PropTypes.func,
  allTeacherCoursesReady: PropTypes.bool,
  groups: ImmutablePropTypes.map,
  loadAsync: PropTypes.func.isRequired,
};

export default connect(
  state => ({
    loggedInUserId: loggedInUserIdSelector(state),
    loggedInUser: loggedInUserSelector(state),
    terms: termsSelector(state),
    coursesSelector: teacherSisEventsSelector(state),
    coursesRefetchedSelector: getTeacherSisEventsRefetchedSelector(state),
    allTeacherCoursesReady: allTeacherSisEventsReadySelector(state),
    groups: getGroups(state),
  }),
  dispatch => ({
    loadAsync: (userId, expiration = DEFAULT_EXPIRATION) => GroupsTeacher.loadAsync({ userId }, dispatch, expiration),
  })
)(GroupsTeacher);
