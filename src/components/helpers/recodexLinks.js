import { getConfigVar } from '../../helpers/config.js';

const RECODEX_URI = getConfigVar('RECODEX_URI') || null;

const getLink = suffix => {
  if (!RECODEX_URI) return null;
  return `${RECODEX_URI.replace(/\/+$/, '')}/${suffix.replace(/^\/+/, '')}`;
};

export const recodexGroupAssignmentsLink = groupId => getLink(`app/group/${groupId}/assignments`);
export const recodexGroupStudentsLink = groupId => getLink(`app/group/${groupId}/students`);
export const recodexGroupEditLink = groupId => getLink(`app/group/${groupId}/edit`);
