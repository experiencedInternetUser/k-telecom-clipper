import React, { useEffect, useMemo, useState } from 'react';
import styles from './AdminPanel.module.css';
import type { Stream, User, NewStreamForm, UserForm } from '../../types/Admin';
import StreamsTab from './StreamsTab';
import UsersTab from './UsersTab';
import StreamModal from './StreamModal';
import UserModal from './UserModal';
import DeleteModal from './DeleteModal';
import SearchBar from './SearchBar';
import { adminApi } from '../../api/admin.api';

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
  const [loading, setLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [isStreamModalOpen, setStreamModalOpen] = useState(false);
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [query, setQuery] = useState('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);


  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
const load = async () => {
  try {
    setLoading(true);

    const streamsRes = await adminApi.getStreams();
    const usersRes = await adminApi.getUsers();
    // 2 cn
    // setStreams(Array.isArray(streamsRes) ? streamsRes : []);
    // setUsers(Array.isArray(usersRes) ? usersRes : []);

    console.log('STREAMS:', streamsRes);
    console.log('USERS:', usersRes);

    setStreams(streamsRes);
    setUsers(usersRes);
  } catch (e) {
    console.error('ADMIN LOAD ERROR', e);
  } finally {
    setLoading(false);
  }
};


    load();
  }, []);

  /* ---------- USERS SELECTION ---------- */
  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
    if (selectedUserId && !users.find(u => u.id === selectedUserId)) {
      setSelectedUserId(users[0]?.id ?? null);
    }
  }, [users, selectedUserId]);

  /* ---------- FILTER & PAGINATION ---------- */
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

  /* ---------- STREAM CRUD ---------- */
  const handleCreateStream = async (data: NewStreamForm) => {
    const created = await adminApi.createStream(data);
    setStreams(prev => [created, ...prev]);
    setStreamModalOpen(false);
  };

  const handleUpdateStream = async (id: string, payload: Partial<NewStreamForm>) => {
    const updated = await adminApi.updateStream(id, payload);
    setStreams(prev => prev.map(s => s.id === id ? updated : s));
    setEditingStream(null);
    setStreamModalOpen(false);
  };

  const handleDeleteStreamConfirmed = async (id: string) => {
    await adminApi.deleteStream(id);
    setStreams(prev => prev.filter(s => s.id !== id));
    setDeleteTarget(null);
  };

  /* ---------- USER CRUD ---------- */
  const handleCreateUser = async (data: UserForm) => {
    const created = await adminApi.createUser(data);
    setUsers(prev => [created, ...prev]);
    setUserModalOpen(false);
  };

  const handleUpdateUser = async (id: string, payload: Partial<User>) => {
    const updated = await adminApi.updateUser(id, payload);
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    setEditingUser(null);
    setUserModalOpen(false);
  };

  const handleDeleteUserConfirmed = async (id: string) => {
    await adminApi.deleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleteTarget(null);
  };

  /* ---------- ASSIGN STREAMS ---------- */
  const handleAssignToUser = async (userId: string, assignedStreamIds: string[]) => {
    await adminApi.assignStreamsToUser(userId, assignedStreamIds);

    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? { ...u, assignedStreams: assignedStreamIds, streamCount: assignedStreamIds.length }
          : u
      )
    );
  };

  const openDeleteForStream = (s: Stream) =>
    setDeleteTarget({ type: 'stream', id: s.id, label: s.address });

  const openDeleteForUser = (u: User) =>
    setDeleteTarget({ type: 'user', id: u.id, label: u.login });

  const selectedUser = users.find(u => u.id === selectedUserId) ?? null;

  if (loading) {
    return <div className={styles.container}>Загрузка...</div>;
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
