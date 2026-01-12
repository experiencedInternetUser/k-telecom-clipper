import { api } from './axios';
import type { Stream, User, NewStreamForm, UserForm } from '../types/Admin';

export const adminApi = {
  /* ---------- Streams ---------- */
  async getStreams(): Promise<Stream[]> {
    const res = await api.get('/api/v1/admin/streams');
    return res.data;
  },

  async createStream(payload: NewStreamForm): Promise<Stream> {
    const res = await api.post('/api/v1/admin/streams', payload);
    return res.data;
  },

  async updateStream(id: string, payload: Partial<NewStreamForm>): Promise<Stream> {
    const res = await api.put(`/api/v1/admin/streams/${id}`, payload);
    return res.data;
  },

  async deleteStream(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/streams/${id}`);
  },

  /* ---------- Users ---------- */
  async getUsers(): Promise<User[]> {
    const res = await api.get('/api/v1/admin/users');
    return res.data;
  },

  async createUser(payload: UserForm): Promise<User> {
    const res = await api.post('/api/v1/admin/users', payload);
    return res.data;
  },

  async updateUser(id: string, payload: Partial<User>): Promise<User> {
    const res = await api.put(`/api/v1/admin/users/${id}`, payload);
    return res.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/users/${id}`);
  },

  /* ---------- Assignments ---------- */
  async assignStreamsToUser(userId: string, streamIds: string[]): Promise<void> {
    await api.post(`/api/v1/admin/users/${userId}/streams`, {
      stream_ids: streamIds,
    });
  },
};
