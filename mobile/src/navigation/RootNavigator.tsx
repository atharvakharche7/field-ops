import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AllTicketsScreen from '../screens/supervisor/AllTicketsScreen';
import CreateTicketScreen from '../screens/supervisor/CreateTicketScreen';
import DashboardScreen from '../screens/supervisor/DashboardScreen';
import MyTicketsScreen from '../screens/technician/MyTicketsScreen';
import { colors, fontSize } from '../theme';

// These lists tell TypeScript which screens exist, so a mistyped screen name won't compile.
type RootStackParamList = {
  Login: undefined;
  TechnicianHome: undefined;
  SupervisorHome: undefined;
};

type TechnicianTabParamList = {
  Tickets: undefined;
  Profile: undefined;
};

type SupervisorTabParamList = {
  Dashboard: undefined;
  Tickets: undefined;
  New: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const TechnicianTab = createBottomTabNavigator<TechnicianTabParamList>();
const SupervisorTab = createBottomTabNavigator<SupervisorTabParamList>();

// Text-only tabs: the icon slot is hidden because no icon library is part of the project.
const tabOptions: BottomTabNavigationOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarIconStyle: { display: 'none' },
  tabBarLabelStyle: { fontSize: fontSize.sm, fontWeight: '600' },
};

function TechnicianTabs() {
  return (
    <TechnicianTab.Navigator screenOptions={tabOptions}>
      <TechnicianTab.Screen name="Tickets" component={MyTicketsScreen} options={{ title: 'My Tickets', tabBarLabel: 'Tickets' }} />
      <TechnicianTab.Screen name="Profile" component={ProfileScreen} />
    </TechnicianTab.Navigator>
  );
}

function SupervisorTabs() {
  return (
    <SupervisorTab.Navigator screenOptions={tabOptions}>
      <SupervisorTab.Screen name="Dashboard" component={DashboardScreen} />
      <SupervisorTab.Screen name="Tickets" component={AllTicketsScreen} options={{ title: 'All Tickets', tabBarLabel: 'Tickets' }} />
      <SupervisorTab.Screen name="New" component={CreateTicketScreen} options={{ title: 'New Ticket', tabBarLabel: 'New' }} />
      <SupervisorTab.Screen name="Profile" component={ProfileScreen} />
    </SupervisorTab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Only the screens for the current login exist at all. A technician can't reach supervisor
  // screens because they aren't registered, and logging in or out swaps the whole set.
  // This only decides what's shown; the backend still enforces every permission.
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'SUPERVISOR' ? (
          <Stack.Screen name="SupervisorHome" component={SupervisorTabs} />
        ) : (
          <Stack.Screen name="TechnicianHome" component={TechnicianTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
