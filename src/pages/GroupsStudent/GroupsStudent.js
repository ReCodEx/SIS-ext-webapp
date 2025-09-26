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
import { DownloadIcon, JoinGroupIcon, LoadingIcon, RefreshIcon, TermIcon } from '../../components/icons';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';

import { fetchStudentCourses } from '../../redux/modules/courses.js';
import { fetchStudentGroups, joinGroup } from '../../redux/modules/groups.js';
import { fetchUser, fetchUserIfNeeded } from '../../redux/modules/users.js';
import { fetchAllTerms } from '../../redux/modules/terms.js';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import {
  studentSisEventsSelector,
  getStudentSisEventsRefetchedSelector,
  allStudentSisEventsReadySelector,
} from '../../redux/selectors/courses.js';
import { getGroups } from '../../redux/selectors/groups.js';
import { termsSelector } from '../../redux/selectors/terms.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

import { isStudentRole } from '../../components/helpers/usersRoles.js';
import Callout from '../../components/widgets/Callout/Callout.js';
import DateTime from '../../components/widgets/DateTime/DateTime.js';

import { isReady } from '../../redux/helpers/resourceManager';

const DEFAULT_EXPIRATION = 7; // days

const getSortedTerms = lruMemoize(terms => {
  const now = Math.floor(Date.now() / 1000);
  return terms
    .filter(term => term.studentsFrom <= now && term.studentsUntil >= now)
    .sort((b, a) => a.year * 10 + a.term - (b.year * 10 + b.term));
});

const getAllSisIds = results => {
  const sisIds = new Set();
  results.forEach(({ value }) => {
    value?.student?.forEach(sisEvent => {
      if (sisEvent?.sisId) {
        sisIds.add(sisEvent.sisId);
      }
    });
  });
  return Array.from(sisIds);
};

class GroupsStudent extends Component {
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
            .filter(term => term.studentsFrom <= now && term.studentsUntil >= now)
            .map(term =>
              dispatch(fetchStudentCourses(term.year, term.term, expiration)).catch(
                () => dispatch(fetchStudentCourses(term.year, term.term)) // fallback (no expiration = from cache only)
              )
            )
        ).then(values =>
          Promise.all([
            dispatch(fetchStudentGroups(getAllSisIds(values))),
            dispatch(fetchUser(userId, { allowReload: true })),
          ])
        );
      }),
    ]);

  render() {
    const { loggedInUser, terms, sisEventsSelector, refetchedSelector, allReady, groups, joinGroup, loadAsync } =
      this.props;
    const userReady = isReady(loggedInUser);

    return (
      <Page
        resource={loggedInUser}
        icon={<JoinGroupIcon />}
        title={<FormattedMessage id="app.groupsStudent.title" defaultMessage="Joining Groups as Student" />}>
        {user =>
          isStudentRole(user.role) ? (
            <ResourceRenderer resourceArray={terms}>
              {terms => (
                <>
                  <Callout type="info" className="mb-3">
                    <Button
                      variant="primary"
                      size="sm"
                      className="float-end"
                      disabled={!userReady || !allReady}
                      onClick={() => loadAsync(user.id, 0)}>
                      {userReady && allReady ? <RefreshIcon gapRight /> : <LoadingIcon gapRight />}
                      <FormattedMessage id="app.groups.refreshButton" defaultMessage="Reload from SIS" />
                    </Button>
                    <FormattedMessage
                      id="app.groupsStudent.lastRefreshInfo"
                      defaultMessage="The list of enrolled courses was last downloaded from SIS"
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
                            {refetchedSelector(term.year, term.term) && (
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
                        <CoursesGroupsList
                          sisEvents={sisEventsSelector(term.year, term.term)}
                          groups={groups}
                          allowHiding
                          joinGroup={joinGroup}
                        />
                      </Box>
                    ))
                  ) : (
                    <Callout type="info">
                      <FormattedMessage
                        id="app.groupsStudent.noActiveTerms"
                        defaultMessage="There are currently no terms available for students."
                      />
                    </Callout>
                  )}
                </>
              )}
            </ResourceRenderer>
          ) : (
            <Callout type="warning">
              <FormattedMessage
                id="app.groupsStudent.notStudent"
                defaultMessage="This page is available only to students."
              />
            </Callout>
          )
        }
      </Page>
    );
  }
}

GroupsStudent.propTypes = {
  loggedInUserId: PropTypes.string,
  loggedInUser: ImmutablePropTypes.map,
  terms: ImmutablePropTypes.list,
  sisEventsSelector: PropTypes.func,
  refetchedSelector: PropTypes.func,
  allReady: PropTypes.bool,
  groups: ImmutablePropTypes.map,
  loadAsync: PropTypes.func.isRequired,
  joinGroup: PropTypes.func.isRequired,
};

export default connect(
  state => ({
    loggedInUserId: loggedInUserIdSelector(state),
    loggedInUser: loggedInUserSelector(state),
    terms: termsSelector(state),
    sisEventsSelector: studentSisEventsSelector(state),
    refetchedSelector: getStudentSisEventsRefetchedSelector(state),
    allReady: allStudentSisEventsReadySelector(state),
    groups: getGroups(state),
  }),
  dispatch => ({
    loadAsync: (userId, expiration = DEFAULT_EXPIRATION) => GroupsStudent.loadAsync({ userId }, dispatch, expiration),
    joinGroup: (groupId, reloadGroupsOfCourses) =>
      dispatch(joinGroup(groupId)).then(() => dispatch(fetchStudentGroups(reloadGroupsOfCourses))),
  })
)(GroupsStudent);
