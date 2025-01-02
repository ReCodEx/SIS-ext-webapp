import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, FormattedRelativeTime } from 'react-intl';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

import UserName from '../../../Users/UsersName';
import { ReturnIcon } from '../../../icons';
import { getReturnUrl, setReturnUrl } from '../../../../helpers/localStorage';

import './userPanel.css';

class UserPanel extends Component {
  render() {
    const { user, expiration, logout } = this.props;

    return (
      <>
        <div className="text-center text-light sidebar-up-hide-collapsed">
          <UserName currentUserId={user.id} {...user} />
        </div>

        <div className="small text-center mt-1">
          <span className="sidebar-up-collapsed-block">
            <OverlayTrigger
              placement="bottom"
              overlay={
                <Tooltip id="tokenExpiration">
                  <FormattedMessage id="app.badge.sessionExpiration" defaultMessage="Session expiration:" />{' '}
                  <FormattedRelativeTime
                    value={(expiration - Date.now()) / 1000}
                    numeric="auto"
                    updateIntervalInSeconds={1000000}
                  />
                </Tooltip>
              }>
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  logout();

                  // let's go back to ReCodEx after the logout...
                  const url = getReturnUrl();
                  if (url && window) {
                    setReturnUrl(null);
                    window.location.assign(url);
                  }
                }}>
                <ReturnIcon className="text-danger sidebar-up-collapse-gaps" gapRight />
                <span className="sidebar-up-hide-collapsed">
                  <FormattedMessage id="app.logout" defaultMessage="Logout" />
                </span>
              </a>
            </OverlayTrigger>
          </span>
        </div>
      </>
    );
  }
}

UserPanel.propTypes = {
  user: PropTypes.object.isRequired,
  logout: PropTypes.func,
  expiration: PropTypes.number.isRequired,
};

export default UserPanel;
