// Dynamic config layered on top of app.json. Its only job: inject the Android FCM
// google-services.json path from an env var so the file (which carries Firebase
// project config) is NEVER committed to this public repo.
//
// - EAS builds: GOOGLE_SERVICES_JSON is an EAS "file" env var → EAS materializes the
//   file and sets this to its path.
// - Local: falls back to ./google-services.json (gitignored; path set in .env.local).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...(config.android || {}),
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
})
