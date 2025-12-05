import React, { useEffect, useMemo, useState } from 'react';
import styles from './AdminPanel.module.css';
import type { Stream, User, NewStreamForm, UserForm } from '../../types/Admin';
import StreamsTab from './StreamsTab';
import UsersTab from './UsersTab';
import StreamModal from './StreamModal';
import UserModal from './UserModal';
import DeleteModal from './DeleteModal';
import SearchBar from './SearchBar';
import { mockStreams, mockUsers } from "../../mocks";

const ITEMS_PER_PAGE = 10;

type DeleteTarget = {
  type: 'stream' | 'user';
  id: string;
  label?: string;
};

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'streams' | 'users'>('streams');

  const [streams, setStreams] = useState<Stream[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [isStreamModalOpen, setStreamModalOpen] = useState(false);
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [query, setQuery] = useState('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    setStreams(mockStreams);
    setUsers(mockUsers);
  }, []);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
    if (selectedUserId && !users.find(u => u.id === selectedUserId)) {
      setSelectedUserId(users[0]?.id ?? null);
    }
  }, [users, selectedUserId]);

  const filteredStreams = useMemo(() => {
    if (!query.trim()) return streams;
    return streams.filter(s =>
      `${s.rtspUrl} ${s.address} ${s.entrance}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [streams, query]);

  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredStreams.length / ITEMS_PER_PAGE)));
    setCurrentPage(1);
  }, [filteredStreams]);

  const paginatedStreams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStreams.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStreams, currentPage]);


  const handleCreateStream = (data: NewStreamForm) => {
    const newStreamId = Date.now().toString();
    const assigned = data.selectedUsers ?? [];
    const newStream: Stream = {
      id: newStreamId,
      address: data.cameraAddress,
      entrance: '-',
      rtspUrl: data.rtspUrl,
      userCount: assigned.length,
      isOnline: true,
      lastActive: '',
      assignedUsers: assigned
    };

    setStreams(prev => [newStream, ...prev]);
    if (assigned.length > 0) {
      setUsers(prevUsers =>
        prevUsers.map(u =>
          assigned.includes(u.id)
            ? {
                ...u,
                assignedStreams: Array.from(new Set([...(u.assignedStreams ?? []), newStreamId])),
                streamCount: (Array.from(new Set([...(u.assignedStreams ?? []), newStreamId]))).length
              }
            : u
        )
      );
    }
    setStreamModalOpen(false);
  };

  const handleUpdateStream = (streamId: string, payload: Partial<Stream> & Partial<NewStreamForm>) => {
    setStreams(prev =>
      prev.map(s => {
        if (s.id !== streamId) return s;

        const updated: Stream = {
          ...s,
          address: (payload as any).cameraAddress ?? payload.address ?? s.address,
          rtspUrl: payload.rtspUrl ?? s.rtspUrl,
          entrance: payload.entrance ?? s.entrance,
          lastActive: payload.lastActive ?? s.lastActive,
          assignedUsers: (payload as any).selectedUsers ?? payload.assignedUsers ?? s.assignedUsers,
        };
        updated.userCount = (updated.assignedUsers ?? []).length;
        return updated;
      })
    );

    const newAssigned = (payload as any).selectedUsers as string[] | undefined;
    if (newAssigned) {
      setUsers(prevUsers => {
        const prevAssigned = streams.find(s => s.id === streamId)?.assignedUsers ?? [];

        const toAdd = newAssigned.filter(id => !prevAssigned.includes(id));
        const toRemove = prevAssigned.filter(id => !newAssigned.includes(id));

        return prevUsers.map(u => {
          let assigned = u.assignedStreams ? [...u.assignedStreams] : [];

          if (toAdd.includes(u.id)) {
            assigned = Array.from(new Set([...assigned, streamId]));
          }
          if (toRemove.includes(u.id)) {
            assigned = assigned.filter(sid => sid !== streamId);
          }
          return {
            ...u,
            assignedStreams: assigned,
            streamCount: assigned.length
          };
        });
      });
    }

    setEditingStream(null);
    setStreamModalOpen(false);
  };

  const handleDeleteStreamConfirmed = (id: string) => {
    setStreams(prev => prev.filter(s => s.id !== id));

    setUsers(prevUsers =>
      prevUsers.map(u => {
        const assigned = (u.assignedStreams ?? []).filter(sid => sid !== id);
        return { ...u, assignedStreams: assigned, streamCount: assigned.length };
      })
    );

    setDeleteTarget(null);
  };

  const handleCreateUser = (data: UserForm) => {
    const newUser: User = {
      id: Date.now().toString(),
      login: data.login,
      email: data.email,
      password: data.password,
      registrationDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      streamCount: 0,
      isActive: true,
      assignedStreams: [],
    };
    setUsers(prev => [newUser, ...prev]);
    setUserModalOpen(false);
  };

  const handleUpdateUser = (id: string, payload: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...payload } : u));
    setEditingUser(null);
    setUserModalOpen(false);
  };

  const handleDeleteUserConfirmed = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleteTarget(null);
    if (selectedUserId === id) {
      setSelectedUserId(users[0]?.id ?? null);
    }
  };

const handleAssignToUser = (userId: string, assignedStreamIds: string[]) => {
  setUsers(prevUsers =>
    prevUsers.map(u => {
      if (u.id === userId) {
        return { ...u, assignedStreams: assignedStreamIds, streamCount: assignedStreamIds.length };
      }
      return u;
    })
  );

  setStreams(prevStreams =>
    prevStreams.map(s => {
      const wasAssigned = (s.assignedUsers ?? []).includes(userId);
      const shouldBeAssigned = assignedStreamIds.includes(s.id);

      if (shouldBeAssigned && !wasAssigned) {
        const updatedAssigned = [...(s.assignedUsers ?? []), userId];
        return { ...s, assignedUsers: updatedAssigned, userCount: updatedAssigned.length };
      }

      if (!shouldBeAssigned && wasAssigned) {
        const updatedAssigned = (s.assignedUsers ?? []).filter(uid => uid !== userId);
        return { ...s, assignedUsers: updatedAssigned, userCount: updatedAssigned.length };
      }

      return s;
    })
  );
};


  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDeleteForStream = (stream: Stream) => setDeleteTarget({ type: 'stream', id: stream.id, label: stream.address });
  const openDeleteForUser = (user: User) => setDeleteTarget({ type: 'user', id: user.id, label: user.login });

  const selectedUser = users.find(u => u.id === selectedUserId) ?? null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent} />
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'streams' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('streams')}
        >
          Видеопотоки
        </button>

        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Список пользователей
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          {activeTab === 'streams' ? (
            <button
              className={styles.createButton}
              onClick={() => { setEditingStream(null); setStreamModalOpen(true); }}
            >
              Создать поток +
            </button>
          ) : (
            <button
              className={styles.createUserButton}
              onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
            >
              Создать пользователя +
            </button>
          )}
        </div>

        <div className={styles.controlsRight}>
          {activeTab === 'streams' && (
            <SearchBar value={query} onChange={setQuery} placeholder="Поиск видеопотоков" />
          )}

          {activeTab === 'users' && (
            <>
              <button
                className={styles.editUserButton}
                onClick={() => selectedUser && (setEditingUser(selectedUser), setUserModalOpen(true))}
                disabled={!selectedUser}
              >
                Редактировать пользователя
              </button>

              <button
                className={styles.deleteUserButton}
                onClick={() => selectedUser && openDeleteForUser(selectedUser)}
                disabled={!selectedUser}
              >
                Удалить
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        {activeTab === 'streams' ? (
          <>
            <StreamsTab
              streams={paginatedStreams}
              users={users}
              onEdit={(s) => { setEditingStream(s); setStreamModalOpen(true); }}
              onDelete={(s) => openDeleteForStream(s)}
            />

            {totalPages > 1 && (
              <div className={styles.paginationContainer}>
                <div className={styles.pagination}>
                  <button
                    className={styles.navButton}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Назад"
                  >
                    ‹ Назад
                  </button>

                  <div className={styles.pages}>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const page = idx + 1;
                      return (
                        <button
                          key={page}
                          className={`${styles.pageNumber} ${currentPage === page ? styles.activePage : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className={styles.navButton}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Дальше"
                  >
                    Дальше ›
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <UsersTab
            users={users}
            streams={streams}
            selectedUserId={selectedUserId}
            onSelectUser={(id) => setSelectedUserId(id)}
            onEdit={(u) => { setEditingUser(u); setUserModalOpen(true); }}
            onDelete={(u) => openDeleteForUser(u)}
            onAssign={handleAssignToUser}
          />
        )}
      </div>

      {isStreamModalOpen && (
        <StreamModal
          allUsers={users}
          stream={editingStream}
          onClose={() => { setStreamModalOpen(false); setEditingStream(null); }}
          onSubmit={(payload) => {
            if (editingStream) {
              handleUpdateStream(editingStream.id, payload as Partial<Stream> & Partial<NewStreamForm>);
            } else {
              handleCreateStream(payload);
            }
          }}
        />
      )}

      {isUserModalOpen && (
        <UserModal
          user={editingUser}
          onClose={() => { setUserModalOpen(false); setEditingUser(null); }}
          onSubmit={(payload) => editingUser ? handleUpdateUser(editingUser.id, payload) : handleCreateUser(payload)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          type={deleteTarget.type}
          itemLabel={deleteTarget.label}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget.type === 'stream') {
              handleDeleteStreamConfirmed(deleteTarget.id);
            } else {
              handleDeleteUserConfirmed(deleteTarget.id);
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;
