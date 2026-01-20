import React from 'react';
import PropTypes from 'prop-types';

import GroupsTreeNode from './GroupsTreeNode.js';

const GroupsTreeList = React.memo(
  ({
    groups,
    checkboxes,
    highlight,
    checked,
    errors,
    setChecked,
    isExpanded = false,
    addAttribute,
    removeAttribute,
    locale,
  }) => (
    <ul className="groupTree nav flex-column">
      {groups.map(group => (
        <GroupsTreeNode
          key={group.id}
          group={group}
          isExpanded={isExpanded}
          addAttribute={addAttribute}
          removeAttribute={removeAttribute}
          locale={locale}
          checkboxes={checkboxes}
          highlight={highlight}
          checked={checked}
          setChecked={setChecked}
          errors={errors}
        />
      ))}
    </ul>
  )
);

GroupsTreeList.propTypes = {
  groups: PropTypes.array.isRequired,
  checkboxes: PropTypes.func,
  highlight: PropTypes.func,
  checked: PropTypes.object,
  errors: PropTypes.object,
  setChecked: PropTypes.func,
  isExpanded: PropTypes.bool,
  addAttribute: PropTypes.func,
  removeAttribute: PropTypes.func,
  locale: PropTypes.string.isRequired,
};

export default GroupsTreeList;
