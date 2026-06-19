import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { tapHaptic } from '@/lib/haptics'
import { archiveThread, fetchThreads, renameThread } from '@/lib/threads-api'
import { colors, radius } from '@/lib/theme'
import type { NexieThreadSummary } from '@/lib/types'

type ThreadHistoryProps = {
  visible: boolean
  onClose: () => void
  onSelect: (threadId: string) => void
  onNewChat: () => void
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString()
}

export function ThreadHistory({ visible, onClose, onSelect, onNewChat }: ThreadHistoryProps) {
  const { session } = useAuth()
  // null = not loaded yet (drives the spinner without a synchronous effect-body setState).
  const [threads, setThreads] = useState<NexieThreadSummary[] | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    if (!visible || !session || threads !== null) return
    let active = true
    fetchThreads(session)
      .then((t) => {
        if (active) setThreads(t)
      })
      .catch(() => {
        if (active) {
          setThreads([])
          setError('Could not load your conversations.')
        }
      })
    return () => {
      active = false
    }
  }, [visible, session, threads])

  function close() {
    // Reset so the next open refetches (and exits any edit mode).
    setThreads(null)
    setError('')
    setEditingId(null)
    onClose()
  }

  function startRename(thread: NexieThreadSummary) {
    setEditingId(thread.id)
    setEditTitle(thread.title)
  }

  async function saveRename(id: string) {
    const title = editTitle.trim()
    setEditingId(null)
    if (!session || !title) return
    setThreads((current) => (current ? current.map((t) => (t.id === id ? { ...t, title } : t)) : current))
    try {
      await renameThread(session, id, title)
    } catch {
      setError('Rename failed.')
    }
  }

  async function archive(id: string) {
    if (!session) return
    tapHaptic()
    setThreads((current) => (current ? current.filter((t) => t.id !== id) : current))
    try {
      await archiveThread(session, id)
    } catch {
      setError('Archive failed.')
    }
  }

  const loading = threads === null

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} transparent={false}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Conversations</Text>
          <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.newChat}
          onPress={() => {
            tapHaptic()
            onNewChat()
          }}
        >
          <Text style={styles.newChatText}>＋  New chat</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.signal} />
          </View>
        ) : threads && threads.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>Your chats with Nexxi show up here so you can pick any one back up.</Text>
          </View>
        ) : (
          <FlatList
            data={threads ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              editingId === item.id ? (
                <View style={styles.row}>
                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    autoFocus
                    onSubmitEditing={() => saveRename(item.id)}
                    returnKeyType="done"
                    style={styles.editInput}
                  />
                  <Pressable onPress={() => saveRename(item.id)} style={styles.rowAction} accessibilityLabel="Save name">
                    <Text style={styles.saveText}>Save</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.row}>
                  <Pressable style={styles.rowMain} onPress={() => onSelect(item.id)}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowTime}>{relativeTime(item.updatedAt)}</Text>
                  </Pressable>
                  <Pressable onPress={() => startRename(item)} style={styles.rowAction} accessibilityLabel="Rename">
                    <Text style={styles.rowActionText}>✎</Text>
                  </Pressable>
                  <Pressable onPress={() => archive(item.id)} style={styles.rowAction} accessibilityLabel="Archive">
                    <Text style={styles.rowActionText}>✕</Text>
                  </Pressable>
                </View>
              )
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  close: {
    color: colors.signal,
    fontSize: 15,
    fontWeight: '900',
  },
  newChat: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.5)',
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingVertical: 13,
    alignItems: 'center',
  },
  newChatText: {
    color: colors.signal,
    fontSize: 14,
    fontWeight: '900',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowMain: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  rowTime: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
  },
  rowAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowActionText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '900',
  },
  editInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 15,
  },
  saveText: {
    color: colors.signal,
    fontSize: 13,
    fontWeight: '900',
  },
})
