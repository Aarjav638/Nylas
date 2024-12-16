import Nylas from "nylas";

const nylasConfig = {
  clientId: process.env.CLIENT_ID,
  apiKey: process.env.API_KEY,
  callbackUri: process.env.CALLBACK_URL,
  apiUri: process.env.API_URI,
};

const nylasClient = new Nylas({
  apiKey: nylasConfig.apiKey,
  apiUri: nylasConfig.apiUri,
});

export { nylasClient, nylasConfig };
