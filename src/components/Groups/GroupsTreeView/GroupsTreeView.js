import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, injectIntl } from 'react-intl';

import GroupsTreeList from './GroupsTreeList.js';

import { getTopLevelGroups } from '../helpers.js';
import './GroupsTreeView.css';

/*
 * Component displaying groups in a hierarchical tree view with associated attributes.
 */
const GroupsTreeView = ({
  groups,
  filter = null,
  checkboxes = null,
  highlight = null,
  checked = null,
  setChecked = null,
  isExpanded = false,
  addAttribute = null,
  removeAttribute = null,
  errors = null,
  intl: { locale },
}) => {
  const topLevelGroups = getTopLevelGroups(groups, locale, filter);
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
      checkboxes={checkboxes}
      highlight={highlight}
      checked={checked}
      setChecked={setChecked}
      errors={errors}
    />
  );
};

GroupsTreeView.propTypes = {
  groups: PropTypes.object.isRequired, // plain object with groupId -> group mappings
  filter: PropTypes.func,
  checkboxes: PropTypes.func,
  highlight: PropTypes.func,
  checked: PropTypes.object,
  errors: PropTypes.object,
  setChecked: PropTypes.func,
  isExpanded: PropTypes.bool,
  addAttribute: PropTypes.func,
  removeAttribute: PropTypes.func,
  intl: PropTypes.shape({ locale: PropTypes.string.isRequired }).isRequired,
};

export default injectIntl(GroupsTreeView);
