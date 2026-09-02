import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import AdminPanel from './screens/AdminPanel';

const Stack = createNativeStackNavigator();

export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('token').then(t => {
      setToken(t);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator color="#6c63ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={token ? 'ChatList' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: '#111' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#0a0a0a' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Rejestracja' }} />
        <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Wiadomości', headerLeft: null }} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Admin" component={AdminPanel} options={{ title: 'Panel Admina' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
