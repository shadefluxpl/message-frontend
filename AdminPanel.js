import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../api';

export default function AdminPanel({ navigation }) {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newLogin, setNewLogin] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newHwid, setNewHwid] = useState('');

  async function handleAdminLogin() {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/login', 'POST', { password: pass });
      await SecureStore.setItemAsync('admin_token', data.token);
      setAuthed(true);
      loadUsers();
    } catch (e) {
      Alert.alert('Błąd', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await apiRequest('/admin/users', 'GET', null, true);
      setUsers(data);
    } catch (e) {
      Alert.alert('Błąd', e.message);
    }
  }

  async function toggleBlock(id, isBlocked) {
    try {
      await apiRequest(`/admin/block/${id}`, 'POST', null, true);
      loadUsers();
    } catch (e) {
      Alert.alert('Błąd', e.message);
    }
  }

  async function deleteUser(id, login) {
    Alert.alert('Usuń konto', `Usunąć ${login}?`, [
      { text: 'Anuluj' },
      {
        text: 'Usuń', style: 'destructive', onPress: async () => {
          try {
            await apiRequest(`/admin/user/${id}`, 'DELETE', null, true);
            loadUsers();
          } catch (e) {
            Alert.alert('Błąd', e.message);
          }
        }
      }
    ]);
  }

  async function createUser() {
    if (!newLogin || !newPass || !newHwid) return Alert.alert('Błąd', 'Wypełnij wszystkie pola.');
    try {
      await apiRequest('/admin/create-user', 'POST', { login: newLogin, password: newPass, hwid: newHwid }, true);
      Alert.alert('Sukces', 'Konto utworzone.');
      setNewLogin(''); setNewPass(''); setNewHwid('');
      loadUsers();
    } catch (e) {
      Alert.alert('Błąd', e.message);
    }
  }

  if (!authed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Panel Admina</Text>
        <TextInput
          style={styles.input}
          placeholder="Hasło admina"
          placeholderTextColor="#555"
          value={pass}
          onChangeText={setPass}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleAdminLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Wejdź</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Użytkownicy ({users.length})</Text>

      <FlatList
        data={users}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={
          <View style={styles.createBox}>
            <Text style={styles.sectionTitle}>Utwórz konto</Text>
            <TextInput style={styles.input} placeholder="Login" placeholderTextColor="#555" value={newLogin} onChangeText={setNewLogin} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Hasło" placeholderTextColor="#555" value={newPass} onChangeText={setNewPass} secureTextEntry />
            <TextInput style={styles.input} placeholder="HWID urządzenia" placeholderTextColor="#555" value={newHwid} onChangeText={setNewHwid} />
            <TouchableOpacity style={styles.button} onPress={createUser}>
              <Text style={styles.buttonText}>Utwórz</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userLogin}>{item.login}</Text>
              <Text style={styles.userMeta}>IP: {item.ip}</Text>
              <Text style={styles.userMeta}>HWID: {item.hwid?.slice(0, 16)}...</Text>
              <Text style={[styles.userMeta, item.is_blocked ? styles.blocked : styles.active]}>
                {item.is_blocked ? '🔴 Zablokowany' : '🟢 Aktywny'}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, item.is_blocked ? styles.unblockBtn : styles.blockBtn]}
                onPress={() => toggleBlock(item.id, item.is_blocked)}
              >
                <Text style={styles.actionBtnText}>{item.is_blocked ? 'Odblokuj' : 'Blokuj'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteUser(item.id, item.login)}>
                <Text style={styles.actionBtnText}>Usuń</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  sectionTitle: { color: '#6c63ff', fontWeight: 'bold', marginBottom: 10 },
  createBox: { backgroundColor: '#111', padding: 16, borderRadius: 12, marginBottom: 16 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', padding: 12,
    borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a'
  },
  button: { backgroundColor: '#6c63ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  userRow: {
    backgroundColor: '#111', padding: 14, borderRadius: 12,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center'
  },
  userLogin: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  userMeta: { color: '#555', fontSize: 12, marginTop: 2 },
  blocked: { color: '#ff4444' },
  active: { color: '#44ff88' },
  actions: { gap: 6 },
  actionBtn: { padding: 8, borderRadius: 8, alignItems: 'center', minWidth: 70 },
  blockBtn: { backgroundColor: '#ff8c00' },
  unblockBtn: { backgroundColor: '#44aa44' },
  deleteBtn: { backgroundColor: '#cc2222' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});
