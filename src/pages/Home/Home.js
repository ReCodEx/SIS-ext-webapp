import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import Page from '../../components/layout/Page';
import PageContent from '../../components/layout/PageContent';
import Icon, {
  GroupFocusIcon,
  HomeIcon,
  JoinGroupIcon,
  LinkIcon,
  LoadingIcon,
  ManagementIcon,
  ReturnIcon,
  UserProfileIcon,
  TermIcon,
  WarningIcon,
} from '../../components/icons';
import Callout from '../../components/widgets/Callout';

import { setLang } from '../../redux/modules/app.js';
import { login, logout, statusTypes as authStatusTypes } from '../../redux/modules/auth.js';
import { fetchUserIfNeeded } from '../../redux/modules/users.js';
import { loggedInUserSelector } from '../../redux/selectors/users.js';
import { loggedInUserIdSelector, loginStatusSelector } from '../../redux/selectors/auth.js';

import { getReturnUrl, setReturnUrl } from '../../helpers/localStorage.js';
import { knownLocalesNames } from '../../helpers/localizedData.js';
import { isStudentRole, isSupervisorRole, isSuperadminRole } from '../../components/helpers/usersRoles.js';
import withLinks from '../../helpers/withLinks.js';

class Home extends Component {
  state = { failed: false };

  static loadAsync = ({ userId }, dispatch) => dispatch(fetchUserIfNeeded(userId));

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

