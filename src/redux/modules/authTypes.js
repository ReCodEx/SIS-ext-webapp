// action types declaration was moved outside the auth module to break cyclic import dependencies
export const actionTypes = {
  LOGIN: 'siscodex/auth/LOGIN',
  LOGIN_PENDING: 'siscodex/auth/LOGIN_PENDING',
  LOGIN_FULFILLED: 'siscodex/auth/LOGIN_FULFILLED',
  LOGIN_REJECTED: 'siscodex/auth/LOGIN_REJECTED',
  LOGOUT: 'siscodex/auth/LOGOUT',
};

export const statusTypes = {
  LOGGED_OUT: 'LOGGED_OUT',
  LOGGED_IN: 'LOGGED_IN',
  LOGGING_IN: 'LOGGING_IN',
  LOGIN_FAILED: 'LOGIN_FAILED',
};
