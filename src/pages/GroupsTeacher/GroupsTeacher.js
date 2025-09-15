import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Modal } from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
import { lruMemoize } from 'reselect';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
import CoursesGroupsList from '../../components/Groups/CoursesGroupsList';
import Button, { TheButtonGroup } from '../../components/widgets/TheButton';
import {
  CloseIcon,
  DownloadIcon,
  GroupFocusIcon,
  LoadingIcon,
  RefreshIcon,
  SuccessIcon,
  TermIcon,
} from '../../components/icons';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';

import { fetchTeacherCourses } from '../../redux/modules/courses.js';
import { fetchTeacherGroups, bindGroup, unbindGroup } from '../../redux/modules/groups.js';
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

const getGroupAdmins = group => {
  const res = Object.values(group.admins)
    .map(admin => admin.lastName)
    .join(', ');
  return res ? ` [${res}]` : '';
};

class GroupsTeacher extends Component {
  state = { bindEvent: null, createEvent: null, selectGroups: null, selectedGroupId: '' };

  startBind = (bindEvent, selectGroups) => this.setState({ bindEvent, selectGroups });
  startCreate = (createEvent, selectGroups) => this.setState({ createEvent, selectGroups });
  closeModal = () => this.setState({ bindEvent: null, createEvent: null, selectGroups: null, selectedGroupId: '' });
  handleGroupChange = ev => this.setState({ selectedGroupId: ev.target.value });

  completeModalOperation = () => {
    const { loggedInUserId, bind, loadAsync } = this.props;

    if (this.state.bindEvent !== null) {
      bind(this.state.selectedGroupId, this.state.bindEvent.id)
        .then(() => loadAsync(loggedInUserId))
        .then(this.closeModal);
    } else {
      this.closeModal();
    }
  };

  unbindAndReload = (groupId, eventId) => {
    const { loggedInUserId, unbind, loadAsync } = this.props;
    unbind(groupId, eventId).then(() => loadAsync(loggedInUserId));
  };

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
    const { loggedInUser, terms, sisEventsSelector, refetchedSelector, allReady, groups, loadAsync } = this.props;
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
                      disabled={!userReady || !allReady}
                      onClick={() => loadAsync(user.id, 0)}>
                      {userReady && allReady ? <RefreshIcon gapRight /> : <LoadingIcon gapRight />}
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
                          bind={this.startBind}
                          unbind={this.unbindAndReload}
                          create={this.startCreate}
                        />
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

                  <Modal
                    show={this.state.bindEvent !== null || this.state.createEvent !== null}
                    backdrop="static"
                    size="xl"
                    onHide={this.closeModal}>
                    <Modal.Header closeButton>
                      <Modal.Title>
                        {this.state.bindEvent !== null && (
                          <FormattedMessage
                            id="app.groupsTeacher.selectGroupForBinding"
                            defaultMessage="Select Group for Binding with {bindEvent}"
                            values={{ bindEvent: this.state.bindEvent.sisId }}
                          />
                        )}
                        {this.state.createEvent !== null && (
                          <FormattedMessage
                            id="app.groupsTeacher.selectParentGroupForCreating"
                            defaultMessage="Select Parent Group for New Group of {createEvent}"
                            values={{ createEvent: this.state.createEvent.sisId }}
                          />
                        )}
                      </Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                      <select value={this.state.selectedGroupId} onChange={this.handleGroupChange}>
                        <option value="">...</option>
                        {this.state.selectGroups?.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.fullName}&nbsp;&nbsp;
                            {getGroupAdmins(group)}
                          </option>
                        ))}
                      </select>
                    </Modal.Body>

                    <Modal.Footer>
                      <div className="text-center w-100">
                        <TheButtonGroup>
                          <Button
                            variant="success"
                            disabled={!this.state.selectedGroupId}
                            onClick={this.completeModalOperation}>
                            <SuccessIcon gapRight />
                            {this.state.bindEvent !== null ? (
                              <FormattedMessage
                                id="app.groupsTeacher.confirmButtonBind"
                                defaultMessage="Bind with Group"
                              />
                            ) : (
                              <FormattedMessage
                                id="app.groupsTeacher.confirmButtonCreate"
                                defaultMessage="Create Group"
                              />
                            )}
                          </Button>
                          <Button variant="secondary" onClick={this.closeModal}>
                            <CloseIcon gapRight />
                            <FormattedMessage id="generic.cancel" defaultMessage="Cancel" />
                          </Button>
                        </TheButtonGroup>
                      </div>
                    </Modal.Footer>
                  </Modal>
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
  sisEventsSelector: PropTypes.func,
  refetchedSelector: PropTypes.func,
  allReady: PropTypes.bool,
  groups: ImmutablePropTypes.map,
  loadAsync: PropTypes.func.isRequired,
  bind: PropTypes.func.isRequired,
  unbind: PropTypes.func.isRequired,
};

export default connect(
  state => ({
    loggedInUserId: loggedInUserIdSelector(state),
    loggedInUser: loggedInUserSelector(state),
    terms: termsSelector(state),
    sisEventsSelector: teacherSisEventsSelector(state),
    refetchedSelector: getTeacherSisEventsRefetchedSelector(state),
    allReady: allTeacherSisEventsReadySelector(state),
    groups: getGroups(state),
  }),
  dispatch => ({
    loadAsync: (userId, expiration = DEFAULT_EXPIRATION) => GroupsTeacher.loadAsync({ userId }, dispatch, expiration),
    bind: (groupId, eventId) => dispatch(bindGroup(groupId, eventId)),
    unbind: (groupId, eventId) => dispatch(unbindGroup(groupId, eventId)),
  })
)(GroupsTeacher);
