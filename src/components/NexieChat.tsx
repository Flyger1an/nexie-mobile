import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { fetchPreferences } from '@/lib/preferences-api'
import { fetchThreadMessages } from '@/lib/threads-api'
import { sendNexieTurn, streamNexieTurn } from '@/lib/nexie-api'
import { errorHaptic, successHaptic, tapHaptic } from '@/lib/haptics'
import { createIncrementalSpeaker, speak, stopSpeaking } from '@/lib/speech'
import { buttonGlass, colors, font, radius } from '@/lib/theme'
import type { NexieCard, NexieMessage, NexieMode } from '@/lib/types'

import { ActionResultCard } from './ActionResultCard'
import { ApprovalCard } from './ApprovalCard'
import { OfferCard } from './OfferCard'
import { VoiceButton } from './VoiceButton'

const starters = [
  'Find a web design expert for a dentist office',
  'Negotiate a strategy call under $300 next week',
  'Find the best AI-ready service for a product launch',
]

const WELCOME: NexieMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'I am Nexxi. Tell me what you want to buy, book, or negotiate, and I will search the agent-ready web for you.',
}

type NexieChatProps = {
  initialPrompt?: string
  /** When set, the chat resumes this past conversation (loads its messages on mount). */
  resumeThreadId?: string
  onOpenHistory?: () => void
  onNewChat?: () => void
}

