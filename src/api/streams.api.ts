import { api } from './axios';
import type { Domofon } from '../types/Domofon';

export const streamsApi = {
  async getAll(): Promise<Domofon[]> {
    const res = await api.get('/api/v1/streams');

    return res.data.map((s: any) => ({
      id: s.id,
      address: s.address,
      entrance: s.entrance,
      isOnline: s.is_online ?? true,
      lastActive: s.last_active ?? '',
    }));
  },

  async getById(id: number): Promise<{ streamUrl: string }> {
    const res = await api.get(`/api/v1/streams/${id}`);

    return {
        streamUrl: res.data.stream_url,
    };
  }
};
