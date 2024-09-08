import * as msal from '@azure/msal-node';
import axios from 'axios';

import { msalConf } from './config.js';

class AuthProvider {
  msalConf;
  cryptoProvider;

  constructor(msalConf) {
    this.msalConf = msalConf;
    this.cryptoProvider = new msal.CryptoProvider();
  };

  login(options = {}){
    return async (req, res, next) => {
      /**
       * MSAL Node library allows you to pass your custom state as state parameter in the Request object.
       * The state parameter can also be used to encode information of the app's state before redirect.
       * You can pass the user's state in the app, such as the page or view they were on, as input to this parameter.
       */
      const state = this.cryptoProvider.base64Encode(JSON.stringify({
        successRedirect: options.successRedirect || '/',
      }));

      const authCodeUrlRequestParams = {
        state: state,

        /**
         * By default, MSAL Node will add OIDC scopes to the auth code url request. For more information, visit:
         * https://docs.microsoft.com/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
         */
        scopes: options.scopes || [],
        redirectUri: options.redirectUri,
      };

      const authCodeRequestParams = {
        state: state,

        /**
         * By default, MSAL Node will add OIDC scopes to the auth code request. For more information, visit:
         * https://docs.microsoft.com/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
         */
        scopes: options.scopes || [],
        redirectUri: options.redirectUri,
      };

      /**
       * If the current msal configuration does not have cloudDiscoveryMetadata or authorityMetadata, we will 
       * make a request to the relevant endpoints to retrieve the metadata. This allows MSAL to avoid making 
       * metadata discovery calls, thereby improving performance of token acquisition process. For more, see:
       * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/performance.md
       */
      if(!this.msalConf.auth.cloudDiscoveryMetadata
          || !this.msalConf.auth.authorityMetadata){

        const [cloudDiscoveryMetadata, authorityMetadata] = await Promise.all([
            this.getCloudDiscoveryMetadata(this.msalConf.auth.authority),
            this.getAuthorityMetadata(this.msalConf.auth.authority)
        ]);

        this.msalConf.auth.cloudDiscoveryMetadata = JSON.stringify(cloudDiscoveryMetadata);
        this.msalConf.auth.authorityMetadata = JSON.stringify(authorityMetadata);
      };

      const msalInstance = this.getMsalInstance(this.msalConf);

      // trigger the first leg of auth code flow
      return this.redirectToAuthCodeUrl(
        authCodeUrlRequestParams,
        authCodeRequestParams,
        msalInstance
      )(req, res, next);
    };
  };

  acquireToken(options = {}){
    return async (req, res, next) => {
      try {
        const msalInstance = this.getMsalInstance(this.msalConf);

        /**
         * If a token cache exists in the session, deserialize it and set it as the 
         * cache for the new MSAL CCA instance. For more, see: 
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/caching.md
         */

        if(req.session.tokenCache){
          msalInstance.getTokenCache().deserialize(req.session.tokenCache);
        };

        const tokenResponse = await msalInstance.acquireTokenSilent({
          account: req.session.account,
          scopes: options.scopes || [],
        });

        /**
         * On successful token acquisition, write the updated token 
         * cache back to the session. For more, see: 
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/caching.md
         */
        req.session.tokenCache = msalInstance.getTokenCache().serialize();
        req.session.accessToken = tokenResponse.accessToken;
        req.session.idToken  = tokenResponse.idToken;
        req.session.account = tokenResponse.account;

        console.log(options.successRedirect);
        res.redirect(options.successRedirect);

      } catch (error) {
        if(error instanceof msal.InteractionRequiredAuthError){
          return this.login({
            scopes: options.scopes || [],
            redirectUri: options.redirectUri,
            successRedirect: options.successRedirect || '/',
          })(req, res, next);
        };

        next(error);
      };
    };
  };

  async getToken(req, options = {}){
    try {
      const msalInstance = this.getMsalInstance(this.msalConf);

      if(req.session.tokenCache){
        msalInstance.getTokenCache().deserialize(req.session.tokenCache);
      };

      const tokenResponse = await msalInstance.acquireTokenSilent({
        account: req.session.account,
        scopes: options.scopes || [],
      });

      req.session.tokenCache = msalInstance.getTokenCache().serialize();
      req.session.accessToken = tokenResponse.accessToken;
      req.session.idToken  = tokenResponse.idToken;
      req.session.account = tokenResponse.account;

      return req.session.accessToken;

    } catch (error) {
      if(error instanceof msal.InteractionRequiredAuthError){
        return error;
      };
    };
  };

