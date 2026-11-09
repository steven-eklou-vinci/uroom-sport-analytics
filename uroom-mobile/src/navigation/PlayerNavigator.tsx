import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import { colors } from '../theme';
import PlayerHomeScreen from '../screens/player/PlayerHomeScreen';
import PlayerProgressScreen from '../screens/player/PlayerProgressScreen';
import PlayerCompareScreen from '../screens/player/PlayerCompareScreen';
import PlayerClipsScreen from '../screens/player/PlayerClipsScreen';
import PlayerProfileScreen from '../screens/player/PlayerProfileScreen';

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

export default function PlayerNavigator() {
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
              Home: 'home',
              Progress: 'trending-up',
              Compare: 'activity',
              Clips: 'play-circle',
              Profile: 'user'
            };
            const iconName = iconMap[route.name] ?? 'circle';
            return <Feather name={iconName} color={color} size={size} />;
          }
        })}
      >
        <Tab.Screen name="Home" component={PlayerHomeScreen} />
        <Tab.Screen name="Progress" component={PlayerProgressScreen} />
        <Tab.Screen name="Compare" component={PlayerCompareScreen} />
        <Tab.Screen name="Clips" component={PlayerClipsScreen} />
        <Tab.Screen name="Profile" component={PlayerProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
