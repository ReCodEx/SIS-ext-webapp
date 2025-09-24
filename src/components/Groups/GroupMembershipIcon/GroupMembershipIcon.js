import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import { AdminRoleIcon, ObserverIcon, SupervisorIcon, StudentsIcon } from '../../icons';

const GroupMembershipIcon = ({ id, membership, ...props }) => (
  <>
    {membership === 'admin' && (
      <AdminRoleIcon
        className="text-primary"
        tooltipId={`admin-${id}`}
        tooltipPlacement="bottom"
        tooltip={
          <FormattedMessage
            id="app.groupMembershipIcon.admin"
            defaultMessage="You are an administrator of this group"
          />
        }
        {...props}
      />
    )}
    {membership === 'supervisor' && (
      <SupervisorIcon
        className="text-primary"
        tooltipId={`supervisor-${id}`}
        tooltipPlacement="bottom"
        tooltip={
          <FormattedMessage
            id="app.groupMembershipIcon.supervisor"
            defaultMessage="You are a supervisor of this group"
          />
        }
        {...props}
      />
    )}
    {membership === 'observer' && (
      <ObserverIcon
        className="opacity-50"
        tooltipId={`observer-${id}`}
        tooltipPlacement="bottom"
        tooltip={
          <FormattedMessage id="app.groupMembershipIcon.observer" defaultMessage="You are an observer of this group" />
        }
        {...props}
      />
    )}
    {membership === 'student' && (
      <StudentsIcon
        className="text-success"
        tooltipId={`student-${id}`}
        tooltipPlacement="bottom"
        tooltip={
          <FormattedMessage id="app.groupMembershipIcon.student" defaultMessage="You are a student of this group" />
        }
        {...props}
      />
    )}
  </>
);

GroupMembershipIcon.propTypes = {
  id: PropTypes.string.isRequired,
  membership: PropTypes.string,
};

export default GroupMembershipIcon;
