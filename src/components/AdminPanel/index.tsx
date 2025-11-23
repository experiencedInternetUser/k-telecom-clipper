import React, { useEffect, useMemo, useState } from 'react';
import styles from './AdminPanel.module.css';
import type { Stream, User, NewStreamForm, UserForm } from '../../types/Admin';
import StreamsTab from './StreamsTab';
import UsersTab from './UsersTab';
import StreamModal from './StreamModal';
import UserModal from './UserModal';
import DeleteModal from './DeleteModal';
import SearchBar from './SearchBar';

// mock data (оставляем вашу существующую структуру mock'ов)
const mockStreams: Stream[] = [
  { id: 's1', rtspUrl: 'rtsp://camera1/stream', address: 'г. Екатеринбург, ул. Гагарина, д. 23', entrance: 'под. 2', userCount: 2, isOnline: true, lastActive: '', assignedUsers: ['u1','u2'] },
  { id: 's2', rtspUrl: 'rtsp://camera2/stream', address: 'г. Екатеринбург, ул. Ленина, д. 10', entrance: 'под. 1', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's3', rtspUrl: 'rtsp://camera3/stream', address: 'г. Екатеринбург, ул. Мира, д. 7', entrance: 'под. 3', userCount: 1, isOnline: false, lastActive: '', assignedUsers: ['u1'] },

  // +20 дополнительных (s4..s23)
  { id: 's4', rtspUrl: 'rtsp://camera4/stream', address: 'г. Казань, ул. Пушкина, д. 12', entrance: 'под. 1', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's5', rtspUrl: 'rtsp://camera5/stream', address: 'г. Москва, ул. Тверская, д. 5', entrance: 'под. 2', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's6', rtspUrl: 'rtsp://camera6/stream', address: 'г. Санкт-Петербург, Невский пр., д. 45', entrance: 'под. 1', userCount: 1, isOnline: true, lastActive: '', assignedUsers: ['u3'] },
  { id: 's7', rtspUrl: 'rtsp://camera7/stream', address: 'г. Новосибирск, ул. Советская, д. 2', entrance: 'под. 1', userCount: 0, isOnline: false, lastActive: '', assignedUsers: [] },
  { id: 's8', rtspUrl: 'rtsp://camera8/stream', address: 'г. Екатеринбург, ул. Гагарина, д. 25', entrance: 'под. 1', userCount: 3, isOnline: true, lastActive: '', assignedUsers: ['u4','u5','u6'] },
  { id: 's9', rtspUrl: 'rtsp://camera9/stream', address: 'г. Краснодар, ул. Лесная, д. 9', entrance: 'под. 2', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's10', rtspUrl: 'rtsp://camera10/stream', address: 'г. Ростов-на-Дону, ул. Садовая, д. 3', entrance: 'под. 1', userCount: 1, isOnline: true, lastActive: '', assignedUsers: ['u7'] },
  { id: 's11', rtspUrl: 'rtsp://camera11/stream', address: 'г. Уфа, ул. Ленина, д. 8', entrance: 'под. 2', userCount: 0, isOnline: false, lastActive: '', assignedUsers: [] },
  { id: 's12', rtspUrl: 'rtsp://camera12/stream', address: 'г. Воронеж, пр. Революции, д. 14', entrance: 'под. 1', userCount: 2, isOnline: true, lastActive: '', assignedUsers: ['u8','u9'] },
  { id: 's13', rtspUrl: 'rtsp://camera13/stream', address: 'г. Самара, ул. Солнечная, д. 6', entrance: 'под. 3', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's14', rtspUrl: 'rtsp://camera14/stream', address: 'г. Ярославль, ул. Лермонтова, д. 11', entrance: 'под. 1', userCount: 0, isOnline: false, lastActive: '', assignedUsers: [] },
  { id: 's15', rtspUrl: 'rtsp://camera15/stream', address: 'г. Тюмень, ул. Мира, д. 18', entrance: 'под. 2', userCount: 1, isOnline: true, lastActive: '', assignedUsers: ['u10'] },
  { id: 's16', rtspUrl: 'rtsp://camera16/stream', address: 'г. Омск, ул. Петрова, д. 7', entrance: 'под. 1', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's17', rtspUrl: 'rtsp://camera17/stream', address: 'г. Челябинск, ул. Победы, д. 4', entrance: 'под. 2', userCount: 2, isOnline: true, lastActive: '', assignedUsers: ['u11','u12'] },
  { id: 's18', rtspUrl: 'rtsp://camera18/stream', address: 'г. Пермь, ул. Комсомольская, д. 20', entrance: 'под. 1', userCount: 0, isOnline: false, lastActive: '', assignedUsers: [] },
  { id: 's19', rtspUrl: 'rtsp://camera19/stream', address: 'г. Томск, ул. Кирова, д. 9', entrance: 'под. 3', userCount: 1, isOnline: true, lastActive: '', assignedUsers: ['u13'] },
  { id: 's20', rtspUrl: 'rtsp://camera20/stream', address: 'г. Владивосток, ул. Океанская, д. 2', entrance: 'под. 1', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's21', rtspUrl: 'rtsp://camera21/stream', address: 'г. Нижний Новгород, ул. Большая Покровская, д. 10', entrance: 'под. 1', userCount: 0, isOnline: true, lastActive: '', assignedUsers: [] },
  { id: 's22', rtspUrl: 'rtsp://camera22/stream', address: 'г. Ижевск, ул. Горького, д. 5', entrance: 'под. 2', userCount: 0, isOnline: false, lastActive: '', assignedUsers: [] },
  { id: 's23', rtspUrl: 'rtsp://camera23/stream', address: 'г. Иркутск, ул. Байкальская, д. 30', entrance: 'под. 1', userCount: 1, isOnline: true, lastActive: '', assignedUsers: ['u14'] },
];

