import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { colors, radius } from '@/lib/theme'

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Nexie uses your Nexez account and keeps buyer memory scoped to you.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email ?? 'Unknown account'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Voice input</Text>
          <Text style={styles.body}>Speech recognition runs through native iOS/Android permissions. You can type anytime.</Text>
        </View>

        <Pressable style={styles.signOut} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  back: {
    color: colors.signal,
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.8,
    marginTop: 10,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 16,
    gap: 6,
  },
  label: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  signOut: {
    marginTop: 'auto',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.35)',
    backgroundColor: 'rgba(251,113,133,0.10)',
    alignItems: 'center',
    paddingVertical: 15,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
})
