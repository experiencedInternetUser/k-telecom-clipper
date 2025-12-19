import { api } from './axios';
import type { Point } from '../types/VideoStream';

export const selectionsApi = {
  async create(streamId: number, points: Point[]) {
    await api.post('/api/v1/selections', {
      stream_id: streamId,
      points,
    });
  },
};
