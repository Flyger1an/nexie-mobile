// Metro configuration — https://docs.expo.dev/guides/customizing-metro/
//
// getSentryExpoConfig wraps Expo's default Metro config and adds the Sentry
// serializer that stamps Debug IDs into bundles + source maps, so symbolicated
// (readable) stack traces line up with each release. Source maps upload during
// EAS native builds when SENTRY_AUTH_TOKEN is set and the @sentry/react-native
// config plugin (organization/project in app.json) is configured.
const { getSentryExpoConfig } = require('@sentry/react-native/metro')

const config = getSentryExpoConfig(__dirname)

module.exports = config
