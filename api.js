import * as SecureStore from 'expo-secure-store';

// ⚠️ ZMIEŃ NA SWÓJ URL Z RENDER.COM po deploymencie
export const BASE_URL = 'https://message-backend.onrender.com';

export async function apiRequest(path, method = 'GET', body = null, isAdmin = false) {
  const token = isAdmin
    ? await SecureStore.getItemAsync('admin_token')
    : await SecureStore.getItemAsync('token');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    if (isAdmin) {
      headers['x-admin-token'] = token;
    } else {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Błąd serwera');
  return data;
}
