import express from 'express';

import { authProvider } from '../auth/provider.js';
import { redirectUri, logoutUri } from '../auth/config.js';

export const router = express.Router();

router.get('/signin', authProvider.login({
  scopes: [],
  redirectUri: redirectUri,
  successRedirect: '/',
}));

router.get('/acquireToken', authProvider.acquireToken({
  scopes: [],
  redirectUri: redirectUri,
  successRedirect: '/user/profile',
}));

router.get('/sites', authProvider.acquireToken({
  scopes: [],
  redirectUri: redirectUri,
  successRedirect: '/user/summary-sites',
}));

router.get('/delta', authProvider.acquireToken({
  scopes: [],
  redirectUri: redirectUri,
  // successRedirect: '/user/delta',
  successRedirect: '/user/test-sites',
}));

router.get('/get-delta', authProvider.acquireToken({
  scopes: [],
  redirectUri: redirectUri,
  successRedirect: '/user/get-delta',
}));

router.get('/get-changes', authProvider.acquireToken({
  scopes: [],
  redirectUri: redirectUri,
  successRedirect: '/user/get-changes',
}));

router.post('/redirect', authProvider.redirectHandler());

router.get('/signout', authProvider.logout({
  postLogoutRedirectUri: logoutUri,
}));