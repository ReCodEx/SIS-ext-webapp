import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';

import Header from '../Header';
import Footer from '../Footer';

import SidebarContainer from '../../../containers/SidebarContainer';
import { getConfigVar } from '../../../helpers/config.js';

const title = getConfigVar('TITLE');

const Layout = ({ isLoggedIn, pendingFetchOperations, children, lang, setLang, currentUrl, availableLangs }) => (
  <div className="app-wrapper overflow-visible">
    <Helmet defaultTitle={`${title}`} titleTemplate={`%s | ${title}`} />
    <Header isLoggedIn={isLoggedIn} availableLangs={availableLangs} currentLang={lang} setLang={setLang} />
    <SidebarContainer currentUrl={currentUrl} pendingFetchOperations={pendingFetchOperations} />
    {children}
    <Footer version={process.env.VERSION} />
  </div>
);

Layout.propTypes = {
  isLoggedIn: PropTypes.bool,
  pendingFetchOperations: PropTypes.bool,
  children: PropTypes.element,
  lang: PropTypes.string,
  setLang: PropTypes.func.isRequired,
  currentUrl: PropTypes.string,
  availableLangs: PropTypes.array,
};

export default Layout;