    if (this.props.loggedInUserId) {
      this.props.loadAsync(this.props.loggedInUserId);
    }
  }

  componentDidUpdate() {
    if (this.props.loggedInUserId) {
      this.props.loadAsync(this.props.loggedInUserId);
    }
  }

  render() {
    const {
      loggedInUser,
      loginStatus,
      params: { token = null },
      links: { USER_URI, TERMS_URI, GROUPS_STUDENT_URI, GROUPS_TEACHER_URI, GROUPS_SUPERADMIN_URI },
    } = this.props;

    if (!loggedInUser && (!token || loginStatus === authStatusTypes.LOGIN_FAILED)) {
      return (
        <PageContent
          icon={<HomeIcon />}
          title={<FormattedMessage id="app.homepage.title" defaultMessage="SiS-CodEx Extension" />}
          windowTitle={<FormattedMessage id="app.homepage.title" defaultMessage="SiS-CodEx Extension" />}>
          <Callout variant="warning" className="my-3">
            <h4>
              {!token ? (
                <FormattedMessage
                  id="app.homepage.userSessionExpired"
                  defaultMessage="Your user session has expired or you have logged out"
                />
              ) : (
                <FormattedMessage id="app.homepage.loginFailed" defaultMessage="Authentication process failed" />
              )}
            </h4>
            <p>
              <FormattedMessage
                id="app.homepage.userSessionExpiredInfo"
                defaultMessage="You need to initialize a new session by re-entering this application from ReCodEx."
              />
            </p>
            <p>
              <a href={getReturnUrl()}>
                <ReturnIcon gapRight />
                <FormattedMessage id="app.homepage.returnToReCodEx" defaultMessage="Return to ReCodEx..." />
              </a>
            </p>
          </Callout>
        </PageContent>
      );
    }

    return (
      <Page
        resource={loggedInUser}
        icon={<HomeIcon />}
        title={<FormattedMessage id="app.homepage.title" defaultMessage="SiS-CodEx Extension" />}>
        {user => (
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
                <FormattedMessage
                  id="app.homepage.processingToken"
                  defaultMessage="Processing authentication token..."
                />
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

                {isStudentRole(user.role) && (
                  <Row className="mb-4">
                    <Col xs={false} sm="auto">
                      <h3>
                        <JoinGroupIcon gapLeft={2} gapRight={2} fixedWidth className="text-body-secondary" />
                      </h3>
                    </Col>
                    <Col xs={12} sm>
                      <h3>
                        <Link to={GROUPS_STUDENT_URI} className="link-body-emphasis">
                          <FormattedMessage id="app.sidebar.menu.groupsStudent" defaultMessage="Join Groups" />
                          <LinkIcon gapLeft={3} />
                        </Link>
                      </h3>

                      <p>
                        <FormattedMessage
                          id="app.homepage.groupsStudentPage"
                          defaultMessage="Join groups that correspond to your enrolled courses in SIS."
                        />
                      </p>
                    </Col>
                  </Row>
                )}

                {isSupervisorRole(user.role) && (
                  <Row className="mb-4">
                    <Col xs={false} sm="auto">
                      <h3>
                        <GroupFocusIcon gapLeft={2} gapRight={2} fixedWidth className="text-body-secondary" />
                      </h3>
                    </Col>
                    <Col xs={12} sm>
                      <h3>
                        <Link to={GROUPS_TEACHER_URI} className="link-body-emphasis">
                          <FormattedMessage id="app.sidebar.menu.groupsTeacher" defaultMessage="Create Groups" />
                          <LinkIcon gapLeft={3} />
                        </Link>
                      </h3>

                      <p>
                        <FormattedMessage
                          id="app.homepage.groupsTeacherPage"
                          defaultMessage="Create or bind groups for your courses in SIS."
                        />
                      </p>
                    </Col>
                  </Row>
                )}

                {isSuperadminRole(user.role) && (
                  <>
                    <Row className="mb-4">
                      <Col xs={false} sm="auto">
                        <h3>
                          <ManagementIcon gapLeft={2} gapRight={2} fixedWidth className="text-body-secondary" />
                        </h3>
                      </Col>
                      <Col xs={12} sm>
                        <h3>
                          <Link to={GROUPS_SUPERADMIN_URI} className="link-body-emphasis">
                            <FormattedMessage
                              id="app.sidebar.menu.groupsSuperadmin"
                              defaultMessage="Group Management"
                            />
                            <LinkIcon gapLeft={3} />
                          </Link>
                        </h3>

                        <p>
                          <FormattedMessage
                            id="app.homepage.groupsSuperadminPage"
                            defaultMessage="Management of groups and their attributes at highest level (available to superadmins only)."
                          />
                        </p>
                      </Col>
                    </Row>

                    <Row className="mb-4">
                      <Col xs={false} sm="auto">
                        <h3>
                          <TermIcon gapLeft={2} gapRight={2} fixedWidth className="text-body-secondary" />
                        </h3>
                      </Col>
                      <Col xs={12} sm>
                        <h3>
                          <Link to={TERMS_URI} className="link-body-emphasis">
                            <FormattedMessage id="app.sidebar.menu.terms" defaultMessage="Terms" />
                            <LinkIcon gapLeft={3} />
                          </Link>
                        </h3>

                        <p>
                          <FormattedMessage
                            id="app.homepage.termsPage"
                            defaultMessage="Management of terms and their related dates (when they are active for students and teachers)."
                          />
                        </p>
                      </Col>
                    </Row>
                  </>
                )}

                <hr className="my-4" />

                <Row>
                  <Col xs={false} sm="auto">
                    <h3>
                      <Icon
                        icon="person-walking-arrow-loop-left"
                        gapLeft={2}
                        gapRight={2}
                        fixedWidth
                        className="text-body-secondary"
                      />
                    </h3>
                  </Col>
                  <Col xs={12} sm>
                    <h3>
                      <Link
                        to={USER_URI}
                        className="link-body-emphasis"
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
                        <FormattedMessage id="app.backToReCodEx" defaultMessage="Back to ReCodEx" />
                        <LinkIcon gapLeft={3} />
                      </Link>
                    </h3>

                    <p>
                      <FormattedMessage
                        id="app.homepage.backToReCodExDescription"
                        defaultMessage="And logout from SIS-CodEx session."
                      />
                    </p>
                  </Col>
                </Row>
              </>
            )}
          </div>
        )}
      </Page>
    );
  }
}

Home.propTypes = {
  params: PropTypes.shape({
    token: PropTypes.string,
  }),
  loggedInUserId: PropTypes.string,
  loggedInUser: ImmutablePropTypes.map,
  loginStatus: PropTypes.string,
  loadAsync: PropTypes.func.isRequired,
  setLang: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  intl: PropTypes.shape({ locale: PropTypes.string.isRequired }).isRequired,
  links: PropTypes.object.isRequired,
};

export default connect(
  state => ({
    loggedInUserId: loggedInUserIdSelector(state),
    loggedInUser: loggedInUserSelector(state),
    loginStatus: loginStatusSelector(state),
  }),
  dispatch => ({
    loadAsync: userId => Home.loadAsync({ userId }, dispatch),
    setLang: lang => dispatch(setLang(lang)),
    login: token => dispatch(login(token)),
    logout: () => dispatch(logout()),
  })
)(injectIntl(withLinks(Home)));