const mockUsers: User[] = [
  { id: 'u1', login: 'ivan', email: 'ivan@example.com', registrationDate: '2023-01-01', lastLogin: '2023-11-21', streamCount: 3, isActive: true, assignedStreams: ['s1','s3','s12'] },
  { id: 'u2', login: 'olga', email: 'olga@example.com', registrationDate: '2023-02-12', lastLogin: '2023-11-20', streamCount: 1, isActive: true, assignedStreams: ['s1'] },
  { id: 'u3', login: 'petr', email: 'petr@example.com', registrationDate: '2023-03-05', lastLogin: '2023-11-19', streamCount: 1, isActive: true, assignedStreams: ['s6'] },

  // +20 дополнительных (u4..u23)
  { id: 'u4', login: 'anna', email: 'anna@example.com', registrationDate: '2023-04-01', lastLogin: '2023-11-19', streamCount: 1, isActive: true, assignedStreams: ['s8'] },
  { id: 'u5', login: 'oleg', email: 'oleg@example.com', registrationDate: '2023-05-02', lastLogin: '2023-11-18', streamCount: 1, isActive: true, assignedStreams: ['s8'] },
  { id: 'u6', login: 'maria', email: 'maria@example.com', registrationDate: '2023-05-10', lastLogin: '2023-11-17', streamCount: 1, isActive: true, assignedStreams: ['s8'] },
  { id: 'u7', login: 'sergey', email: 'sergey@example.com', registrationDate: '2023-06-03', lastLogin: '2023-11-16', streamCount: 1, isActive: true, assignedStreams: ['s10'] },
  { id: 'u8', login: 'elena', email: 'elena@example.com', registrationDate: '2023-06-21', lastLogin: '2023-11-15', streamCount: 1, isActive: true, assignedStreams: ['s12'] },
  { id: 'u9', login: 'nikita', email: 'nikita@example.com', registrationDate: '2023-07-01', lastLogin: '2023-11-14', streamCount: 1, isActive: true, assignedStreams: ['s12'] },
  { id: 'u10', login: 'dmitry', email: 'dmitry@example.com', registrationDate: '2023-07-11', lastLogin: '2023-11-13', streamCount: 1, isActive: true, assignedStreams: ['s15'] },
  { id: 'u11', login: 'sveta', email: 'sveta@example.com', registrationDate: '2023-07-21', lastLogin: '2023-11-12', streamCount: 1, isActive: true, assignedStreams: ['s17'] },
  { id: 'u12', login: 'andrey', email: 'andrey@example.com', registrationDate: '2023-08-01', lastLogin: '2023-11-11', streamCount: 1, isActive: true, assignedStreams: ['s17'] },
  { id: 'u13', login: 'irina', email: 'irina@example.com', registrationDate: '2023-08-14', lastLogin: '2023-11-10', streamCount: 1, isActive: true, assignedStreams: ['s19'] },
  { id: 'u14', login: 'max', email: 'max@example.com', registrationDate: '2023-09-01', lastLogin: '2023-11-09', streamCount: 1, isActive: true, assignedStreams: ['s23'] },
  { id: 'u15', login: 'katya', email: 'katya@example.com', registrationDate: '2023-09-11', lastLogin: '2023-11-08', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u16', login: 'vlad', email: 'vlad@example.com', registrationDate: '2023-09-18', lastLogin: '2023-11-07', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u17', login: 'yulia', email: 'yulia@example.com', registrationDate: '2023-10-02', lastLogin: '2023-11-06', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u18', login: 'roman', email: 'roman@example.com', registrationDate: '2023-10-10', lastLogin: '2023-11-05', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u19', login: 'lena', email: 'lena@example.com', registrationDate: '2023-10-21', lastLogin: '2023-11-04', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u20', login: 'igor', email: 'igor@example.com', registrationDate: '2023-11-01', lastLogin: '2023-11-03', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u21', login: 'zoya', email: 'zoya@example.com', registrationDate: '2023-11-11', lastLogin: '2023-11-02', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u22', login: 'kostya', email: 'kostya@example.com', registrationDate: '2023-11-15', lastLogin: '2023-11-01', streamCount: 0, isActive: true, assignedStreams: [] },
  { id: 'u23', login: 'nastya', email: 'nastya@example.com', registrationDate: '2023-11-18', lastLogin: '2023-10-31', streamCount: 0, isActive: true, assignedStreams: [] },
];
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

  // --- CRUD simplified for demo (синхронизация users/streams) ---
  const handleCreateStream = (data: NewStreamForm) => {
    const newStreamId = Date.now().toString();
    const assigned = data.selectedUsers || [];
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
    setStreamModalOpen(false);
  };

  const handleUpdateStream = (streamId: string, payload: Partial<Stream> & Partial<NewStreamForm>) => {
    setStreams(prev => prev.map(s => s.id === streamId ? { ...s, ...payload } : s));
    setEditingStream(null);
    setStreamModalOpen(false);
  };

  const handleDeleteStreamConfirmed = (id: string) => {
    setStreams(prev => prev.filter(s => s.id !== id));
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
  // 1) Обновляем users: присваиваем выбранному пользователю новый массив assignedStreams
  setUsers(prevUsers =>
    prevUsers.map(u => {
      if (u.id === userId) {
        return { ...u, assignedStreams: assignedStreamIds, streamCount: assignedStreamIds.length };
      }
      return u;
    })
  );

  // 2) Обновляем streams: для каждого потока добавляем/убираем userId в assignedUsers, корректируем userCount
  setStreams(prevStreams =>
    prevStreams.map(s => {
      const wasAssigned = (s.assignedUsers ?? []).includes(userId);
      const shouldBeAssigned = assignedStreamIds.includes(s.id);

      if (shouldBeAssigned && !wasAssigned) {
        // добавляем пользователя в поток
        const updatedAssigned = [...(s.assignedUsers ?? []), userId];
        return { ...s, assignedUsers: updatedAssigned, userCount: updatedAssigned.length };
      }

      if (!shouldBeAssigned && wasAssigned) {
        // удаляем пользователя из потока
        const updatedAssigned = (s.assignedUsers ?? []).filter(uid => uid !== userId);
        return { ...s, assignedUsers: updatedAssigned, userCount: updatedAssigned.length };
      }

      // если ничего не меняется
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
