import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import UserPanel, { UserPanelLoading, UserPanelFailed } from '../../components/widgets/Sidebar/UserPanel';
import ResourceRenderer from '../../components/helpers/ResourceRenderer';
import { loggedInUserSelector } from '../../redux/selectors/users.js';
import { accessTokenExpiration } from '../../redux/selectors/auth.js';
import { logout } from '../../redux/modules/auth.js';

const UserPanelContainer = ({ user, expiration, logout }) => (
  <ResourceRenderer loading={<UserPanelLoading />} failed={<UserPanelFailed color="black" />} resource={user}>
    {user => <UserPanel user={user} logout={logout} expiration={expiration} />}
  </ResourceRenderer>
);

UserPanelContainer.propTypes = {
  user: PropTypes.object,
  expiration: PropTypes.number.isRequired,
  logout: PropTypes.func.isRequired,
  links: PropTypes.object,
};

export default connect(
  state => ({
    user: loggedInUserSelector(state),
    expiration: accessTokenExpiration(state),
  }),
  dispatch => ({
    logout: () => dispatch(logout()),
  })
)(UserPanelContainer);
