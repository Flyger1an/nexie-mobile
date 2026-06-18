import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { NexieChat } from '@/components/NexieChat'
import { useAuth } from '@/context/auth'
import { colors } from '@/lib/theme'

export default function ChatScreen() {
  const router = useRouter()
  const { session, loading } = useAuth()

  useEffect(() => {
    if (!loading && !session) router.replace('/')
  }, [loading, router, session])

  if (loading || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.signal} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerPills}>
        <Pressable style={styles.pill} onPress={() => router.push('/orders')}>
          <Text style={styles.pillText}>Orders</Text>
        </Pressable>
        <Pressable style={styles.pill} onPress={() => router.push('/settings')}>
          <Text style={styles.pillText}>Settings</Text>
        </Pressable>
      </View>
      <NexieChat />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  headerPills: {
    position: 'absolute',
    zIndex: 2,
    right: 16,
    top: 58,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 12,
  },
})
