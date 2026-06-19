import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { NexieChat } from '@/components/NexieChat'
import { ThreadHistory } from '@/components/ThreadHistory'
import { colors } from '@/lib/theme'

export default function ChatScreen() {
  // Discover's "Ask Nexxi" navigates here with a `seed` prompt to prefill the composer.
  const { seed } = useLocalSearchParams<{ seed?: string }>()
  const initialPrompt = typeof seed === 'string' ? seed : undefined

  // The screen owns the active conversation; NexieChat remounts (via `key`) on switch.
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined)
  const [remountKey, setRemountKey] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)

  function resume(threadId: string) {
    setActiveThreadId(threadId)
    setRemountKey((k) => k + 1)
    setHistoryOpen(false)
  }

  function newChat() {
    setActiveThreadId(undefined)
    setRemountKey((k) => k + 1)
    setHistoryOpen(false)
  }

  return (
    <View style={styles.container}>
      <NexieChat
        key={remountKey}
        resumeThreadId={activeThreadId}
        // Don't carry a stale Discover seed into a resumed conversation.
        initialPrompt={activeThreadId ? undefined : initialPrompt}
        onOpenHistory={() => setHistoryOpen(true)}
        onNewChat={newChat}
      />
      <ThreadHistory
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={resume}
        onNewChat={newChat}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
})
