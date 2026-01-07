import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Badge, OverlayTrigger, Popover } from 'react-bootstrap';
import Collapse from 'react-collapse';

import Button from '../../widgets/TheButton';
import Confirm from '../../widgets/Confirm';
import GroupsTreeList from './GroupsTreeList.js';
import GroupMembershipIcon from '../GroupMembershipIcon';
import Icon, { AddIcon, CloseIcon, GroupIcon, LectureIcon, LoadingIcon, TermIcon } from '../../icons';
import { EMPTY_OBJ } from '../../../helpers/common.js';

const DEFAULT_ICON = ['far', 'square'];

const clickEventDissipator = ev => ev.stopPropagation();

const adminsList = admins =>
  Object.values(admins)
    .map(({ firstName, lastName }) => `${firstName} ${lastName}`)
    .join(', ');

const getLocalizedName = (name, id, locale) => {
  if (typeof name === 'string') {
    return name;
  }

  if (typeof name === 'object' && Object.keys(name).length > 0) {
    return name[locale] || name.en || name[Object.keys(name)[0]] || `<${id}>`;
  }

  return `<${id}>`;
};

const KNOWN_ATTR_KEYS = {
  course: 'primary',
  term: 'info',
  group: 'warning',
};

const ATTR_ICONS = {
  course: <LectureIcon gapRight />,
  term: <TermIcon gapRight />,
  group: <GroupIcon gapRight />,
};

const GroupsTreeNode = React.memo(
  ({
    group,
    checkboxes = null,
    checked = null,
    setChecked = null,
    isExpanded = false,
    addAttribute,
    removeAttribute,
    locale,
  }) => {
    const {
      id,
      admins: adminsRaw,
      name,
      organizational = false,
      exam = false,
      attributes = EMPTY_OBJ,
      membership,
      children = [],
      pending = false,
    } = group;

    const admins = Array.isArray(adminsRaw) ? adminsRaw : Object.values(adminsRaw || {});
    const leafNode = children.length === 0;
    const [isOpen, setOpen] = useState(isExpanded);
    const hasCheckbox = checkboxes ? checkboxes(group) : false;
    const isChecked = checked ? Boolean(checked[id]) : false;
    const clickHandler = hasCheckbox ? () => setChecked(id, !isChecked) : () => setOpen(!isOpen);

    return (
      <li>
        <span onClick={clickHandler} className="clearfix">
          {hasCheckbox ? (
            <Icon
              icon={isChecked ? 'square-check' : DEFAULT_ICON}
              className="text-success clickable"
              gapRight={2}
              fixedWidth
            />
          ) : checkboxes ? (
            <Icon icon="square" className="text-body-secondary opacity-25" gapRight={2} fixedWidth />
          ) : (
            <Icon
              icon={leafNode ? DEFAULT_ICON : isOpen ? 'minus-square' : 'plus-square'}
              className="text-body-secondary clickable"
              gapRight={2}
              fixedWidth
            />
          )}

          {getLocalizedName(name, id, locale)}

          {admins && admins.length > 0 && (
            <span className="ps-2">
              (
              {admins.length > 2 ? (
                <OverlayTrigger
                  placement="bottom"
                  overlay={
                    <Popover id={`admins-${id}`}>
                      <Popover.Header>
                        <FormattedMessage
                          id="app.groupsTreeView.adminPopover.title"
                          defaultMessage="Group administrators"
                        />
                        :
                      </Popover.Header>
                      <Popover.Body>{adminsList(admins)}</Popover.Body>
                    </Popover>
                  }>
                  <em className="small">
                    <FormattedMessage
                      id="app.groupsTreeView.adminsCount"
                      defaultMessage="{count} {count, plural, one {admin} other {admins}}"
                      values={{ count: admins.length }}
                    />
                  </em>
                </OverlayTrigger>
              ) : (
                <em className="small">{adminsList(admins)}</em>
              )}
              )
            </span>
          )}

          {exam && (
            <GroupIcon
              exam={true}
              className="text-warning"
              gapLeft={2}
              tooltipId={`${id}-exam-tooltip`}
              tooltipPlacement="bottom"
              tooltip={<FormattedMessage id="app.groupsTreeView.examTooltip" defaultMessage="Exam group" />}
            />
          )}

          {organizational && (
            <GroupIcon
              organizational={true}
              className="text-body-secondary"
              gapLeft={2}
              tooltipId={`${id}-organizational-tooltip`}
              tooltipPlacement="bottom"
              tooltip={
                <FormattedMessage
                  id="app.groupsTreeView.organizationalTooltip"
                  defaultMessage="The group is organizational (it does not have any students or assignments)"
                />
              }
            />
          )}

          <GroupMembershipIcon id={id} membership={membership} gapLeft={2} />
          {pending && <LoadingIcon gapLeft={2} />}

          {addAttribute && (
            <span className="float-end" onClick={clickEventDissipator}>
              <Button
                size="xs"
                variant="success"
                className="ms-3"
                disabled={pending}
                onClick={() => addAttribute(group)}>
                <AddIcon gapRight />
                <FormattedMessage id="app.groupsTreeView.addAttribute" defaultMessage="Add" />
              </Button>
            </span>
          )}

          {attributes && Object.keys(attributes).length > 0 && (
            <span className="float-end" onClick={clickEventDissipator}>
              {Object.keys(attributes).map(key =>
                attributes[key].map(value => (
                  <Badge
                    key={value}
                    bg={KNOWN_ATTR_KEYS[key] || 'secondary'}
                    className={'ms-1' + (pending ? ' opacity-25' : '')}>
                    {ATTR_ICONS[key]}
                    {!KNOWN_ATTR_KEYS[key] && `${key}: `}
                    {value}

                    {removeAttribute && !pending && (
                      <Confirm
                        id={id}
                        onConfirmed={() => removeAttribute(id, key, value)}
                        question={
                          <FormattedMessage
                            id="app.groupsTreeView.removeAttributeConfirm"
                            defaultMessage="Are you sure you want to remove this attribute?"
                          />
                        }>
                        <CloseIcon gapLeft className="clickable" />
                      </Confirm>
                    )}
                    {pending && <LoadingIcon gapLeft />}
                  </Badge>
                ))
              )}
            </span>
          )}
        </span>

        {!leafNode && (
          <Collapse isOpened={isOpen || checkboxes}>
            <GroupsTreeList
              groups={children}
              isExpanded={isExpanded}
              addAttribute={addAttribute}
              removeAttribute={removeAttribute}
              locale={locale}
              checkboxes={checkboxes}
              checked={checked}
              setChecked={setChecked}
            />
          </Collapse>
        )}
      </li>
    );
  }
);

GroupsTreeNode.propTypes = {
  group: PropTypes.shape({
    id: PropTypes.string.isRequired,
    admins: PropTypes.arrayOf(PropTypes.object),
    name: PropTypes.object,
    organizational: PropTypes.bool,
    exam: PropTypes.bool,
    attributes: PropTypes.object,
    membership: PropTypes.string,
    children: PropTypes.arrayOf(PropTypes.object),
    pending: PropTypes.bool,
  }),
  checkboxes: PropTypes.func,
  checked: PropTypes.object,
  setChecked: PropTypes.func,
  isExpanded: PropTypes.bool,
  addAttribute: PropTypes.func,
  removeAttribute: PropTypes.func,
  locale: PropTypes.string.isRequired,
};

export default GroupsTreeNode;
