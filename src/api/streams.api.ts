import { api } from './axios';
import type { Stream } from '../types/Admin';

export const streamsApi = {
  async getAll(): Promise<Stream[]> {
    const res = await api.get('/api/v1/streams');
    return res.data;
  },

  async getById(id: number): Promise<{ streamUrl: string }> {
    const res = await api.get(`/api/v1/streams/${id}`);
    return {
      streamUrl: res.data.stream_url,
    };
  },
};
