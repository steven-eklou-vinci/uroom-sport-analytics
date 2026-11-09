import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import { colors } from '../theme';
import CaptureScreen from '../screens/CaptureScreen';
import PlayersStack from './PlayersStack';
import ShortlistsScreen from '../screens/ShortlistsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.primary,
    card: colors.dark,
    text: colors.light,
    border: colors.gray[600],
    primary: colors.secondary
  }
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.dark,
            borderTopColor: colors.gray[600]
          },
          tabBarActiveTintColor: colors.secondary,
          tabBarInactiveTintColor: colors.gray[400],
          tabBarIcon: ({ color, size }) => {
            const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
              Capture: 'radio',
              Players: 'users',
              Shortlists: 'bookmark',
              Profile: 'user'
            };
            const iconName = iconMap[route.name] ?? 'circle';
            return <Feather name={iconName} color={color} size={size} />;
          }
        })}
      >
        <Tab.Screen name="Capture" component={CaptureScreen} />
        <Tab.Screen name="Players" component={PlayersStack} />
        <Tab.Screen name="Shortlists" component={ShortlistsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
