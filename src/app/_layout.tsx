import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { AuthProvider } from '@/context/auth'
import { colors } from '@/lib/theme'

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </AuthProvider>
  )
}
