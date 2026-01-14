import { api } from "./axios";
import type { Stream, AdminUser, UserForm } from "../types/Admin";
import type { User } from "../types/User";
import { mapUserToAdminUser } from "../mappers/admin.mappers";

/* =========================
   PAYLOADS
========================= */

export interface StreamPayload {
  url: string;
  description: string;
}

export interface PermissionPayload {
  user_id: number;
  stream_id: number;
  can_read: boolean;
  can_update: boolean;
}

/* =========================
   API
========================= */

export const adminApi = {
  /* ---------- USERS ---------- */

  async getUsers(): Promise<AdminUser[]> {
    const { data } = await api.get<User[]>("/api/v1/admin/users");
    return data.map(mapUserToAdminUser);
  },

  async createUser(payload: UserForm): Promise<AdminUser> {
    const { data } = await api.post<User>("/api/v1/admin/users", payload);
    return mapUserToAdminUser(data);
  },

  async updateUser(
    id: number,
    payload: Partial<UserForm>
  ): Promise<AdminUser> {
    const { data } = await api.put<User>(
      `/api/v1/admin/users/${id}`,
      payload
    );
    return mapUserToAdminUser(data);
  },

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/api/v1/admin/users/${id}`);
  },

  /* ---------- STREAMS ---------- */

  async getStreams(): Promise<Stream[]> {
    const { data } = await api.get<Stream[]>("/api/v1/admin/streams");
    return data;
  },

  async createStream(payload: StreamPayload): Promise<Stream> {
    const { data } = await api.post<Stream>(
      "/api/v1/admin/streams",
      payload
    );
    return data;
  },

  async updateStream(
    id: number,
    payload: StreamPayload
  ): Promise<Stream> {
    const { data } = await api.put<Stream>(
      `/api/v1/admin/streams/${id}`,
      payload
    );
    return data;
  },

  async deleteStream(id: number): Promise<void> {
    await api.delete(`/api/v1/admin/streams/${id}`);
  },

  /* ---------- PERMISSIONS ---------- */

  async createPermission(
    payload: PermissionPayload
  ): Promise<void> {
    await api.post("/api/v1/admin/permissions", payload);
  },

  async deletePermissionsForStream(streamId: number): Promise<void> {
    await api.delete(`/api/v1/admin/permissions/stream/${streamId}`);
  },
};
