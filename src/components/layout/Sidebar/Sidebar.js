import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage } from 'react-intl';
import { lruMemoize } from 'reselect';
import { Link } from 'react-router-dom';

import UserPanelContainer from '../../../containers/UserPanelContainer';

import MenuTitle from '../../widgets/Sidebar/MenuTitle';
import MenuItem from '../../widgets/Sidebar/MenuItem';
import { LoadingIcon } from '../../icons';
import { getJsData } from '../../../redux/helpers/resourceManager';
import { isSupervisorRole, isSuperadminRole } from '../../helpers/usersRoles.js';
import withLinks from '../../../helpers/withLinks.js';
import { getConfigVar } from '../../../helpers/config.js';

import './sidebar.css';

const URL_PREFIX = getConfigVar('URL_PATH_PREFIX');

const getUserData = lruMemoize(user => getJsData(user));

const Sidebar = ({ pendingFetchOperations, loggedInUser, currentUrl, links: { HOME_URI } }) => {
  const user = getUserData(loggedInUser);

  return (
    <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
      <div className="sidebar-brand">
        <Link to={HOME_URI} className="brand-link me-5">
          <>
            <img
              src={`${URL_PREFIX}/public/logo-bare.png`}
              alt="ReCodEx Logo"
              className="pt-1 me-2 brand-image opacity-75"
            />
            <span className="brand-text">
              {pendingFetchOperations && (
                <span className="brand-loading">
                  <LoadingIcon gapRight={2} />
                </span>
              )}
              Sis<b>CodEx</b>
            </span>
          </>
        </Link>
      </div>

      {Boolean(loggedInUser) && (
        <div className="sticky-top shadow border-bottom bg-body-secondary py-2">
          <UserPanelContainer />
        </div>
      )}

      <div className="sidebar-wrapper">
        <div data-overlayscrollbars-viewport="scrollbarHidden">
          <nav className="mt-2">
            {!user && (
              <ul
                className="nav nav-pills sidebar-menu flex-column"
                data-lte-toggle="treeview"
                role="menu"
                data-accordion="false">
                <MenuTitle title="ReCodEx" />
                <MenuItem
                  title={<FormattedMessage id="app.sidebar.menu.signIn" defaultMessage="Sign in" />}
                  icon="sign-in-alt"
                  currentPath={currentUrl}
                  link={HOME_URI}
                />
              </ul>
            )}

            {Boolean(user) && (
              <>
                <ul
                  className="nav nav-pills sidebar-menu flex-column"
                  data-lte-toggle="treeview"
                  role="menu"
                  data-accordion="false">
                  <MenuTitle title={<FormattedMessage id="app.sidebar.menu.title" defaultMessage="Menu" />} />
                  <MenuItem title="TODO" icon="tachometer-alt" currentPath={currentUrl} link="TODO" />

                  {isSupervisorRole(user.role) && <></>}
                  {isSuperadminRole(user.role) && <></>}
                </ul>
              </>
            )}
          </nav>
        </div>
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  pendingFetchOperations: PropTypes.bool,
  loggedInUser: ImmutablePropTypes.map,
  currentUrl: PropTypes.string,
  links: PropTypes.object,
};

export default withLinks(Sidebar);
