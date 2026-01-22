import { api } from './axios';
import type { Point, Selection } from '../types/VideoStream';

export const selectionsApi = {
  async create(streamId: number, points: Point[]) {
    await api.post('/api/v1/selections', {
      stream_id: streamId,
      points,
    });
  },

  async getByStreamId(streamId: number): Promise<Selection[]> {
    const res = await api.get<Selection[]>(`/api/v1/streams/${streamId}/selections`);
    return res.data;
  },
};
