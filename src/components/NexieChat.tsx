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
import { sendNexieTurn } from '@/lib/nexie-api'
import { errorHaptic, successHaptic, tapHaptic } from '@/lib/haptics'
import { speak, stopSpeaking } from '@/lib/speech'
import { colors, radius } from '@/lib/theme'
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
      .then((p) => {
        if (p.voiceRepliesDefault) setSpeakEnabled(true)
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
    setError('')
    tapHaptic()
    stopSpeaking()
    setMessages((current) => [...current, { id: cryptoId(), role: 'user', content: message }])

    try {
      const result = await sendNexieTurn({
        session,
        threadId,
        message,
        mode,
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
      if (mode === 'voice' || speakEnabled) speak(result.message)
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Nexxi could not respond.'
      setError(messageText)
      errorHaptic()
      setMessages((current) => [...current, { id: cryptoId(), role: 'assistant', content: messageText }])
    } finally {
      setBusy(false)
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
          <View>
            <Text style={styles.kicker}>Nexxi mobile</Text>
            <Text style={styles.title}>Your personal buyer agent</Text>
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
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                {item.role === 'assistant' ? <Text style={styles.assistantLabel}>Nexxi</Text> : null}
                <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>{item.content}</Text>
              </View>
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
              {busy ? (
                <View style={styles.thinking}>
                  <ActivityIndicator color={colors.signal} />
                  <Text style={styles.thinkingText}>Nexxi is working...</Text>
                </View>
              ) : null}
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {messages.length === 1 ? (
          <View style={styles.starters}>
            {starters.map((starter) => (
              <Pressable
                key={starter}
                accessibilityRole="button"
                accessibilityLabel={starter}
                style={styles.starter}
                onPress={() => submit(starter)}
              >
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
            placeholder="Ask Nexxi to find, negotiate, or book..."
            placeholderTextColor={colors.faint}
            accessibilityLabel="Message Nexxi"
            style={styles.input}
          />
          <Pressable
            disabled={busy || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: busy || !input.trim() }}
            style={[styles.send, busy || !input.trim() ? styles.sendDisabled : null]}
            onPress={() => submit()}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>Nexxi asks before submitting offers or opening checkout.</Text>
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
  kicker: {
    color: colors.signal,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.9,
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
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  speakToggleOn: {
    borderColor: 'rgba(45,212,191,0.5)',
    backgroundColor: 'rgba(45,212,191,0.14)',
  },
  speakToggleText: {
    fontSize: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  iconBtnText: {
    fontSize: 16,
    color: colors.text,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.signal,
  },
  liveText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    gap: 16,
    paddingTop: 6,
    paddingBottom: 18,
  },
  messageWrap: {
    gap: 10,
  },
  userWrap: {
    alignItems: 'flex-end',
  },
  assistantWrap: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: radius.lg,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.text,
    borderBottomRightRadius: 8,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 8,
  },
  assistantLabel: {
    color: colors.signal,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: '#050507',
    fontWeight: '700',
  },
  assistantText: {
    color: colors.text,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  thinkingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  starters: {
    gap: 8,
    marginBottom: 10,
  },
  starter: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  starterText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    marginBottom: 8,
    fontSize: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 116,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingVertical: 13,
  },
  send: {
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.signal,
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendText: {
    color: '#001313',
    fontWeight: '900',
    fontSize: 13,
  },
  disclaimer: {
    color: colors.faint,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 5,
    textAlign: 'center',
  },
})
