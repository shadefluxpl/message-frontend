import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Alert
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, BASE_URL } from '../api';
import io from 'socket.io-client';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    SecureStore.getItemAsync('user_id').then(id => {
      setUserId(id);
      setupSocket(id);
    });
  }, []);

  function setupSocket(id) {
    const socket = io(BASE_URL);
    socket.emit('join', id);
    socket.on('new_message', (msg) => {
      setChats(prev => {
        const exists = prev.find(c => c.id === msg.sender_id);
        if (exists) {
          return prev.map(c => c.id === msg.sender_id ? { ...c, preview: '🔒 Nowa wiadomość' } : c);
        }
        return [{ id: msg.sender_id, login: `User ${msg.sender_id}`, preview: '🔒 Nowa wiadomość' }, ...prev];
      });
    });
  }

  async function findUser() {
    if (!search.trim()) return;
    try {
      const user = await apiRequest(`/auth/user/${search.trim()}`);
      navigation.navigate('Chat', { otherId: user.id, otherLogin: user.login });
    } catch {
      Alert.alert('Błąd', 'Nie znaleziono użytkownika.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Szukaj loginu..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={findUser}>
          <Text style={styles.searchBtnText}>Szukaj</Text>
        </TouchableOpacity>
      </View>

      {chats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Brak rozmów.</Text>
          <Text style={styles.emptySubtext}>Wyszukaj login żeby zacząć czat.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => navigation.navigate('Chat', { otherId: item.id, otherLogin: item.login })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.login[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.chatLogin}>{item.login}</Text>
                <Text style={styles.chatPreview}>{item.preview || '...'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#1a1a1a', color: '#fff',
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a'
  },
  searchBtn: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 10, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  chatItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  chatLogin: { color: '#fff', fontWeight: 'bold' },
  chatPreview: { color: '#555', fontSize: 13, marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#555', fontSize: 18 },
  emptySubtext: { color: '#333', fontSize: 13, marginTop: 6 }
});
