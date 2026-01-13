import { api } from './axios';
import type { Stream, User, NewStreamForm, UserForm } from '../types/Admin';

/* ======================================================
   Normalizers (backend → UI models)
====================================================== */

const normalizeStream = (raw: any): Stream => ({
  id: String(raw.id),

  // UI поля
  rtspUrl: raw.url ?? '',
  address: raw.description ?? '',
  entrance: raw.entrance ?? '',

  // обязательные поля UI
  userCount: Array.isArray(raw.users) ? raw.users.length : 0,
  assignedUsers: Array.isArray(raw.users)
    ? raw.users.map((u: any) => String(u.id))
    : [],

  // UI-safe defaults
  isOnline: Boolean(raw.is_online ?? true),
  lastActive: raw.last_active ?? undefined,
});

const normalizeUser = (raw: any): User => ({
  id: String(raw.id),
  login: raw.login ?? raw.email ?? '',
  email: raw.email ?? '',

  registrationDate: raw.created_at ?? '',
  lastLogin: raw.last_login ?? '',

  streamCount: Array.isArray(raw.streams) ? raw.streams.length : 0,
  isActive: raw.is_active ?? true,

  assignedStreams: Array.isArray(raw.streams)
    ? raw.streams.map((s: any) => String(s.id))
    : [],
});

/* ======================================================
   Admin API
====================================================== */

export const adminApi = {
  /* ---------- Streams ---------- */

  async getStreams(): Promise<Stream[]> {
    const res = await api.get('/api/v1/admin/streams');
    return Array.isArray(res.data) ? res.data.map(normalizeStream) : [];
  },

  async createStream(payload: NewStreamForm): Promise<Stream> {
    const res = await api.post('/api/v1/admin/streams', {
      url: payload.rtspUrl,
      description: payload.cameraAddress,
    });

    return normalizeStream(res.data);
  },

  async updateStream(
    id: string,
    payload: Partial<NewStreamForm>
  ): Promise<Stream> {
    const res = await api.put(`/api/v1/admin/streams/${id}`, {
      ...(payload.rtspUrl && { url: payload.rtspUrl }),
      ...(payload.cameraAddress && { description: payload.cameraAddress }),
    });

    return normalizeStream(res.data);
  },

  async deleteStream(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/streams/${id}`);
  },

  /* ---------- Users ---------- */

  async getUsers(): Promise<User[]> {
    const res = await api.get('/api/v1/admin/users');
    return Array.isArray(res.data) ? res.data.map(normalizeUser) : [];
  },

  async createUser(payload: UserForm): Promise<User> {
    const res = await api.post('/api/v1/admin/users', payload);
    return normalizeUser(res.data);
  },

  async updateUser(
    id: string,
    payload: Partial<User>
  ): Promise<User> {
    const res = await api.put(`/api/v1/admin/users/${id}`, payload);
    return normalizeUser(res.data);
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/users/${id}`);
  },

  /* ---------- Assign Streams ---------- */

  async assignStreamsToUser(
    userId: string,
    streamIds: string[]
  ): Promise<void> {
    await api.post(`/api/v1/admin/users/${userId}/streams`, {
      stream_ids: streamIds,
    });
  },
};
