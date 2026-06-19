// Dynamic config layered on top of app.json. Its only job: inject the Android FCM
// google-services.json path from an env var so the file (which carries Firebase
// project config) is NEVER committed to this public repo.
//
// - EAS builds: GOOGLE_SERVICES_JSON is an EAS "file" env var → EAS materializes the
//   file and sets this to its path.
// - Local: falls back to ./google-services.json (gitignored; path set in .env.local).
module.exports = ({ config }) => {
  const plugins = [...(config.plugins || [])]

  // Google Sign-In needs the iOS reversed-client-id URL scheme (a credential) wired into the
  // native build. It's injected from env so it's NEVER committed; absent → the plugin is skipped
  // and the Google button stays hidden (see lib/social-auth.ts), so builds work without it.
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
  if (googleIosUrlScheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }])
  }

  return {
    ...config,
    plugins,
    android: {
      ...(config.android || {}),
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  }
}
