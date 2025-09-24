import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { FormattedMessage, injectIntl } from 'react-intl';

import GroupsTreeList from './GroupsTreeList.js';

import { getTopLevelGroups } from '../helpers.js';
import './GroupsTreeView.css';

/*
 * Component displaying groups in a hierarchical tree view with associated attributes.
 */
const GroupsTreeView = ({ groups, isExpanded = false, intl: { locale }, addAttribute, removeAttribute }) => {
  const topLevelGroups = getTopLevelGroups(groups, locale);
  return topLevelGroups.length === 0 ? (
    <FormattedMessage id="app.groupsTreeView.empty" defaultMessage="No groups available" />
  ) : (
    <GroupsTreeList
      groups={topLevelGroups}
      isExpanded={isExpanded}
      buttonsCreator={null}
      locale={locale}
      addAttribute={addAttribute}
      removeAttribute={removeAttribute}
    />
  );
};

GroupsTreeView.propTypes = {
  groups: ImmutablePropTypes.map,
  isExpanded: PropTypes.bool,
  addAttribute: PropTypes.func,
  removeAttribute: PropTypes.func,
  intl: PropTypes.shape({ locale: PropTypes.string.isRequired }).isRequired,
};

export default injectIntl(GroupsTreeView);
