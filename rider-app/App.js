import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { colors } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import IncentivesScreen from './src/screens/IncentivesScreen';
import SupportScreen from './src/screens/SupportScreen';
import VehicleSafetyScreen from './src/screens/VehicleSafetyScreen';
import BookingRequestScreen from './src/screens/BookingRequestScreen';
import ActiveBookingScreen from './src/screens/ActiveBookingScreen';
import TripDetailsScreen from './src/screens/TripDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{emoji}</Text></View>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarActiveTintColor: colors.onPrimaryContainer,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500', fontFamily: 'Outfit' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
      <Tab.Screen name="EarningsTab" component={EarningsScreen} options={{ tabBarLabel: 'Earnings', tabBarIcon: () => <TabIcon emoji="💰" /> }} />
      <Tab.Screen name="Incentives" component={IncentivesScreen} options={{ tabBarLabel: 'Incentives', tabBarIcon: () => <TabIcon emoji="⭐" /> }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ tabBarLabel: 'Help', tabBarIcon: () => <TabIcon emoji="❓" /> }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { rider, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!rider ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Earnings" component={EarningsScreen} />
          <Stack.Screen name="Vehicle" component={VehicleSafetyScreen} />
          <Stack.Screen name="BookingRequest" component={BookingRequestScreen} />
          <Stack.Screen name="ActiveBooking" component={ActiveBookingScreen} />
          <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
