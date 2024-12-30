import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import * as styles from './usersName.less';

const FailedUsersName = ({ size = 25 }) => (
  <span className={styles.wrapper}>
    <span style={{ lineHeight: `${size}px` }}>
      <FormattedMessage id="generic.loading" defaultMessage="Loading..." />
    </span>
  </span>
);

FailedUsersName.propTypes = {
  size: PropTypes.number,
};

export default FailedUsersName;
