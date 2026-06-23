import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Newsreader_400Regular, Newsreader_500Medium, Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader'
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
} from '@expo-google-fonts/schibsted-grotesk'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono'

import { AuthProvider } from '@/context/auth'
import { PushBridge } from '@/components/PushBridge'
import { getMissingEnv } from '@/lib/env'
import { initObservability, withObservability } from '@/lib/observability'
import { colors, radius } from '@/lib/theme'

initObservability()
// Hold the native splash until the Concierge Gold fonts are ready (avoids a flash of system-font text).
SplashScreen.preventAutoHideAsync().catch(() => {})

function RootLayout() {
  // Concierge Gold typography — Newsreader (agent voice/titles/prices), Schibsted Grotesk (UI),
  // JetBrains Mono (eyebrows/labels). Loaded at runtime; no native rebuild needed.
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_400Regular_Italic,
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  })
  const fontsReady = fontsLoaded || !!fontError // never hang on a font failure — fall back to system
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {})
  }, [fontsReady])

  // Fail loud at startup: a build missing required config shows a clear screen
  // instead of crashing on the first network/auth call mid-session.
  const missing = getMissingEnv()
  if (missing.length) return <ConfigErrorScreen missing={missing} />

  if (!fontsReady) return null // native splash stays up until fonts resolve

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <PushBridge />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </AuthProvider>
  )
}

export default withObservability(RootLayout)

function ConfigErrorScreen({ missing }: { missing: string[] }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Nexxi</Text>
        <Text style={styles.title}>Configuration error</Text>
        <Text style={styles.body}>
          This build is missing required environment values. Set them in your EAS build profile (or
          .env.local for development) and rebuild.
        </Text>
        <View style={styles.card}>
          {missing.map((key) => (
            <Text key={key} style={styles.missing}>
              • EXPO_PUBLIC_{key.replace(/([A-Z])/g, '_$1').toUpperCase()}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  kicker: {
    color: colors.signal,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2.4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    marginTop: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.35)',
    backgroundColor: 'rgba(251,113,133,0.10)',
    padding: 16,
    gap: 6,
  },
  missing: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
})
