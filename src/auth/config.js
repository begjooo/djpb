import dotenv from 'dotenv';

dotenv.config();

export const msalConf = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: process.env.CLOUD_INSTANCE + process.env.TENANT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containPii){
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: 3,
    },
  },
};

export const redirectUri = process.env.REDIRECT_URI;
export const logoutUri = process.env.REDIRECT_LOGOUT_URI;
export const graphEndPoint = process.env.GRAPH_ENDPOINT;
export const siteId = process.env.SITE_ID;
export const driveId = process.env.DRIVE_ID;
export const listId = process.env.LIST_ID;