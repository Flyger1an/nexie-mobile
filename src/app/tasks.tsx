import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { errorHaptic, successHaptic, tapHaptic } from '@/lib/haptics'
import { createTask, deleteTask, fetchTasks, setTaskStatus, type AgentTask } from '@/lib/tasks-api'
import { buttonGlass, colors, font, radius } from '@/lib/theme'

/**
 * Agent tasks — standing things the buyer asks Nexxi to keep working on in the background. Nexxi's
 * runner matches each active task against the catalog and pushes when something new fits. Results
 * NOTIFY only — the buyer still approves any purchase in-app. Reached from Profile.
 */
export default function TasksScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    try {
      setTasks(await fetchTasks(session))
      setError('')
    } catch {
      setError('Could not load your tasks.')
    }
  }, [session])

  // Initial load — setState stays inside the promise callbacks (not the effect body).
  useEffect(() => {
    if (!session) return
    let active = true
    fetchTasks(session)
      .then((rows) => {
        if (!active) return
        setTasks(rows)
        setError('')
      })
      .catch(() => {
        if (active) setError('Could not load your tasks.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [session])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const onCreate = useCallback(async () => {
    const prompt = draft.trim().replace(/\s+/g, ' ')
    if (!session || creating || !prompt) return
    tapHaptic()
    setCreating(true)
    setError('')
    try {
      await createTask(session, { prompt })
      setDraft('')
      await load()
      successHaptic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this task.')
      errorHaptic()
    } finally {
      setCreating(false)
    }
  }, [draft, session, creating, load])

  const toggle = useCallback(
    (task: AgentTask) => {
      if (!session) return
      tapHaptic()
      const next = task.status === 'active' ? 'paused' : 'active'
      setTasks((cur) => cur.map((t) => (t.id === task.id ? { ...t, status: next } : t))) // optimistic
      setTaskStatus(session, task.id, next).catch(() => load())
    },
    [session, load],
  )

  const remove = useCallback(
    (id: string) => {
      if (!session) return
      tapHaptic()
      setTasks((cur) => cur.filter((t) => t.id !== id)) // optimistic
      deleteTask(session, id).catch(() => load())
    },
    [session, load],
  )

  const run = useCallback(
    (task: AgentTask) => {
      tapHaptic()
      router.navigate({ pathname: '/discover', params: { q: task.query || task.prompt } })
    },
    [router],
  )

  const header = (
    <View>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>AGENT TASKS</Text>
        <Text accessibilityRole="header" style={styles.title}>Working for you</Text>
        <Text style={styles.sub}>
          Tell Nexxi what to keep an eye out for. It searches in the background and alerts you when
          something new fits — it never buys without your go-ahead.
        </Text>
      </View>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={onCreate}
          returnKeyType="done"
          placeholder="e.g. a wedding photographer under $2,500"
          placeholderTextColor={colors.text3}
          accessibilityLabel="Describe a task for Nexxi"
          style={styles.input}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create task"
          accessibilityState={{ disabled: !draft.trim() || creating, busy: creating }}
          disabled={!draft.trim() || creating}
          style={[buttonGlass.base, !draft.trim() || creating ? buttonGlass.disabled : null]}
          onPress={onCreate}
        >
          {creating ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={buttonGlass.label}>Add task</Text>
          )}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {tasks.length ? <Text style={styles.listEyebrow}>STANDING TASKS</Text> : null}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>Agent tasks</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.empty}>No active tasks yet. Add one above and Nexxi will watch for matches.</Text>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const meta = [item.category, item.status === 'paused' ? 'Paused' : 'Alerts on'].filter(Boolean).join(' · ')
            return (
              <View style={[styles.row, item.status === 'paused' ? styles.rowPaused : null]}>
                <Pressable
                  style={styles.rowTap}
                  onPress={() => run(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Search now for ${item.prompt}`}
                >
                  <View style={[styles.dot, item.status === 'paused' ? styles.dotOff : null]} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={2}>{item.prompt}</Text>
                    <Text style={styles.rowMeta}>{meta}</Text>
                  </View>
                </Pressable>
                <View style={styles.rowActions}>
                  <Switch
                    value={item.status === 'active'}
                    onValueChange={() => toggle(item)}
                    accessibilityLabel={`${item.status === 'active' ? 'Pause' : 'Resume'} task ${item.prompt}`}
                    trackColor={{ false: colors.panel2, true: colors.accent }}
                    thumbColor={colors.text}
                  />
                  <Pressable onPress={() => remove(item.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove task ${item.prompt}`}>
                    <Text style={styles.removeGlyph}>✕</Text>
                  </Pressable>
                </View>
              </View>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },
  topTitle: { flex: 1, color: colors.text2, fontFamily: font.sans600, fontSize: 14, textAlign: 'center' },

  list: { paddingHorizontal: 18, paddingBottom: 32, gap: 10 },
  head: { gap: 6, marginBottom: 14 },
  eyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: font.serif, fontSize: 30, lineHeight: 32, letterSpacing: -0.3 },
  sub: { color: colors.text2, fontFamily: font.sans400, fontSize: 13, lineHeight: 19, marginTop: 2 },

  composer: { gap: 10, marginBottom: 18 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
    fontFamily: font.sans,
    fontSize: 15,
    lineHeight: 21,
  },
  error: { color: colors.danger, fontFamily: font.sans, fontSize: 13, marginBottom: 8 },

  listEyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.3, marginBottom: 8 },
  empty: { color: colors.text3, fontFamily: font.sans, fontSize: 13, lineHeight: 19, paddingTop: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.sheen,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  rowPaused: { opacity: 0.6 },
  rowTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.accent, marginTop: 1 },
  dotOff: { backgroundColor: colors.text3 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontFamily: font.sans600, fontSize: 14, lineHeight: 19 },
  rowMeta: { color: colors.text3, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  removeGlyph: { color: colors.text3, fontSize: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
})
