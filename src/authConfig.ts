import { LogLevel } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "da2fe000-2f2b-41cf-88ea-52bde108dfab", // From Azure App Registration
    authority:
      "https://login.microsoftonline.com/id", // common Or "id"
    redirectUri: "http://localhost:5173", // Your app's URL
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: any, containsPii: any) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

// List of allowed users
export const allowedUsers = ["personal@gmail.com", "lanid@mdlz.com"];

// Scopes your app requires
export const loginRequest = {
  scopes: ["User.Read"],
};
