import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ActiveDeliveryScreen } from '@/screens/ActiveDeliveryScreen';
import { AddressBookScreen } from '@/screens/AddressBookScreen';
import { DeliveryHistoryScreen } from '@/screens/DeliveryHistoryScreen';
import { RoutePlannerScreen } from '@/screens/RoutePlannerScreen';
import { TemplatesScreen } from '@/screens/TemplatesScreen';
import { colors } from '@/theme/colors';

import type { PlannerStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const PlannerStack = createNativeStackNavigator<PlannerStackParamList>();

/** The Plan tab is a stack: build the route, then drive it. */
function PlannerStackNavigator() {
  return (
    <PlannerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.surface,
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <PlannerStack.Screen
        name="RoutePlanner"
        component={RoutePlannerScreen}
        options={{ title: 'Plan Route', headerShown: false }}
      />
      <PlannerStack.Screen
        name="ActiveDelivery"
        component={ActiveDeliveryScreen}
        options={{ title: 'Active Delivery' }}
      />
    </PlannerStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
            PlanTab: 'map',
            AddressBookTab: 'bookmarks',
            TemplatesTab: 'repeat',
            HistoryTab: 'receipt',
          };
          return (
            <Ionicons
              name={icons[route.name as keyof RootTabParamList]}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="PlanTab"
        component={PlannerStackNavigator}
        options={{ title: 'Plan' }}
      />
      <Tab.Screen
        name="AddressBookTab"
        component={AddressBookScreen}
        options={{ title: 'Address Book' }}
      />
      <Tab.Screen
        name="TemplatesTab"
        component={TemplatesScreen}
        options={{ title: 'Templates' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={DeliveryHistoryScreen}
        options={{ title: 'History' }}
      />
    </Tab.Navigator>
  );
}
