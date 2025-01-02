import React, { Component } from 'react';
import PropTypes from 'prop-types';
// import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';

import PageContent from '../../components/layout/PageContent';
import { HomeIcon, LoadingIcon, ReturnIcon, WarningIcon } from '../../components/icons';
import Callout from '../../components/widgets/Callout';

import { setLang } from '../../redux/modules/app.js';
import { login } from '../../redux/modules/auth.js';

import { getReturnUrl, setReturnUrl } from '../../helpers/localStorage.js';
import { knownLocalesNames } from '../../helpers/localizedData.js';
import withLinks from '../../helpers/withLinks.js';

class Home extends Component {
  state = { failed: false };

  componentDidMount() {
    const {
      params: { token = null },
      setLang,
      login,
      intl: { locale },
      links: { HOME_URI },
    } = this.props;

    this.setState({ failed: false });

    const urlParams = new URLSearchParams(document.location.search);

    // save return url into local storage (if any)
    const returnUrl = urlParams.get('return');
    if (returnUrl) {
      setReturnUrl(returnUrl);
    }

    // switch to the right language if necessary
    const urlLocale = urlParams.get('locale');
    if (urlLocale && knownLocalesNames[urlLocale] && urlLocale !== locale) {
      setLang(urlLocale);
    }

    // login with temp token
    if (token) {
      login(token).then(
        () => window.location.replace(HOME_URI),
        () => this.setState({ failed: true })
      );
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
          {this.state.failed ? (
            <Callout variant="danger" className="my-3">
              <p>
                <WarningIcon gapRight className="text-danger" />
                <FormattedMessage
                  id="app.homepage.processingTokenFailed"
                  defaultMessage="Authentication process failed."
                />
              </p>
              <p>
                <a href={getReturnUrl()}>
                  <ReturnIcon gapRight />
                  <FormattedMessage id="app.homepage.returnToReCodEx" defaultMessage="Return to ReCodEx..." />
                </a>
              </p>
            </Callout>
          ) : token ? (
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
