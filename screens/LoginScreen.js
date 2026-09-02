import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { apiRequest } from '../api';

export default function LoginScreen({ navigation }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const adminTapCount = useRef(0);
  const adminTapTimer = useRef(null);

  const hwid = Device.modelId || Device.osInternalBuildId || 'unknown-device';

  async function handleLogin() {
    if (!login || !password) return Alert.alert('Błąd', 'Wypełnij wszystkie pola.');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', 'POST', { login, password, hwid });
      await SecureStore.setItemAsync('token', data.token);
      await SecureStore.setItemAsync('user_id', String(data.user.id));
      await SecureStore.setItemAsync('user_login', data.user.login);
      navigation.replace('ChatList');
    } catch (e) {
      Alert.alert('Błąd', e.message);
    } finally {
      setLoading(false);
    }
  }

  // Ukryty dostęp do admina — 7x tap na wersję
  function handleVersionTap() {
    adminTapCount.current += 1;
    clearTimeout(adminTapTimer.current);
    adminTapTimer.current = setTimeout(() => { adminTapCount.current = 0; }, 2000);

    if (adminTapCount.current >= 7) {
      adminTapCount.current = 0;
      navigation.navigate('Admin');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SecureChat</Text>
      <Text style={styles.subtitle}>Szyfrowane wiadomości</Text>

      <TextInput
        style={styles.input}
        placeholder="Login"
        placeholderTextColor="#555"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło"
        placeholderTextColor="#555"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Zaloguj</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Nie masz konta? Zarejestruj się</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleVersionTap} style={styles.version}>
        <Text style={styles.versionText}>v1.0.0</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', padding: 24 },
  title: { color: '#6c63ff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: '#444', fontSize: 14, textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', padding: 14,
    borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#2a2a2a'
  },
  button: {
    backgroundColor: '#6c63ff', padding: 16, borderRadius: 12,
    alignItems: 'center', marginBottom: 16
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#6c63ff', textAlign: 'center', marginTop: 8 },
  version: { position: 'absolute', bottom: 20, alignSelf: 'center' },
  versionText: { color: '#222', fontSize: 12 }
});
