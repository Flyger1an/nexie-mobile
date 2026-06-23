import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { errorHaptic, tapHaptic, successHaptic } from '@/lib/haptics'
import { deleteAccount, exportAccount } from '@/lib/account-api'
import { fetchPreferences, updatePreferences } from '@/lib/preferences-api'
import { buttonGlass, cardShadow, colors, font, glass, radius } from '@/lib/theme'
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

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  async function handleExport() {
    if (!session || exporting) return
    tapHaptic()
    setExporting(true)
    setExportError('')
    try {
      const json = await exportAccount(session)
      await Share.share({ message: json, title: 'Your Nexxi data export' })
      successHaptic()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export your data. Try again.')
      errorHaptic()
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    if (!session || deleting || !canDelete) return
    tapHaptic()
    setDeleting(true)
    setDeleteError('')
    try {
      const { sellerRetained } = await deleteAccount(session)
      const finish = async () => {
        await signOut()
        router.replace('/')
      }
      if (sellerRetained) {
        // Same login also sells on Nexez — buyer data cleared, seller account + login kept.
        Alert.alert(
          'Buyer data deleted',
          'Your Nexxi buyer data was removed. Your Nexez seller account and login are separate and were not affected — manage them at nexez.app.',
          [{ text: 'OK', onPress: finish }],
        )
      } else {
        await finish()
      }
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
          <Text style={styles.eyebrow}>SIGNED IN AS</Text>
          <Text style={styles.value}>{user?.email ?? 'Unknown account'}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>BUYER PREFERENCES</Text>
          <Text style={styles.sectionHint}>Nexxi honors these every time it searches and negotiates for you.</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
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
                  placeholderTextColor={colors.text3}
                  accessibilityLabel="Budget ceiling amount"
                  style={[styles.input, styles.budgetInput]}
                />
                <View style={styles.currencyBox}>
                  <TextInput
                    value={currency}
                    onChangeText={(t) => {
                      setCurrency(t.toUpperCase().slice(0, 3))
                      markDirty()
                    }}
                    autoCapitalize="characters"
                    maxLength={3}
                    placeholder="USD"
                    placeholderTextColor={colors.text3}
                    accessibilityLabel="Currency code"
                    style={styles.currencyInput}
                  />
                </View>
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
                  placeholderTextColor={colors.text3}
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
                placeholderTextColor={colors.text3}
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
                trackColor={{ false: colors.panel2, true: colors.accent }}
                thumbColor={colors.text}
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
                trackColor={{ false: colors.panel2, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>

            {/* Search sources */}
            <View style={styles.field}>
              <Text style={styles.sectionEyebrow}>SEARCH SOURCES</Text>
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
                      trackColor={{ false: colors.panel2, true: colors.accent }}
                      thumbColor={colors.text}
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
              style={[buttonGlass.base, styles.save, saving ? buttonGlass.disabled : null]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={[buttonGlass.label, styles.saveText]}>{saved ? 'Saved ✓' : 'Save preferences'}</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" style={styles.signOut} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        {/* Safety & buyer protection (App Store agent-safety + dispute disclosure) */}
        <View style={styles.safetyNote}>
          <Text accessibilityRole="header" style={styles.safetyTitle}>Safety & buyer protection</Text>
          <Text style={styles.safetyBody}>
            Nexxi is an AI buyer assistant — it can make mistakes, so review important details before you
            approve. It doesn&apos;t provide medical, financial, or legal advice.
          </Text>
          <Text style={styles.safetyBody}>
            You can request a refund or report a problem on any order from the Orders tab.
          </Text>
        </View>

        {/* Legal */}
        <View style={styles.legalRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            onPress={() => WebBrowser.openBrowserAsync('https://nexez.ai/privacy')}
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
            onPress={() => WebBrowser.openBrowserAsync('https://nexez.ai/terms')}
          >
            <Text style={styles.legalLink}>Terms of Service</Text>
          </Pressable>
        </View>

        {/* Data export (GDPR/CCPA) */}
        <View style={styles.dataExport}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export my data"
            style={[styles.exportBtn, exporting ? styles.disabled : null]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.exportBtnText}>Export my data</Text>
            )}
          </Pressable>
          <Text style={styles.exportHint}>Download everything Nexxi stores about you as a JSON file.</Text>
          {exportError ? <Text style={styles.exportError}>{exportError}</Text> : null}
        </View>

        {/* Danger zone — in-app account deletion (App Store requirement) */}
        <View style={styles.dangerZone}>
          <Text accessibilityRole="header" style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.dangerHint}>
            Permanently deletes your Nexxi buyer data — chats, preferences, and order history. This can’t be undone. If you also sell on Nexez, your seller account and login stay separate and are not affected.
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Type DELETE to confirm"
            placeholderTextColor={colors.text3}
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
    fontFamily: font.serif,
    fontSize: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.text2,
    fontFamily: font.sans400,
    fontSize: 15,
    lineHeight: 23,
  },
  card: {
    ...glass,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
    ...cardShadow,
  },
  eyebrow: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  value: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 18,
  },
  sectionHeader: {
    marginTop: 6,
    gap: 6,
  },
  sectionEyebrow: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  sectionHint: {
    color: colors.text2,
    fontFamily: font.sans400,
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
    fontFamily: font.sans600,
    fontSize: 14,
  },
  fieldHint: {
    color: colors.text3,
    fontFamily: font.sans400,
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: font.sans,
    fontSize: 15,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 9,
  },
  budgetInput: {
    flex: 1,
    fontFamily: font.serif,
    fontSize: 20,
  },
  currencyBox: {
    width: 88,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyInput: {
    width: '100%',
    textAlign: 'center',
    color: colors.text,
    fontFamily: font.mono600,
    fontSize: 14,
    letterSpacing: 1.2,
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
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.accent,
    fontFamily: font.sans600,
    fontSize: 13,
  },
  chipX: {
    color: colors.accent,
    fontFamily: font.sans700,
    fontSize: 12,
  },
  addBtn: {
    borderRadius: radius.md,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  addBtnText: {
    color: colors.onAccent,
    fontFamily: font.sans700,
    fontSize: 14,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.panel2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: colors.text,
  },
  segmentText: {
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 12,
  },
  segmentTextActive: {
    color: colors.onAccent,
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
    fontFamily: font.sans600,
    fontSize: 15,
  },
  sourceCore: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  error: {
    color: colors.danger,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  save: {
    marginTop: 4,
  },
  saveText: {
    // Color + font come from buttonGlass.label (cream label on a persimmon-ring glass button).
  },
  disabled: {
    opacity: 0.5,
  },
  signOut: {
    marginTop: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
    paddingVertical: 15,
  },
  signOutText: {
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 15,
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
    fontFamily: font.serif,
    fontSize: 20,
  },
  dangerHint: {
    color: colors.text2,
    fontFamily: font.sans400,
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
    fontFamily: font.sans700,
    fontSize: 14,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  legalLink: {
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 13,
  },
  legalDot: {
    color: colors.text3,
    fontFamily: font.sans,
    fontSize: 13,
  },
  safetyNote: {
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  safetyTitle: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 20,
  },
  safetyBody: {
    color: colors.text2,
    fontFamily: font.sans400,
    fontSize: 12,
    lineHeight: 17,
  },
  dataExport: {
    marginTop: 8,
  },
  exportBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  exportBtnText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 14,
  },
  exportHint: {
    marginTop: 8,
    color: colors.text2,
    fontFamily: font.sans400,
    fontSize: 12,
    lineHeight: 17,
  },
  exportError: {
    marginTop: 8,
    color: colors.danger,
    fontFamily: font.sans,
    fontSize: 13,
  },
})
