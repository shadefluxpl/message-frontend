import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as Device from 'expo-device';
import { apiRequest } from '../api';

export default function RegisterScreen({ navigation }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const hwid = Device.modelId || Device.osInternalBuildId || 'unknown-device';

  async function handleRegister() {
    if (!login || !password || !confirm) return Alert.alert('Błąd', 'Wypełnij wszystkie pola.');
    if (password !== confirm) return Alert.alert('Błąd', 'Hasła nie są zgodne.');
    if (password.length < 6) return Alert.alert('Błąd', 'Hasło min. 6 znaków.');

    setLoading(true);
    try {
      await apiRequest('/auth/register', 'POST', { login, password, hwid });
      Alert.alert('Sukces', 'Konto utworzone! Możesz się zalogować.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Błąd', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nowe konto</Text>

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
      <TextInput
        style={styles.input}
        placeholder="Potwierdź hasło"
        placeholderTextColor="#555"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />

      <Text style={styles.note}>
        🔒 Twoje konto będzie powiązane z tym urządzeniem (HWID: {hwid.slice(0, 12)}...)
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Zarejestruj</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', padding: 24 },
  title: { color: '#6c63ff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', padding: 14,
    borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#2a2a2a'
  },
  note: { color: '#444', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  button: {
    backgroundColor: '#6c63ff', padding: 16, borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
