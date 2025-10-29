import 'cross-fetch/dist/browser-polyfill.js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { fromJS } from 'immutable';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { configureOurStore } from './redux/store.js';
import { getToken } from './redux/middleware/authMiddleware.js';
import { getLang } from './redux/middleware/langMiddleware.js';
import App from './containers/App/index.js';

import 'admin-lte/dist/js/adminlte.js';

// load the initial state form the server - if any
let state;
const ini = window.__INITIAL_STATE__;
const blacklist = ['userSwitching'];
if (ini) {
  state = {};
  Object.keys(ini).forEach(key => {
    state[key] = blacklist.includes(key) ? ini[key] : fromJS(ini[key]);
  });
}

const store = configureOurStore(state, getToken(), getLang());

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
