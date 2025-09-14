import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

const DAYS = {
  0: <FormattedMessage id="app.dayOfWeek.sunday" defaultMessage="Sun" />,
  1: <FormattedMessage id="app.dayOfWeek.monday" defaultMessage="Mon" />,
  2: <FormattedMessage id="app.dayOfWeek.tuesday" defaultMessage="Tue" />,
  3: <FormattedMessage id="app.dayOfWeek.wednesday" defaultMessage="Wed" />,
  4: <FormattedMessage id="app.dayOfWeek.thursday" defaultMessage="Thu" />,
  5: <FormattedMessage id="app.dayOfWeek.friday" defaultMessage="Fri" />,
  6: <FormattedMessage id="app.dayOfWeek.saturday" defaultMessage="Sat" />,
};

const DayOfWeek = ({ dow }) => <>{DAYS[dow] || ''}</>;

DayOfWeek.propTypes = {
  dow: PropTypes.number.isRequired,
};

export default DayOfWeek;