  redirectHandler(options = {}){
    return async (req, res, next) => {
      if(!req.body || !req.body.state){
        return next(new Error('Error: response not found'));
      };

      const authCodeRequest = {
        ...req.session.authCodeRequest,
        code: req.body.code,
        codeVerifier: req.session.pkceCodes.verifier,
      };

      try {
        const msalInstance = this.getMsalInstance(this.msalConf);

        if(req.session.tokenCache){
          msalInstance.getTokenCache().deserialize(req.session.tokenCache);
        };

        const tokenResponse = await msalInstance.acquireTokenByCode(authCodeRequest, req.body);

        req.session.tokenCache = msalInstance.getTokenCache().serialize();
        req.session.idToken  = tokenResponse.idToken ;
        req.session.account = tokenResponse.account;
        req.session.isAuthenticated = true;

        const state = JSON.parse(this.cryptoProvider.base64Decode(req.body.state));

        res.redirect(state.successRedirect);

      } catch (error) {
        next(error);
      };
    };
  };

  /**
   * Construct a logout URI and redirect the user to end the
   * session with Azure AD. For more information, visit:
   * https://docs.microsoft.com/azure/active-directory/develop/v2-protocols-oidc#send-a-sign-out-request
   */
  logout(options = {}){
    return (req, res, next) => {
      let logoutUri = `${this.msalConf.auth.authority}/oauth2/v2.0/`;
      
      if(options.postLogoutRedirectUri){
        logoutUri += `logout?post_logout_redirect_uri=${options.postLogoutRedirectUri}`;
      };

      req.session.destroy(() => {
        res.redirect(logoutUri);
      });
    };
  };

  /** Instantiates a new MSAL ConfidentialClientApplication object */
  getMsalInstance(msalConf){
    return new msal.ConfidentialClientApplication(msalConf);
  };

  /**
   * Prepares the auth code request parameters and initiates the first leg of auth code flow
   * @param authCodeUrlRequestParams: parameters for requesting an auth code url
   * @param authCodeRequestParams: parameters for requesting tokens using auth code
   */
  redirectToAuthCodeUrl(authCodeUrlRequestParams, authCodeRequestParams, msalInstance){
    return async (req, res, next) => {
      // Generate PKCE Codes before starting the authorization flow
      const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
      
      // Set generated PKCE codes and method as session vars
      req.session.pkceCodes = {
        challengeMethod: 'S256',
        verifier: verifier,
        challenge: challenge,
      };

      /**
       * By manipulating the request objects below before each request, we can obtain
       * auth artifacts with desired claims. For more information, visit:
       * https://azuread.github.io/microsoft-authentication-library-for-js/ref/modules/_azure_msal_node.html#authorizationurlrequest
       * https://azuread.github.io/microsoft-authentication-library-for-js/ref/modules/_azure_msal_node.html#authorizationcoderequest
       */
      req.session.authCodeUrlRequest = {
        ...authCodeUrlRequestParams,
        responseMode: msal.ResponseMode.FORM_POST, // recommended for confidential clients
        codeChallenge: req.session.pkceCodes.challenge,
        codeChallengeMethod: req.session.pkceCodes.challengeMethod,
      };

      req.session.authCodeRequest = {
        ...authCodeRequestParams,
        code: '',
      };
      
      try {
        const authCodeUrlResponse = await msalInstance.getAuthCodeUrl(req.session.authCodeUrlRequest);
        console.log(authCodeUrlResponse);
        res.redirect(authCodeUrlResponse);
      } catch (error) {
        next(error);
      };
    };
  };

  /** Retrieves cloud discovery metadata from the /discovery/instance endpoint */
  async getCloudDiscoveryMetadata(authority){
    const endpoint = 'https://login.microsoftonline.com/common/discovery/instance';

    try {
      const response = await axios.get(endpoint, {
        params: {
          'api-version': '1.1',
          'authorization_endpoint': `${authority}/oauth2/v2.0/authorize`
        },
      });

      return await response.data;
    } catch (error) {
      throw error;
    };
  };

  /** Retrieves oidc metadata from the openid endpoint */
  async getAuthorityMetadata(authority){
    const endpoint = `${authority}/v2.0/.well-known/openid-configuration`;

    try {
      const response = await axios.get(endpoint);
      return await response.data;
    } catch (error) {
      console.log(error);
    };
  };
};

export const authProvider = new AuthProvider(msalConf);
// const authProvider = new AuthProvider(msalConf);
// export default authProvider;