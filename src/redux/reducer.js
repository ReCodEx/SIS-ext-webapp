import { combineReducers } from 'redux';

import app from './modules/app.js';
import auth, { actionTypes as authActionTypes } from './modules/auth.js';
import notifications from './modules/notifications.js';
import sisUsers from './modules/sisUsers.js';
import terms from './modules/terms.js';
import users from './modules/users.js';

const createRecodexReducers = (token, lang) => ({
  app: app(lang),
  auth: auth(token),
  notifications,
  sisUsers,
  terms,
  users,
});

const createReducer = (token, lang) => {
  const appReducer = combineReducers(Object.assign({}, createRecodexReducers(token, lang)));

  return (state, action) => {
    if (action.type === authActionTypes.LOGOUT) {
      state = undefined;
    }

    return appReducer(state, action);
  };
};

export default createReducer;
