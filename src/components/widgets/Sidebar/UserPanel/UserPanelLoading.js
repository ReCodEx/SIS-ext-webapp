import React from 'react';
import { FormattedMessage } from 'react-intl';

const UserPanelLoading = props => (
  <div className="text-center">
    <span className="text-light ms-3 sidebar-up-hide-collapsed">
      <FormattedMessage id="generic.loading" defaultMessage="Loading..." />
    </span>
  </div>
);

export default UserPanelLoading;
