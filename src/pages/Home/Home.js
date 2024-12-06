import React from 'react';
// import PropTypes from 'prop-types';
// import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';

import PageContent from '../../components/layout/PageContent';
import { HomeIcon } from '../../components/icons';

const Home = () => (
  <PageContent icon={<HomeIcon />} title={<FormattedMessage id="app.homepage.title" defaultMessage="Home Page" />}>
    <div></div>
  </PageContent>
);

// Home.propTypes = {};

export default connect(state => ({
  // effectiveRole: getLoggedInUserEffectiveRole(state),
  // instance: selectedInstance(state),
}))(injectIntl(Home));
