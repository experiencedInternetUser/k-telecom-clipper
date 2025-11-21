// src/types/Admin.ts
export interface Stream {
  id: string;
  address: string;
  entrance: string;
  rtspUrl: string;
  userCount: number;
  isOnline: boolean;
  lastActive?: string;
  assignedUsers?: string[]; // ids пользователей
}

export interface User {
  id: string;
  login: string;
  password?: string; // опционально
  registrationDate: string;
  lastLogin: string;
  streamCount: number;
  isActive: boolean;
  assignedStreams?: string[];
}

export interface NewStreamForm {
  rtspUrl: string;
  cameraAddress: string;
  selectedUsers: string[];
}

export interface UserForm {
  login: string;
  password: string;
  // email убран
}

export interface DeleteModalState {
  isOpen: boolean;
  stream: Stream | null;
  user: User | null;
}

export interface UserManagementState {
  selectedUser: User | null;
  userStreamAssignments: { [userId: string]: string[] };
}
