import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RouteProvider } from '@/context/RouteContext';
import { RootNavigator } from '@/navigation/RootNavigator';

/**
 * App root.
 *
 * Provider order matters:
 *   GestureHandlerRootView  -> required by react-native-draggable-flatlist
 *     SafeAreaProvider      -> notch/home-indicator insets
 *       RouteProvider       -> the shared in-memory route (planner ↔ delivery)
 *         NavigationContainer -> tabs + planner stack
 *
 * MOCK DATA MODE is on by default (see src/config/env.ts). No API keys needed.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <RouteProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </RouteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
