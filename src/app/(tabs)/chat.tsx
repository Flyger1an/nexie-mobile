import { useLocalSearchParams } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { NexieChat } from '@/components/NexieChat'
import { colors } from '@/lib/theme'

export default function ChatScreen() {
  // Discover's "Ask Nexxi" navigates here with a `seed` prompt to prefill the composer.
  const { seed } = useLocalSearchParams<{ seed?: string }>()
  const initialPrompt = typeof seed === 'string' ? seed : undefined

  return (
    <View style={styles.container}>
      <NexieChat initialPrompt={initialPrompt} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
})
