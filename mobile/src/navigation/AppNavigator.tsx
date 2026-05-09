import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { COLORS, FONTS } from '../constants';

import HomeScreen from '../screens/home/HomeScreen';
import CheckinScreen from '../screens/checkins/CheckinScreen';
import MedicinesScreen from '../screens/medicines/MedicinesScreen';
import AIChatScreen from '../screens/ai/AIChatScreen';
import FamilyScreen from '../screens/family/FamilyScreen';
import CareScreen from '../screens/care/CareScreen';

export type TabParamList = {
  Home: undefined;
  Checkin: undefined;
  Medicines: undefined;
  AIChat: undefined;
  Family: undefined;
  Care: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: 'H',
    Checkin: 'C',
    Medicines: 'M',
    AIChat: 'AI',
    Family: 'F',
    Care: '+',
  };

  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? COLORS.primary : COLORS.background,
        borderWidth: 1,
        borderColor: focused ? COLORS.primary : COLORS.border,
      }}
    >
      <Text
        style={{
          fontSize: name === 'AIChat' ? 10 : 13,
          color: focused ? COLORS.text.inverse : COLORS.text.secondary,
          fontWeight: FONTS.weights.bold,
        }}
      >
        {icons[name]}
      </Text>
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
          height: 64,
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
      <Tab.Screen name="Care" component={CareScreen} options={{ title: 'Care' }} />
    </Tab.Navigator>
  );
}
