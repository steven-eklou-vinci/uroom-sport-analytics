import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PlayersScreen from '../screens/PlayersScreen';
import PlayerDetailsScreen from '../screens/PlayerDetailsScreen';

export type PlayersStackParamList = {
  PlayersList: undefined;
  PlayerDetails: { playerId: string };
};

const Stack = createNativeStackNavigator<PlayersStackParamList>();

export default function PlayersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="PlayersList" component={PlayersScreen} />
      <Stack.Screen name="PlayerDetails" component={PlayerDetailsScreen} />
    </Stack.Navigator>
  );
}
