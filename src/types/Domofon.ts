import type { Stream } from "./Admin";

export type Domofon = Omit<Stream, "rtspUrl" | "assignedUsers" | "userCount"> & {
  // Можно расширить публичную модель дополнительными полями для UI,
};
