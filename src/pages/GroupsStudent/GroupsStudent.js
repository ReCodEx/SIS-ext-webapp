import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl } from 'react-intl';
import { lruMemoize } from 'reselect';

import Page from '../../components/layout/Page';
import Box from '../../components/widgets/Box';
// import Button, { TheButtonGroup } from '../../components/widgets/TheButton';
import { JoinGroupIcon, LabsIcon, LectureIcon, TermIcon } from '../../components/icons';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';

import { fetchStudentCourses } from '../../redux/modules/courses.js';
import { fetchUserIfNeeded } from '../../redux/modules/users.js';
import { fetchAllTerms } from '../../redux/modules/terms.js';
import { loggedInUserIdSelector } from '../../redux/selectors/auth.js';
import { studentCoursesSelector } from '../../redux/selectors/courses.js';
import { termsSelector } from '../../redux/selectors/terms.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';

import { isStudentRole } from '../../components/helpers/usersRoles.js';
import Callout from '../../components/widgets/Callout/Callout.js';

const DEFAULT_EXPIRATION = 7; // days

const getSortedTerms = lruMemoize(terms => {
  const now = Math.floor(Date.now() / 1000);
  return terms
    .filter(term => term.studentsFrom <= now && term.studentsUntil >= now)
    .sort((b, a) => a.year * 10 + a.term - (b.year * 10 + b.term));
});

const getCourseName = ({ course }, locale) => {
  const key = `caption_${locale}`;
  return course?.[key] || course?.caption_en || course?.caption_cs || '???';
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

  static loadAsync = ({ userId }, dispatch) =>
    Promise.all([
      dispatch(fetchUserIfNeeded(userId)),
      dispatch(fetchAllTerms()).then(({ value }) => {
        const now = Math.floor(Date.now() / 1000);
        return Promise.all(
          value
            .filter(term => term.studentsFrom <= now && term.studentsUntil >= now)
            .map(term =>
              dispatch(fetchStudentCourses(term.year, term.term, DEFAULT_EXPIRATION)).catch(
                () => dispatch(fetchStudentCourses(term.year, term.term)) // fallback (no expiration = from cache only)
              )
            )
        );
      }),
    ]);

  render() {
    const {
      loggedInUser,
      terms,
      coursesSelector,
      intl: { locale },
    } = this.props;

    return (
      <Page
        resource={loggedInUser}
        icon={<JoinGroupIcon />}
        title={<FormattedMessage id="app.groupsStudent.title" defaultMessage="Joining Groups as Student" />}>
        {user =>
          isStudentRole(user.role) ? (
            <ResourceRenderer resourceArray={terms}>
              {terms =>
                getSortedTerms(terms).length > 0 ? (
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
                              <FormattedMessage id="app.groupsStudent.term.winter" defaultMessage="Winter Term" />
                            )}
                            {term.term === 2 && (
                              <FormattedMessage id="app.groupsStudent.term.summer" defaultMessage="Summer Term" />
                            )}
                            )
                          </small>
                        </>
                      }
                      collapsable
                      isOpen={idx === 0}>
                      <ResourceRenderer resource={coursesSelector(term.year, term.term)}>
                        {courses =>
                          courses && courses.length > 0 ? (
                            <table>
                              {courses.map(course => (
                                <tbody key={course.id}>
                                  <tr>
                                    <td className="text-muted text-nowrap">
                                      {course.type === 'lecture' && <LectureIcon />}
                                      {course.type === 'labs' && <LabsIcon />}
                                    </td>
                                    <td>{course.dayOfWeek}</td>
                                    <td>{course.time}</td>
                                    <td>{course.room}</td>
                                    <td>{course.sisId}</td>
                                    <td>{getCourseName(course, locale)}</td>
                                  </tr>
                                </tbody>
                              ))}
                            </table>
                          ) : (
                            <div className="m-3 text-center text-muted">
                              <FormattedMessage
                                id="app.groupsStudent.noCourses"
                                defaultMessage="There are currently no courses available for this term."
                              />
                            </div>
                          )
                        }
                      </ResourceRenderer>
                    </Box>
                  ))
                ) : (
                  <Callout type="info">
                    <FormattedMessage
                      id="app.groupsStudent.noActiveTerms"
                      defaultMessage="There are currently no terms available for students."
                    />
                  </Callout>
                )
              }
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
  coursesSelector: PropTypes.func,
  loadAsync: PropTypes.func.isRequired,
  intl: PropTypes.shape({ locale: PropTypes.string.isRequired }).isRequired,
};

export default connect(
  state => ({
    loggedInUserId: loggedInUserIdSelector(state),
    loggedInUser: loggedInUserSelector(state),
    terms: termsSelector(state),
    coursesSelector: studentCoursesSelector(state),
  }),
  dispatch => ({
    loadAsync: userId => GroupsStudent.loadAsync({ userId }, dispatch),
  })
)(injectIntl(GroupsStudent));
