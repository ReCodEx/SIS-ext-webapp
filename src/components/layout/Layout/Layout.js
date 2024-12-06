import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import classnames from 'classnames';

import Header from '../Header';
import Footer from '../Footer';

import SidebarContainer from '../../../containers/SidebarContainer';
import { getConfigVar } from '../../../helpers/config.js';

const title = getConfigVar('TITLE');

const Layout = ({
  toggleSize,
  toggleVisibility,
  isLoggedIn,
  sidebarIsCollapsed,
  sidebarIsOpen,
  pendingFetchOperations,
  children,
  lang,
  setLang,
  currentUrl,
  availableLangs,
  onCloseSidebar,
}) => (
  <div
    className={classnames({
      'app-wrapper': true,
      'sidebar-expand-lg': true,
      'sidebar-mini': true,
      'sidebar-collapse': sidebarIsCollapsed,
      'sidebar-open': sidebarIsOpen,
    })}
    style={{
      overflow: 'visible',
    }}>
    <Helmet defaultTitle={`${title}`} titleTemplate={`%s | ${title}`} />
    <Header
      isLoggedIn={isLoggedIn}
      toggleSidebarSize={toggleSize}
      toggleSidebarVisibility={toggleVisibility}
      availableLangs={availableLangs}
      currentLang={lang}
      setLang={setLang}
    />
    <SidebarContainer
      isCollapsed={sidebarIsCollapsed}
      currentUrl={currentUrl}
      pendingFetchOperations={pendingFetchOperations}
    />
    <div onClick={onCloseSidebar}>
      {children}
      <Footer version={process.env.VERSION} />
    </div>
  </div>
);

Layout.propTypes = {
  toggleSize: PropTypes.func,
  toggleVisibility: PropTypes.func,
  isLoggedIn: PropTypes.bool,
  sidebarIsCollapsed: PropTypes.bool,
  sidebarIsOpen: PropTypes.bool,
  pendingFetchOperations: PropTypes.bool,
  onCloseSidebar: PropTypes.func,
  children: PropTypes.element,
  lang: PropTypes.string,
  setLang: PropTypes.func.isRequired,
  currentUrl: PropTypes.string,
  availableLangs: PropTypes.array,
};

export default Layout;