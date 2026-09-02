import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Platform
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as ScreenCapture from 'expo-screen-capture';
import { apiRequest, BASE_URL } from '../api';
import io from 'socket.io-client';

export default function ChatScreen({ route, navigation }) {
  const { otherId, otherLogin } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState(null);
  const flatListRef = useRef();
  const timers = useRef({});

  useEffect(() => {
    navigation.setOptions({ title: otherLogin });

    // Blokada screenshotów
    ScreenCapture.preventScreenCaptureAsync();

    SecureStore.getItemAsync('user_id').then(id => {
      setUserId(id);
      loadMessages(id);
      setupSocket(id);
    });

    return () => {
      ScreenCapture.allowScreenCaptureAsync();
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  async function loadMessages(uid) {
    try {
      const data = await apiRequest(`/messages/${otherId}`);
      setMessages(data);

      // Odczytaj nieprzeczytane wiadomości od drugiej osoby
      data.forEach(msg => {
        if (msg.status === 'unread' && String(msg.sender_id) !== String(uid)) {
          readMessage(msg.id);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  function setupSocket(uid) {
    const socket = io(BASE_URL);
    socket.emit('join', uid);

    socket.on('new_message', (msg) => {
      if (String(msg.sender_id) === String(otherId)) {
        const newMsg = {
          id: msg.id,
          sender_id: msg.sender_id,
          sent_at: msg.sent_at,
          status: 'unread',
          encrypted_content: null
        };
        setMessages(prev => [...prev, newMsg]);
        readMessage(msg.id);
      }
    });

    socket.on('message_deleted', ({ message_id }) => {
      setMessages(prev => prev.filter(m => m.id !== message_id));
    });

    socket.on('message_read', ({ message_id }) => {
      setMessages(prev => prev.map(m =>
        m.id === message_id ? { ...m, readStatus: 'Odczytano' } : m
      ));
    });
  }

  async function readMessage(messageId) {
    try {
      const data = await apiRequest(`/messages/read/${messageId}`, 'POST');

      // Deszyfruj i pokaż (tu treść jest "szyfrowaniem" — w pełnej wersji użyj tweetnacl)
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, encrypted_content: data.encrypted_content, status: 'read', expires_at: data.expires_at }
          : m
      ));

      // Timer 4 sekundy → usuń
      const ms = new Date(data.expires_at) - Date.now();
      const delay = ms > 0 ? ms : 4000;

      timers.current[messageId] = setTimeout(async () => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        try {
          await apiRequest(`/messages/${messageId}`, 'DELETE');
        } catch {}
      }, delay);

    } catch (e) {
      console.error('readMessage error:', e);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    try {
      // W pełnej wersji E2EE: zaszyfruj text kluczem publicznym odbiorcy przed wysłaniem
      await apiRequest('/messages/send', 'POST', {
        receiver_id: otherId,
        encrypted_content: text
      });

      const tempMsg = {
        id: Date.now(),
        sender_id: userId,
        encrypted_content: text,
        sent_at: new Date().toISOString(),
        status: 'sent'
      };
      setMessages(prev => [...prev, tempMsg]);
    } catch (e) {
      console.error(e);
    }
  }

  function renderMessage({ item }) {
    const isMe = String(item.sender_id) === String(userId);
    const isUnread = item.status === 'unread';
    const isRead = item.status === 'read';

    return (
      <TouchableOpacity
        onPress={() => isUnread && !isMe ? readMessage(item.id) : null}
        activeOpacity={isUnread ? 0.6 : 1}
      >
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {isUnread && !isMe ? (
            <Text style={styles.unreadHint}>🔒 Dotknij aby otworzyć</Text>
          ) : (
            <Text style={styles.msgText}>{item.encrypted_content}</Text>
          )}

          {isRead && item.expires_at && (
            <ExpiryBar expiresAt={item.expires_at} />
          )}

          {isMe && item.readStatus && (
            <Text style={styles.readStatus}>✓ {item.readStatus}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => String(item.id)}
        renderItem={renderMessage}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Wiadomość..."
          placeholderTextColor="#555"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>Wyślij</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExpiryBar({ expiresAt }) {
  const [remaining, setRemaining] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <View style={styles.expiryContainer}>
      <View style={[styles.expiryBar, { width: `${(remaining / 4) * 100}%` }]} />
      <Text style={styles.expiryText}>znika za {remaining}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  bubble: {
    maxWidth: '80%', padding: 12, borderRadius: 16,
    marginBottom: 8
  },
  bubbleMe: { backgroundColor: '#6c63ff', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 15 },
  unreadHint: { color: '#aaa', fontSize: 14, fontStyle: 'italic' },
  readStatus: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4, textAlign: 'right' },
  expiryContainer: { marginTop: 6, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  expiryBar: { height: 4, backgroundColor: '#ff4444', borderRadius: 2 },
  expiryText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'right', marginTop: 2 },
  inputRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 10, backgroundColor: '#111',
    borderTopWidth: 1, borderTopColor: '#1e1e1e', gap: 8
  },
  input: {
    flex: 1, backgroundColor: '#1a1a1a', color: '#fff',
    padding: 12, borderRadius: 20, maxHeight: 100,
    borderWidth: 1, borderColor: '#2a2a2a'
  },
  sendBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: 'bold' }
});
