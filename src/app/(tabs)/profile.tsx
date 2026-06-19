import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { errorHaptic, tapHaptic, successHaptic } from '@/lib/haptics'
import { deleteAccount } from '@/lib/account-api'
import { fetchPreferences, updatePreferences } from '@/lib/preferences-api'
import { colors, radius } from '@/lib/theme'
import type { NexieAvailableSource, NexiePreferences, NexieTiming } from '@/lib/types'

const TIMING_OPTIONS: { label: string; value: NexieTiming | null }[] = [
  { label: 'Any', value: null },
  { label: 'Flexible', value: 'flexible' },
  { label: 'This week', value: 'this_week' },
  { label: 'ASAP', value: 'asap' },
]

const MAX_CATEGORIES = 12

export default function ProfileScreen() {
  const router = useRouter()
  const { user, session, signOut } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Editable fields.
  const [budgetText, setBudgetText] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [timing, setTiming] = useState<NexieTiming | null>(null)
  const [location, setLocation] = useState('')
  const [voiceDefault, setVoiceDefault] = useState(false)
  const [notifications, setNotifications] = useState(true)
  // Search sources: `sources` is the buyer's selection (null = all available); availableSources is
  // what's actually configured server-side (always includes the core Nexez source).
  const [sources, setSources] = useState<string[] | null>(null)
  const [availableSources, setAvailableSources] = useState<NexieAvailableSource[]>([])

  function applyPrefs(p: NexiePreferences) {
    setBudgetText(p.budgetMax != null ? String(p.budgetMax) : '')
    setCurrency(p.currency || 'USD')
    setCategories(p.categories ?? [])
    setTiming(p.timing)
    setLocation(p.location ?? '')
    setVoiceDefault(p.voiceRepliesDefault)
    setNotifications(p.notificationsEnabled)
    setSources(p.sources)
  }

  // A source is on when there's no explicit selection (null = all) or it's in the list. The core
  // Nexez source is always on. Toggling materializes the current set then adds/removes the id.
  const externalIds = availableSources.filter((s) => !s.core).map((s) => s.id)
  const isSourceOn = (id: string) => sources === null || sources.includes(id)
  function toggleSource(id: string) {
    tapHaptic()
    const current = sources === null ? externalIds : sources
    const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
    setSources(next)
    setSaved(false)
  }

  // Initial load. setState stays inside the promise callbacks (not the effect body).
  useEffect(() => {
    if (!session) return
    let active = true
    fetchPreferences(session)
      .then(({ preferences, availableSources: avail }) => {
        if (!active) return
        applyPrefs(preferences)
        setAvailableSources(avail)
      })
      .catch(() => {
        // Soft-fail: keep the editable defaults so the user can still set + save.
        if (active) setError('Could not load your saved preferences — you can still set them below.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [session])

  const markDirty = useCallback(() => {
    if (saved) setSaved(false)
  }, [saved])

  function addCategory() {
    const value = newCategory.trim().replace(/\s+/g, ' ')
    if (!value) return
    const exists = categories.some((c) => c.toLowerCase() === value.toLowerCase())
    if (exists || categories.length >= MAX_CATEGORIES) {
      setNewCategory('')
      return
    }
    tapHaptic()
    setCategories((current) => [...current, value])
    setNewCategory('')
    markDirty()
  }

  function removeCategory(value: string) {
    tapHaptic()
    setCategories((current) => current.filter((c) => c !== value))
    markDirty()
  }

  const onSave = useCallback(async () => {
    if (!session || saving) return
    tapHaptic()
    setSaving(true)
    setError('')
    const budgetNum = Number.parseFloat(budgetText.replace(/[^0-9.]/g, ''))
    const preferences: NexiePreferences = {
      budgetMax: Number.isFinite(budgetNum) && budgetNum > 0 ? budgetNum : null,
      currency: currency.trim().toUpperCase() || 'USD',
      categories,
      timing,
      location: location.trim() || null,
      voiceRepliesDefault: voiceDefault,
      notificationsEnabled: notifications,
      sources,
    }
    try {
      const stored = await updatePreferences(session, preferences)
      applyPrefs(stored) // reflect server-side normalization (clamps, dedupe)
      setSaved(true)
      successHaptic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your preferences.')
    } finally {
      setSaving(false)
    }
  }, [budgetText, categories, currency, location, notifications, saving, session, sources, timing, voiceDefault])

  async function handleSignOut() {
    await signOut()
    router.replace('/')
  }

  // Account deletion (App Store requirement): gated on typing DELETE, then a hard server-side
  // wipe of the account + all data, then sign out.
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const canDelete = confirmText.trim().toUpperCase() === 'DELETE'

  async function handleDeleteAccount() {
    if (!session || deleting || !canDelete) return
    tapHaptic()
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount(session)
      await signOut()
      router.replace('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete your account. Try again or contact support.')
      errorHaptic()
      setDeleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Nexxi uses your Nexez account and keeps buyer memory scoped to you.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email ?? 'Unknown account'}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Buyer preferences</Text>
          <Text style={styles.sectionHint}>Nexxi honors these every time it searches and negotiates for you.</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.signal} />
          </View>
        ) : (
          <>
            {/* Budget */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Budget ceiling</Text>
              <View style={styles.budgetRow}>
                <TextInput
                  value={budgetText}
                  onChangeText={(t) => {
                    setBudgetText(t)
                    markDirty()
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Any"
                  placeholderTextColor={colors.faint}
                  accessibilityLabel="Budget ceiling amount"
                  style={[styles.input, styles.budgetInput]}
                />
                <TextInput
                  value={currency}
                  onChangeText={(t) => {
                    setCurrency(t.toUpperCase().slice(0, 3))
                    markDirty()
                  }}
                  autoCapitalize="characters"
                  maxLength={3}
                  placeholder="USD"
                  placeholderTextColor={colors.faint}
                  accessibilityLabel="Currency code"
                  style={[styles.input, styles.currencyInput]}
                />
              </View>
              <Text style={styles.fieldHint}>Soft guidance — Nexxi confirms before exceeding it.</Text>
            </View>

            {/* Interests / categories */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Interests</Text>
              {categories.length ? (
                <View style={styles.chips}>
                  {categories.map((cat) => (
                    <Pressable key={cat} style={styles.chip} onPress={() => removeCategory(cat)} accessibilityLabel={`Remove ${cat}`}>
                      <Text style={styles.chipText}>{cat}</Text>
                      <Text style={styles.chipX}>✕</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={styles.budgetRow}>
                <TextInput
                  value={newCategory}
                  onChangeText={setNewCategory}
                  onSubmitEditing={addCategory}
                  returnKeyType="done"
                  placeholder="e.g. cleaning, web design"
                  placeholderTextColor={colors.faint}
                  accessibilityLabel="Add an interest"
                  style={[styles.input, styles.flex1]}
                />
                <Pressable
                  onPress={addCategory}
                  disabled={!newCategory.trim() || categories.length >= MAX_CATEGORIES}
                  accessibilityRole="button"
                  accessibilityLabel="Add interest"
                  style={[styles.addBtn, !newCategory.trim() || categories.length >= MAX_CATEGORIES ? styles.disabled : null]}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Timing */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Timing</Text>
              <View style={styles.segment}>
                {TIMING_OPTIONS.map((opt) => {
                  const active = timing === opt.value
                  return (
                    <Pressable
                      key={opt.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Timing: ${opt.label}`}
                      onPress={() => {
                        tapHaptic()
                        setTiming(opt.value)
                        markDirty()
                      }}
                      style={[styles.segmentBtn, active ? styles.segmentActive : null]}
                    >
                      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{opt.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* Location */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                value={location}
                onChangeText={(t) => {
                  setLocation(t)
                  markDirty()
                }}
                placeholder="City or area"
                placeholderTextColor={colors.faint}
                accessibilityLabel="Location"
                style={styles.input}
              />
            </View>

            {/* Voice default */}
            <View style={[styles.field, styles.switchRow]}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Speak replies by default</Text>
                <Text style={styles.fieldHint}>Start each chat with spoken replies on.</Text>
              </View>
              <Switch
                value={voiceDefault}
                onValueChange={(v) => {
                  setVoiceDefault(v)
                  markDirty()
                }}
                accessibilityLabel="Speak replies by default"
                trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(45,212,191,0.6)' }}
                thumbColor={voiceDefault ? colors.signal : '#f4f3f4'}
              />
            </View>

            {/* Notifications */}
            <View style={[styles.field, styles.switchRow]}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Push notifications</Text>
                <Text style={styles.fieldHint}>Seller replies, booking confirmations, and refunds.</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={(v) => {
                  setNotifications(v)
                  markDirty()
                }}
                accessibilityLabel="Push notifications"
                trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(45,212,191,0.6)' }}
                thumbColor={notifications ? colors.signal : '#f4f3f4'}
              />
            </View>

            {/* Search sources */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Search sources</Text>
              <Text style={styles.fieldHint}>Nexez offers are bookable. Other sources add discovery results you can view.</Text>
              {availableSources.map((src) => (
                <View key={src.id} style={styles.sourceRow}>
                  <Text style={styles.sourceLabel}>{src.label}</Text>
                  {src.core ? (
                    <Text style={styles.sourceCore}>Always on</Text>
                  ) : (
                    <Switch
                      value={isSourceOn(src.id)}
                      onValueChange={() => toggleSource(src.id)}
                      accessibilityLabel={`Include ${src.label} in search results`}
                      trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(45,212,191,0.6)' }}
                      thumbColor={isSourceOn(src.id) ? colors.signal : '#f4f3f4'}
                    />
                  )}
                </View>
              ))}
              {externalIds.length === 0 ? (
                <Text style={styles.fieldHint}>More discovery sources appear here once they’re connected.</Text>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save preferences"
              accessibilityState={{ disabled: saving, busy: saving }}
              style={[styles.save, saving ? styles.disabled : null]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#001313" />
              ) : (
                <Text style={styles.saveText}>{saved ? 'Saved ✓' : 'Save preferences'}</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" style={styles.signOut} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        {/* Danger zone — in-app account deletion (App Store requirement) */}
        <View style={styles.dangerZone}>
          <Text accessibilityRole="header" style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.dangerHint}>
            Permanently deletes your Nexez account and all associated data — chats, preferences, orders, and any seller pages. This can’t be undone.
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Type DELETE to confirm"
            placeholderTextColor={colors.faint}
            accessibilityLabel="Type DELETE to confirm account deletion"
            style={[styles.input, styles.dangerInput]}
          />
          {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Permanently delete account"
            accessibilityState={{ disabled: !canDelete || deleting, busy: deleting }}
            disabled={!canDelete || deleting}
            style={[styles.deleteBtn, !canDelete || deleting ? styles.disabled : null]}
            onPress={handleDeleteAccount}
          >
            {deleting ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <Text style={styles.deleteBtnText}>Permanently delete account</Text>
            )}
          </Pressable>
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
    padding: 20,
    paddingTop: 8,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.8,
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
  sectionHeader: {
    marginTop: 6,
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  loading: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  fieldHint: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 9,
  },
  budgetInput: {
    flex: 1,
  },
  currencyInput: {
    width: 88,
    textAlign: 'center',
    fontWeight: '800',
  },
  flex1: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.5)',
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  chipX: {
    color: colors.signal,
    fontSize: 12,
    fontWeight: '900',
  },
  addBtn: {
    borderRadius: radius.md,
    backgroundColor: colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  addBtnText: {
    color: '#001313',
    fontSize: 14,
    fontWeight: '900',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: colors.text,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 12,
  },
  segmentTextActive: {
    color: '#050507',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  sourceLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sourceCore: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  save: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveText: {
    color: '#001313',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  signOut: {
    marginTop: 12,
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
  dangerZone: {
    marginTop: 28,
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.3)',
    backgroundColor: 'rgba(251,113,133,0.06)',
    padding: 16,
  },
  dangerTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  dangerHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  dangerInput: {
    borderColor: 'rgba(251,113,133,0.4)',
  },
  deleteBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
  },
})
