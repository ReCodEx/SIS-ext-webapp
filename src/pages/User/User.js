import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import Page from '../../components/layout/Page';

import { fetchUserIfNeeded } from '../../redux/modules/users.js';

class User extends Component {
  componentDidMount() {
    this.props.loadAsync();
  }

  componentDidUpdate(prevProps) {
    // FIXME
    //  this.props.loadAsync();
  }

  static loadAsync = ({ userId }, dispatch) => dispatch(fetchUserIfNeeded(userId));

  render() {
    // const { userId, loggedInUserId, isSuperAdmin, memberGroups, fetchManyGroupsStatus, takeOver } = this.props;

    return (
      <Page title={<FormattedMessage id="app.user.title" defaultMessage="User's profile" />}>{() => <div></div>}</Page>
    );
  }
}

User.propTypes = {
  /*
  userId: PropTypes.string,
  loggedInUserId: PropTypes.string,
  user: ImmutablePropTypes.map,
  isSuperAdmin: PropTypes.bool,
  isStudent: PropTypes.bool,
  memberGroups: PropTypes.object.isRequired,
  fetchManyGroupsStatus: PropTypes.string,
  params: PropTypes.shape({ userId: PropTypes.string.isRequired }).isRequired,
  takeOver: PropTypes.func.isRequired,
*/
  loadAsync: PropTypes.func.isRequired,
};

export default connect(
  (state, { params: { userId } }) => ({
    userId,
    /*
    loggedInUserId: loggedInUserIdSelector(state),
    user: getUser(userId)(state),
    isSuperAdmin: isLoggedAsSuperAdmin(state),
    isStudent: isStudent(userId)(state),
    memberGroups: groupsUserIsMemberSelector(state, userId),
    fetchManyGroupsStatus: fetchManyGroupsStatus(state),
*/
  }),
  (dispatch, { params }) => ({
    loadAsync: () => User.loadAsync(params, dispatch),
  })
)(User);
