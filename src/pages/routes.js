import React from 'react';
import { matchPath, Routes, Route, Navigate } from 'react-router-dom';

/* container components */
import App from '../containers/App';
import Home from './Home';
import User from './User';

import { createLoginLinkWithRedirect, abortAllPendingRequests } from '../redux/helpers/api/tools.js';
import { API_BASE, URL_PATH_PREFIX } from '../helpers/config.js';
import withRouter from '../helpers/withRouter.js';

const unwrap = component => {
  while (component && component.WrappedComponent) {
    component = component.WrappedComponent;
  }
  return component;
};

// a global mechanism for suspending the abort optimization (when it can do some harm)
let abortSuspended = false;

export const suspendAbortPendingRequestsOptimization = () => {
  abortSuspended = true;
};

/**
 * Helper function for creating internal route declarations.
 * @param {String} basePath Route string (without prefix)
 * @param {Class} component Attached page component
 * @param {String} linkName Name of the link constant, under which this path is accessible in links
 * @param {Boolean|undefined} auth true = only authorized users, false = only unauthorized users, undefined = do not care
 */
const r = (basePath, component, linkName = '', auth = undefined) => {
  const path = basePath === '*' ? basePath : `${URL_PATH_PREFIX}/${basePath}`;

  /*
   * The abort of pending requests was shifted to unmount callback (since new router took away history.listen).
   * Top-level components are unmountend only when the page navigates to a different top-level component.
   */
  const rootComponent = unwrap(component);
  if (rootComponent && rootComponent.prototype) {
    const componentWillUnmount = rootComponent.prototype.componentWillUnmount;
    // must be an old 'function', so it captures 'this' properly
    rootComponent.prototype.componentWillUnmount = function (...args) {
      if (componentWillUnmount) {
        componentWillUnmount.call(this, ...args);
      }
      if (!abortSuspended) {
        abortAllPendingRequests();
      }
      abortSuspended = false;
    };
  }

  return {
    route: { path },
    component: withRouter(component),
    basePath,
    auth,
    linkName,
  };
};

// Route/Link declarations
const routesDescriptors = [
  r('', Home, 'HOME_URI'),
  r('login/:token', Home, 'LOGIN_URI'),
  r('app/user', User, 'USER_URI', true),
];

/*
 * Routes
 */

const getRedirect = (routeObj, urlPath, isLoggedIn) => {
  if (routeObj.auth !== undefined && routeObj.auth !== isLoggedIn) {
    return routeObj.auth ? createLoginLinkWithRedirect(urlPath) : getLinks().DASHBOARD_URI;
  } else {
    return null;
  }
};

/**
 * Basically a replacement for old match function from react-router v3.
 * It tries to match actual route base on the URL and returns either a redirect
 * or route parameters + async load list of functions extracted from components info.
 * @param {String} urlPath
 * @param {Boolean} isLoggedIn
 */
export const match = (urlPath, isLoggedIn) => {
  const routeObj = routesDescriptors.find(({ route }) => matchPath(route, urlPath) !== null);
  if (!routeObj) {
    return {};
  }

  const component = unwrap(routeObj.component);

  const redirect = getRedirect(routeObj, urlPath, isLoggedIn);
  const match = matchPath(routeObj.route, urlPath);

  const loadAsync = [unwrap(App).loadAsync];
  if (component && component.loadAsync) {
    loadAsync.push(component.loadAsync);
  }

  return { redirect, ...match, loadAsync };
};

export const buildRoutes = (urlPath, isLoggedIn) => {
  return (
    <Routes>
      {routesDescriptors.map(routeObj => {
        const redirect = getRedirect(routeObj, urlPath, isLoggedIn);
        return redirect ? (
          <Route key={routeObj.route.path} path={routeObj.route.path} element={<Navigate to={redirect} replace />} />
        ) : (
          <Route key={routeObj.route.path} path={routeObj.route.path} Component={routeObj.component} />
        );
      })}
    </Routes>
  );
};

/*
 * Links
 */

let linksCache = null;

const createLink = path => {
  const tokens = path.split('/');
  const index = [];
  tokens.forEach((token, idx) => {
    if (token.startsWith(':')) {
      index.push(idx);
    }
  });

  if (index.length > 0) {
    // link factory
    return (...params) => {
      const res = [...tokens]; // make a copy of URL path tokens (so we can fill in parameters)
      index.forEach(idx => (res[idx] = params.shift())); // fill in parameters using indexed positions
      while (res.length > 0 && !res[res.length - 1]) {
        // remove empty parameters at the end (params.shift() will fill in undefined for every missing parameter)
        res.pop();
      }
      res.unshift(URL_PATH_PREFIX);
      return res.join('/');
    };
  } else {
    // static link
    return `${URL_PATH_PREFIX}/${path}`;
  }
};

export const getLinks = () => {
  if (!linksCache) {
    // Fixed links not related to routes.
    linksCache = {
      API_BASE,
      GITHUB_BUGS_URL: 'https://github.com/ReCodEx/SIS-ext-webapp/issues',
    };

    // Gather links from router descriptors
    routesDescriptors
      .filter(({ linkName, basePath }) => linkName && basePath !== '*')
      .forEach(({ route, linkName, basePath }) => {
        linksCache[linkName] = createLink(basePath);
      });
  }

  return linksCache;
};
