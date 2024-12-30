import React, { Component } from 'react';
import PropTypes from 'prop-types';

import HeaderNotificationsContainer from '../../../containers/HeaderNotificationsContainer';
import HeaderLanguageSwitching from '../HeaderLanguageSwitching';
import ClientOnly from '../../helpers/ClientOnly';
import Icon from '../../icons';
import { getConfigVar } from '../../../helpers/config.js';

const SKIN = getConfigVar('SKIN') || 'success';

class Header extends Component {
  toggleSidebar = e => {
    e.preventDefault();
    // flip AdminLTE body classes
    window.document.body.classList.toggle('sidebar-collapse');
    window.document.body.classList.toggle('sidebar-open');
  };

  render() {
    const { availableLangs = [], currentLang, setLang } = this.props;

    return (
      <nav className={`app-header navbar navbar-expand bg-${SKIN} shadow`} data-bs-theme="dark">
        <ClientOnly>
          <ul className="navbar-nav w-100">
            <li className="nav-item">
              <a className="nav-link" data-widget="pushmenu" href="#" onClick={this.toggleSidebar}>
                <Icon icon="bars" />
              </a>
            </li>
            <li className="nav-item"></li>
          </ul>
        </ClientOnly>

        <ul className="navbar-nav ms-auto">
          <HeaderNotificationsContainer />
          <HeaderLanguageSwitching availableLangs={availableLangs} currentLang={currentLang} setLang={setLang} />
        </ul>
      </nav>
    );
  }
}

Header.propTypes = {
  isLoggedIn: PropTypes.bool,
  currentLang: PropTypes.string.isRequired,
  setLang: PropTypes.func.isRequired,
  availableLangs: PropTypes.array,
};

export default Header;
