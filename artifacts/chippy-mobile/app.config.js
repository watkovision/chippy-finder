// This file takes precedence over app.json at build time.
// The GOOGLE_MAPS_API_KEY is injected from an EAS secret (see README below).
//
// To set the secret before building:
//   eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_KEY_HERE
//
// Then build for Google Play:
//   eas build --platform android --profile production

const pkg = require("./package.json");

const projectId = "0fbc8140-183f-4f81-ad50-3a0547fd8954";

/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => ({
  ...config,
  name: "Chippy Finder",
  slug: "chippy-mobile",
  owner: "watkovision",
  version: pkg.version,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "chippy-mobile",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FAF7F0",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.chippyfinder.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Chippy Finder needs your location to find the nearest fish & chip shops.",
    },
  },
  android: {
    package: "com.chippyfinder.app",
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
      },
    },
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Chippy Finder needs your location to find the nearest fish & chip shops.",
      },
    ],
    // Must be LAST: restores extra.eas.projectId after any plugin that overwrites extra
    (cfg) => ({
      ...cfg,
      extra: {
        ...cfg.extra,
        router: {
          origin: "https://replit.com/",
        },
        eas: { projectId },
      },
    }),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
