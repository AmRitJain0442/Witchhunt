import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { COLORS, FONTS } from '../constants';

import HomeScreen from '../screens/home/HomeScreen';
import CheckinScreen from '../screens/checkins/CheckinScreen';
import MedicinesScreen from '../screens/medicines/MedicinesScreen';
import AIChatScreen from '../screens/ai/AIChatScreen';
import FamilyScreen from '../screens/family/FamilyScreen';

export type TabParamList = {
  Home: undefined;
  Checkin: undefined;
  Medicines: undefined;
  AIChat: undefined;
  Family: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Checkin: '✏️',
    Medicines: '💊',
    AIChat: '🤖',
    Family: '👨‍👩‍👧',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icons[name]}</Text>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text.disabled,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: FONTS.sizes.xs,
          fontWeight: FONTS.weights.medium,
        },
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text.primary,
        headerTitleStyle: {
          fontSize: FONTS.sizes.lg,
          fontWeight: FONTS.weights.semibold,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Checkin" component={CheckinScreen} options={{ title: 'Check-in' }} />
      <Tab.Screen name="Medicines" component={MedicinesScreen} options={{ title: 'Medicines' }} />
      <Tab.Screen name="AIChat" component={AIChatScreen} options={{ title: 'Kutumb AI' }} />
      <Tab.Screen name="Family" component={FamilyScreen} options={{ title: 'Family' }} />
    </Tab.Navigator>
  );
}
