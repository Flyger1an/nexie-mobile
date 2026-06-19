import { Redirect, Tabs } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '@/context/auth'
import { colors } from '@/lib/theme'

// Emoji glyphs keep the tab bar dependency-free (no native icon font / rebuild).
// Focus is conveyed by opacity since emoji ignore tabBarActiveTintColor.
function tabIcon(glyph: string) {
  return function Icon({ focused }: { focused: boolean }) {
    return (
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.icon, { opacity: focused ? 1 : 0.45 }]}
      >
        {glyph}
      </Text>
    )
  }
}

export default function TabsLayout() {
  const { session, loading } = useAuth()

  // The session gate lives here so every tab is protected once, not per-screen.
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.signal} />
      </View>
    )
  }
  if (!session) return <Redirect href="/" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.signal,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarAccessibilityLabel: 'Chat', tabBarIcon: tabIcon('💬') }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarAccessibilityLabel: 'Discover', tabBarIcon: tabIcon('🧭') }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarAccessibilityLabel: 'Orders', tabBarIcon: tabIcon('🧾') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  tabBar: {
    backgroundColor: colors.panel,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabItem: {
    paddingVertical: 4,
  },
  icon: {
    fontSize: 18,
  },
})
