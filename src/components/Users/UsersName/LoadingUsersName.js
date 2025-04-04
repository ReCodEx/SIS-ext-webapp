import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import * as styles from './usersName.less';

const LoadingUsersName = ({ size = 22 }) => (
  <span className={styles.wrapper}>
    <span style={{ lineHeight: `${size}px` }}>
      <FormattedMessage id="generic.loading" defaultMessage="Loading..." />
    </span>
  </span>
);

LoadingUsersName.propTypes = {
  size: PropTypes.number,
};

export default LoadingUsersName;
