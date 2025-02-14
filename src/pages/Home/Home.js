import React, { Component } from 'react';
import PropTypes from 'prop-types';
// import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import PageContent from '../../components/layout/PageContent';
import Icon, {
  HomeIcon,
  LinkIcon,
  LoadingIcon,
  ReturnIcon,
  UserProfileIcon,
  WarningIcon,
} from '../../components/icons';
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
      links: { USER_URI },
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
              <p>
                <FormattedMessage
                  id="app.homepage.about"
                  defaultMessage="This ReCodEx extension handles data integration and exchange between ReCodEx and Charles University Student Information System (SIS). Please choose one of the pages below."
                />
              </p>

              <hr className="my-4" />

              <Row className="mb-4">
                <Col xs={false} sm="auto">
                  <h3>
                    <UserProfileIcon gapLeft={2} gapRight={2} fixedWidth className="text-body-secondary" />
                  </h3>
                </Col>
                <Col xs={12} sm>
                  <h3>
                    <Link to={USER_URI} className="link-body-emphasis">
                      <FormattedMessage id="app.sidebar.menu.user" defaultMessage="Personal Data" />
                      <LinkIcon gapLeft={3} />
                    </Link>
                  </h3>

                  <p>
                    <FormattedMessage
                      id="app.homepage.userPage"
                      defaultMessage="The personal data integration page allows updating ReCodEx user profile (name, titles, email) using data from SIS."
                    />
                  </p>
                </Col>
              </Row>

              <Row>
                <Col xs={false} sm="auto">
                  <h3>
                    <Icon icon="person-digging" gapLeft={2} gapRight={2} fixedWidth className="text-body-secondary" />
                  </h3>
                </Col>
                <Col xs={12} sm>
                  <h3>
                    <FormattedMessage id="app.homepage.workInProgress" defaultMessage="More features comming..." />
                  </h3>

                  <p>
                    <FormattedMessage
                      id="app.homepage.workInProgressDescription"
                      defaultMessage="More features are being prepared, most notably the group integration which is currently embedded directly in ReCodEx."
                    />
                  </p>
                </Col>
              </Row>
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
