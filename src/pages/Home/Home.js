import React, { Component } from 'react';
import PropTypes from 'prop-types';
// import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';

import PageContent from '../../components/layout/PageContent';
import { HomeIcon, LoadingIcon } from '../../components/icons';

import { setLang } from '../../redux/modules/app.js';
import { login } from '../../redux/modules/auth.js';

import { knownLocalesNames } from '../../helpers/localizedData.js';
import withLinks from '../../helpers/withLinks.js';

class Home extends Component {
  componentDidMount() {
    const {
      params: { token = null },
      setLang,
      login,
      intl: { locale },
      links: { HOME_URI },
    } = this.props;

    // switch to the right language if necessary
    const urlParams = new URLSearchParams(document.location.search);
    const urlLocale = urlParams.get('locale');
    if (urlLocale && knownLocalesNames[urlLocale] && urlLocale !== locale) {
      setLang(urlLocale);
    }

    // login with temp token
    if (token) {
      login(token).then(() => window.location.replace(HOME_URI));
    }
  }

  render() {
    const {
      params: { token = null },
    } = this.props;

    return (
      <PageContent
        icon={<HomeIcon />}
        title={<FormattedMessage id="app.homepage.title" defaultMessage="SiS-CodEx Extension" />}>
        <div>
          {token ? (
            <p>
              <LoadingIcon gapRight />
              <FormattedMessage id="app.homepage.processingToken" defaultMessage="Processing authentication token..." />
            </p>
          ) : (
            <>
              <h1>TODO</h1>
            </>
          )}
        </div>
      </PageContent>
    );
  }
}

Home.propTypes = {
  params: PropTypes.shape({
    token: PropTypes.string,
  }),
  setLang: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  intl: PropTypes.shape({ locale: PropTypes.string.isRequired }).isRequired,
  links: PropTypes.object.isRequired,
};

export default connect(
  state => ({
    // user: todo(state),
  }),
  dispatch => ({
    setLang: lang => dispatch(setLang(lang)),
    login: token => dispatch(login(token)),
  })
)(injectIntl(withLinks(Home)));
