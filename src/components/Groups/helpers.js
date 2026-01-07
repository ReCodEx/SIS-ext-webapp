import { lruMemoize } from 'reselect';
import { objectFilter } from '../../helpers/common.js';

/**
 * Retrieve course name in the given locale (with fallbacks).
 * @param {Object} sisEvent (with course sub-object)
 * @param {String} locale
 * @returns {String}
 */
const getCourseName = ({ course }, locale) => {
  const key = `caption_${locale}`;
  return course?.[key] || course?.caption_en || course?.caption_cs || '???';
};

/**
 * Return augmented sisEvents (with localized fullName) sorted by their fullName.
 * @param {Array} sisEvents
 * @param {String} locale
 * @returns {Array}
 */
export const getSortedSisEvents = lruMemoize((sisEvents, locale) =>
  sisEvents
    .map(event => ({ ...event, fullName: getCourseName(event, locale) }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, locale))
);

const augmentGroupObject = (groups, id, locale) => {
  const group = groups[id];
  if (group && !('fullName' in group)) {
    if (group.parentGroupId) {
      // handle ancestors recursively
      augmentGroupObject(groups, group.parentGroupId, locale);

      const parent = groups[group.parentGroupId];
      group.parent = parent;

      // use the parent to update our values
      group.fullName = parent.fullName || '';
      if (group.fullName) {
        group.fullName += ' ❭ ';
      }
      group.fullName += group.name?.[locale] || group.name?.en || group.name?.cs || '???';
      group.isAdmin = parent.isAdmin || group.membership === 'admin';
    } else {
      // root group has special treatment
      groups[id].fullName = '';
      groups[id].isAdmin = false;
    }
  }
};

/**
 * Preprocessing function that returns a sorted array of all groups
 * (augmented with localized fullName and isAdmin flag).
 * @param {Object} groups
 * @param {String} locale (used for sorting)
 * @param {Boolean} createChildren whether to create children list in each group
 * @returns {Array} sorted array of augmented group objects
 */
const getGroups = lruMemoize((groups, locale, createChildren = false) => {
  // make a copy of groups so we can augment it
  const result = {};
  Object.keys(groups).forEach(id => {
    result[id] = { ...groups[id], parent: null };
    if (createChildren) {
      result[id].children = [];
    }
  });

  Object.keys(result).forEach(id => {
    if (!result[id].fullName) {
      augmentGroupObject(result, id, locale);
    }
  });

  const sortedResult = Object.values(result).sort((a, b) => a.fullName.localeCompare(b.fullName, locale));

  if (createChildren) {
    // the children lists are assembled only after all groups are processed and sorted (!)
    sortedResult.forEach(group => {
      if (group.parent) {
        group.parent.children.push(group);
      }
    });
  }

  return sortedResult;
});

/**
 * Get top-level groups (those directly under the root group) with their children lists built-in.
 * @param {Object} groups
 * @param {String} locale
 * @returns {Array} list of top-level groups (augmented with localized fullName and isAdmin flag, and children list)
 */
export const getTopLevelGroups = lruMemoize((groups, locale, filter = null) => {
  if (filter) {
    // filter the groups first and make sure to keep the ancestors of matching groups
    const filteredGroups = objectFilter(groups, filter);
    Object.keys(filteredGroups).forEach(id => {
      id = groups[id].parentGroupId;
      while (id && !(id in filteredGroups)) {
        filteredGroups[id] = groups[id];
        id = groups[id].parentGroupId;
      }
    });
    groups = filteredGroups;
  }

  // 1st level groups have immediate parent, but that parent is a root (has no parent itself)
  return getGroups(groups, locale, true).filter(group => group.parent && !group.parent.parent);
});

const getAttrValues = (group, key) => {
  const values = group?.attributes?.[key];
  return Array.isArray(values) ? values : []; // ensure we always return an array
};

/**
 * Construct a structure of sisId => [groups] where each group is augmented with localized fullName.
 * Each list of groups is sorted by their fullName.
 * @param {Object} groups
 * @param {String} locale
 * @returns {Object} key is sisId (of a scheduling event), value is array of (augmented) groups
 */
export const getSisGroups = lruMemoize((groups, locale) => {
  const sisGroups = {};
  getGroups(groups, locale).forEach(group => {
    getAttrValues(group, 'group').forEach(sisId => {
      if (!sisGroups[sisId]) {
        sisGroups[sisId] = [];
      }
      sisGroups[sisId].push(group); // groups are already sorted, push preserves the order
    });
  });
  return sisGroups;
});

/**
 * Check if a group is suitable for a course in a specific term.
 * @param {Object} sisEvent
 * @param {Object} group
 * @param {Object} groups map of all groups (to access ancestors), keys are group ids
 * @returns {Boolean} true if the group is suitable for binding to the course
 */
const isSuitableForCourse = (sisEvent, group, groups) => {
  const courseCode = sisEvent?.course?.code;
  if (!courseCode || !sisEvent?.year || !sisEvent?.term) {
    return false;
  }
  const termKey = `${sisEvent.year}-${sisEvent.term}`;

  if (getAttrValues(group, 'group').includes(sisEvent.sisId)) {
    return false; // already bound to this event
  }
  let courseCovered = false;
  let termCovered = false;

  while (group && (!courseCovered || !termCovered)) {
    courseCovered = courseCovered || getAttrValues(group, 'course').includes(courseCode);
    termCovered = termCovered || getAttrValues(group, 'term').includes(termKey);
    group = groups[group.parentGroupId];
  }

  return courseCovered && termCovered;
};

/**
 * Get a sorted list of groups suitable for being a parent of a new group
 * for the given course in the given term.
 * @param {Object} sisEvent
 * @param {Object} groups
 * @param {String} locale
 * @returns {Array} list of suitable group objects (augmented with localized fullName and isAdmin flag)
 */
export const getParentCandidates = lruMemoize((sisEvent, groups, locale) =>
  getGroups(groups, locale).filter(group => isSuitableForCourse(sisEvent, group, groups))
);

/**
 * Get a sorted list of groups suitable for binding to the given course in the given term.
 * @param {Object} sisEvent
 * @param {Object} groups
 * @param {String} locale
 * @returns {Array} list of suitable group objects (augmented with localized fullName and isAdmin flag)
 */
export const getBindingCandidates = lruMemoize((sisEvent, groups, locale) =>
  getGroups(groups, locale).filter(
    group =>
      !group.organizational &&
      (group.isAdmin || group.membership === 'supervisor') &&
      isSuitableForCourse(sisEvent, group, groups)
  )
);