export function NexieChat({ initialPrompt, resumeThreadId, onOpenHistory, onNewChat }: NexieChatProps = {}) {
  const { session } = useAuth()
  const [threadId, setThreadId] = useState<string | undefined>(resumeThreadId)
  const [input, setInput] = useState('')
  const [appliedSeed, setAppliedSeed] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  // True only during a streamed chat turn (which renders its own inline placeholder bubble), so the
  // list footer indicator is reserved for the non-streamed approval path.
  const [streamingTurn, setStreamingTurn] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<NexieMessage[]>(resumeThreadId ? [] : [WELCOME])
  const [speakEnabled, setSpeakEnabled] = useState(false)
  const listRef = useRef<FlatList<NexieMessage>>(null)
  const voiceInitRef = useRef(false)
  const threadLoadRef = useRef(false)

  // Honor the buyer's "speak replies by default" preference, once on mount (best-effort:
  // setState lives in the promise callback, never the synchronous effect body).
  useEffect(() => {
    if (!session || voiceInitRef.current) return
    voiceInitRef.current = true
    fetchPreferences(session)
      .then(({ preferences }) => {
        if (preferences.voiceRepliesDefault) setSpeakEnabled(true)
      })
      .catch(() => {})
  }, [session])

  // Resume a past conversation: load its messages once on mount when one is selected.
  // (The chat screen remounts NexieChat per thread via `key`, so this runs fresh each time.)
  useEffect(() => {
    if (!session || !resumeThreadId || threadLoadRef.current) return
    threadLoadRef.current = true
    fetchThreadMessages(session, resumeThreadId)
      .then((detail) => {
        setMessages(detail.messages.length ? detail.messages : [WELCOME])
        setThreadId(detail.threadId)
      })
      .catch(() => {
        setMessages([WELCOME])
        setError('Could not load that conversation — starting fresh.')
      })
  }, [session, resumeThreadId])

  // Adjust state when the seed prop changes (Discover -> "Ask Nexxi"): prefill the
  // composer once per distinct seed. Render-phase setState is React's recommended
  // alternative to an effect here, and it keeps the live thread/history intact.
  if (initialPrompt && initialPrompt !== appliedSeed) {
    setAppliedSeed(initialPrompt)
    setInput(initialPrompt)
  }

  async function submit(text = input, mode: NexieMode = 'text') {
    const message = text.trim()
    if (!message || busy || !session) return

    setInput('')
    setBusy(true)
    setStreamingTurn(true)
    setError('')
    tapHaptic()
    stopSpeaking()

    // Add the user bubble + an empty assistant bubble we fill as tokens stream in.
    const assistantId = cryptoId()
    setMessages((current) => [
      ...current,
      { id: cryptoId(), role: 'user', content: message },
      { id: assistantId, role: 'assistant', content: '' },
    ])
    const speaker = mode === 'voice' || speakEnabled ? createIncrementalSpeaker() : null
    let streamed = ''

    try {
      const result = await streamNexieTurn(
        { session, threadId, message, mode },
        {
          onToken: (delta) => {
            streamed += delta
            setMessages((current) => current.map((m) => (m.id === assistantId ? { ...m, content: streamed } : m)))
            speaker?.push(delta)
          },
        },
      )
      setThreadId(result.threadId)
      // done.message is authoritative — reconcile the bubble (drops any pre-tool preamble) + attach cards.
      setMessages((current) =>
        current.map((m) => (m.id === assistantId ? { ...m, content: result.message, cards: result.cards } : m)),
      )
      if (result.cards?.some((c) => c.type === 'action_result' && c.status === 'success')) successHaptic()
      if (speaker) {
        if (!streamed) speaker.push(result.message) // defensive: voice the reply if nothing streamed
        speaker.flush()
      }
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Nexxi could not respond.'
      setError(messageText)
      errorHaptic()
      speaker?.cancel()
      setMessages((current) => current.map((m) => (m.id === assistantId ? { ...m, content: messageText } : m)))
    } finally {
      setBusy(false)
      setStreamingTurn(false)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
    }
  }

  async function decide(approvalId: string, decision: 'approved' | 'rejected') {
    if (!session || busy) return

    setBusy(true)
    setError('')
    stopSpeaking()
    try {
      const result = await sendNexieTurn({
        session,
        threadId,
        approval: { id: approvalId, decision },
      })
      setThreadId(result.threadId)
      setMessages((current) => [
        ...current,
        {
          id: cryptoId(),
          role: 'assistant',
          content: result.message,
          cards: result.cards,
        },
      ])
      if (result.cards?.some((c) => c.type === 'action_result' && c.status === 'success')) successHaptic()
      if (speakEnabled) speak(result.message)
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Nexxi could not update that approval.'
      setError(messageText)
      errorHaptic()
      setMessages((current) => [...current, { id: cryptoId(), role: 'assistant', content: messageText }])
    } finally {
      setBusy(false)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
    }
  }

  function handleTranscript(text: string, final: boolean) {
    setInput(text)
    if (final && text.trim()) {
      submit(text, 'voice')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.header}>
          <View style={styles.wordmarkRow}>
            <Text accessibilityRole="header" style={styles.wordmark}>nexxi</Text>
            <View style={styles.wordmarkDot} />
          </View>
          <View style={styles.headerRight}>
            {onNewChat ? (
              <Pressable
                onPress={() => {
                  tapHaptic()
                  onNewChat()
                }}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="New chat"
              >
                <Text style={styles.iconBtnText}>＋</Text>
              </Pressable>
            ) : null}
            {onOpenHistory ? (
              <Pressable
                onPress={() => {
                  tapHaptic()
                  onOpenHistory()
                }}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Conversation history"
              >
                <Text style={styles.iconBtnText}>🕘</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                tapHaptic()
                const next = !speakEnabled
                setSpeakEnabled(next)
                if (!next) stopSpeaking()
              }}
              style={[styles.speakToggle, speakEnabled ? styles.speakToggleOn : null]}
              accessibilityRole="button"
              accessibilityLabel={speakEnabled ? 'Turn off spoken replies' : 'Turn on spoken replies'}
            >
              <Text style={styles.speakToggleText}>{speakEnabled ? '🔊' : '🔇'}</Text>
            </Pressable>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.messageWrap, item.role === 'user' ? styles.userWrap : styles.assistantWrap]}>
              {item.role === 'user' ? (
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{item.content}</Text>
                </View>
              ) : (
                <View style={styles.assistantReply}>
                  <Text style={styles.assistantLabel}>NEXXI</Text>
                  {!item.content ? (
                    <View style={styles.thinking}>
                      <ActivityIndicator color={colors.accent} />
                      <Text style={styles.thinkingText}>Nexxi is working…</Text>
                    </View>
                  ) : (
                    <Text style={styles.assistantText}>{item.content}</Text>
                  )}
                </View>
              )}
              {item.cards?.length ? (
                <View style={styles.cards}>
                  {item.cards.map((card) => (
                    <CardRenderer
                      key={`${card.type}-${card.id}`}
                      card={card}
                      disabled={busy}
                      onDecision={decide}
                      onAct={(message) => submit(message)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          )}
          ListFooterComponent={
            <View style={styles.footerSpace}>
              {/* Only for non-streamed turns (e.g. approval decisions); streamed chat turns show
                  the indicator inside their own assistant bubble the whole time. */}
              {busy && !streamingTurn ? (
                <View style={styles.thinking}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.thinkingText}>Nexxi is working…</Text>
                </View>
              ) : null}
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {messages.length === 1 ? (
          <View style={styles.starters}>
            <Text style={styles.startersLabel}>Try asking</Text>
            {starters.map((starter, index) => (
              <Pressable
                key={starter}
                accessibilityRole="button"
                accessibilityLabel={starter}
                style={[styles.starter, index > 0 ? styles.starterDivider : null]}
                onPress={() => submit(starter)}
              >
                <Text style={styles.starterArrow}>→</Text>
                <Text style={styles.starterText}>{starter}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.composer}>
          <VoiceButton disabled={busy} onTranscript={handleTranscript} />
          <TextInput
            value={input}
            onChangeText={setInput}
            multiline
            placeholder="Ask Nexxi to find, negotiate, or book…"
            placeholderTextColor={colors.text3}
            accessibilityLabel="Message Nexxi"
            style={styles.input}
          />
          <Pressable
            disabled={busy || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: busy || !input.trim() }}
            style={[buttonGlass.base, styles.send, busy || !input.trim() ? buttonGlass.disabled : null]}
            onPress={() => submit()}
          >
            <Text style={[buttonGlass.label, busy || !input.trim() ? buttonGlass.disabledLabel : null]}>Send</Text>
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>Nexxi can make mistakes — and always asks before submitting offers or opening checkout.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function CardRenderer({
  card,
  disabled,
  onDecision,
  onAct,
}: {
  card: NexieCard
  disabled: boolean
  onDecision: (approvalId: string, decision: 'approved' | 'rejected') => void
  onAct: (message: string) => void
}) {
  if (card.type === 'page_result') {
    return <OfferCard card={card} onBook={onAct} onNegotiate={onAct} disabled={disabled} />
  }
  if (card.type === 'approval') {
    return <ApprovalCard card={card} disabled={disabled} onDecision={onDecision} />
  }
  return <ActionResultCard card={card} />
}

function cryptoId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 22,
    lineHeight: 26,
  },
  wordmarkDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speakToggle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  speakToggleOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  speakToggleText: {
    fontSize: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  iconBtnText: {
    fontSize: 16,
    color: colors.text,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  liveText: {
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 12,
  },
  listContent: {
    gap: 18,
    paddingTop: 6,
    paddingBottom: 18,
  },
  messageWrap: {
    gap: 12,
  },
  userWrap: {
    alignItems: 'flex-end',
  },
  assistantWrap: {
    alignItems: 'flex-start',
  },
  userBubble: {
    maxWidth: '86%',
    backgroundColor: colors.text,
    borderRadius: 15,
    borderBottomRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  userText: {
    color: colors.onAccent,
    fontFamily: font.sans,
    fontSize: 14.5,
    lineHeight: 21,
  },
  assistantReply: {
    maxWidth: '92%',
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
  },
  assistantLabel: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  assistantText: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 16.5,
    lineHeight: 23,
  },
  cards: {
    width: '100%',
    gap: 12,
  },
  footerSpace: {
    minHeight: 12,
  },
  thinking: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  thinkingText: {
    color: colors.text2,
    fontFamily: font.serif,
    fontSize: 15.5,
  },
  starters: {
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
  },
  startersLabel: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  starter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  starterDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  starterArrow: {
    color: colors.accent,
    fontFamily: font.serif,
    fontSize: 18,
    lineHeight: 20,
  },
  starterText: {
    flex: 1,
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontFamily: font.sans,
    marginBottom: 8,
    fontSize: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.sheen, // glass-sheen inset highlight
    borderRadius: 16,
    backgroundColor: colors.panel,
    padding: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 116,
    color: colors.text,
    fontFamily: font.sans,
    fontSize: 14.5,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingVertical: 13,
  },
  // Glass + persimmon-ring Send (container/ring from buttonGlass.base; this just pins the
  // composer-row height so it sits flush with the 48px input + mic).
  send: {
    height: 48,
    minHeight: 48,
  },
  disclaimer: {
    color: colors.text3,
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 5,
    textAlign: 'center',
  },
})
