/* eslint-disable @typescript-eslint/no-explicit-any */

// --------- DIAGNOSTIC HELPERS ----------
const filterPermissionsForStream = (perms: any[], streamId: number) => {
  if (!Array.isArray(perms)) return [];
  const filtered = perms.filter(p => Number(p.stream_id) === Number(streamId) || Number(p.stream_id) === streamId);
  return filtered;
};

const logSharedUserReferences = (streamsToCheck: any[], label = '') => {
  try {
    const refs: { userId: string; streams: number[] }[] = [];
    for (let i = 0; i < streamsToCheck.length; i++) {
      for (let j = i + 1; j < streamsToCheck.length; j++) {
        (streamsToCheck[i].users || []).forEach((u1: any) => {
          (streamsToCheck[j].users || []).forEach((u2: any) => {
            if (u1 === u2) {
              const found = refs.find(r => r.userId === u1.id);
              if (found) {
                if (!found.streams.includes(streamsToCheck[i].id)) found.streams.push(streamsToCheck[i].id);
                if (!found.streams.includes(streamsToCheck[j].id)) found.streams.push(streamsToCheck[j].id);
              } else {
                refs.push({ userId: u1.id, streams: [streamsToCheck[i].id, streamsToCheck[j].id] });
              }
            }
          });
        });
      }
    }
    console.log(`DIAG${label}: shared reference users across streams (should be empty):`, refs);
  } catch (err) {
    console.warn('logSharedUserReferences error', err);
  }
};
// ---------------------------------------


// src/components/AdminPanel/index.tsx
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPanel.module.css";

import type { Stream, AdminUser, NewStreamForm, StreamWithUsers } from "../../types/Admin";
import StreamsTab from "./StreamsTab";
import UsersTab from "./UsersTab";
import StreamModal from "./StreamModal";
import DeleteModal from "./DeleteModal";
import SearchBar from "./SearchBar";

import { adminApi, createPermission, deletePermission, getPermissionsForStream } from "../../api/admin.api";
import UserModal from "./UserModal";

const ITEMS_PER_PAGE = 10;

type DeleteTarget = {
  type: "stream" | "user";
  id: number;
  label?: string;
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<"streams" | "users">("streams");

  const [streams, setStreams] = useState<StreamWithUsers[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingStream, setEditingStream] = useState<StreamWithUsers | null>(null);
  const [isStreamModalOpen, setStreamModalOpen] = useState(false);
  const [isUserModalOpen, setUserModalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // -------------------- HELPERS --------------------
  const applyAssignedStreamsForStream = (streamId: number, newUserIds: number[]) => {
    const sid = String(streamId);
    setUsers((prev) =>
      prev.map((u) => {
        const has = (u.assignedStreams ?? []).includes(sid);
        const should = newUserIds.includes(Number(u.id));
        if (should && !has) {
          return { ...u, assignedStreams: [...(u.assignedStreams ?? []), sid] };
        }
        if (!should && has) {
          return { ...u, assignedStreams: (u.assignedStreams ?? []).filter((x) => x !== sid) };
        }
        return u;
      })
    );
  };

  const buildStreamWithUsers = (stream: Stream, userIds: number[], globalUsers: AdminUser[]): StreamWithUsers => {
    const clonedUsers = userIds
      .map(uid => {
        const u = globalUsers.find((x) => Number(x.id) === uid);
        return u ? { ...u } : null;
      })
      .filter(Boolean) as AdminUser[];
    return { ...stream, users: clonedUsers };
  };

  // -------------------- LOAD DATA --------------------
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [streamsRes, usersRes] = await Promise.all([
          adminApi.getStreams(),
          adminApi.getUsers(),
        ]);

        const usersCloned = usersRes.map((u) => ({ ...u, assignedStreams: [...(u.assignedStreams ?? [])] }));

        const streamsWithUsers: StreamWithUsers[] = await Promise.all(
          streamsRes.map(async (stream) => {
// внутри streamsRes.map(async (stream) => { ... })
const { data: permissionsRaw } = await getPermissionsForStream(stream.id);

// DEBUG: логируем "сырые" permissions и их stream_id'ы
console.log(`PERMS RAW for stream ${stream.id}:`, permissionsRaw);

// Фильтруем по stream_id (защита от бекенд-ошибок)
const permissions = filterPermissionsForStream(Array.isArray(permissionsRaw) ? permissionsRaw : permissionsRaw?.data ?? [], stream.id);

console.log(`PERMS FILTERED for stream ${stream.id}:`, permissions.map((p:any) => ({ id: p.id, user_id: p.user_id, stream_id: p.stream_id })));

// собираем айдишники пользователей
const userIds = permissions.map((p: any) => Number(p.user_id));

const streamUsers = usersCloned
  .filter((u) => userIds.includes(Number(u.id)))
  .map((u) => ({ ...u })); // обязательно клонируем объекты пользователей

return {
  ...stream,
  users: streamUsers,
};

          })
        );

        // assignedStreams для глобальных пользователей
        const assignedMap = new Map<string, string[]>();
        streamsWithUsers.forEach((s) => {
          const sid = String(s.id);
          (s.users ?? []).forEach((u) => {
            const arr = assignedMap.get(u.id) ?? [];
            arr.push(sid);
            assignedMap.set(u.id, arr);
          });
        });

        const usersWithAssigned = usersCloned.map((u) => ({
          ...u,
          assignedStreams: assignedMap.get(u.id) ?? [],
        }));

        setStreams(streamsWithUsers);
        setUsers(usersWithAssigned);
      } catch (e) {
        console.error("ADMIN LOAD ERROR", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // -------------------- FILTER / PAGINATION --------------------
  const filteredStreams = useMemo(() => {
    if (!query.trim()) return streams;
    return streams.filter((s) =>
      `${s.url} ${s.description}`.toLowerCase().includes(query.toLowerCase())
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

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // -------------------- CREATE USER HANDLER --------------------
  const handleCreateUser = async (payload: { login: string; email: string; password: string }) => {
    try {
      const newUser = await adminApi.createUser(payload); // используем API
      setUsers(prev => [...prev, { ...newUser, assignedStreams: [] }]);
      setUserModalOpen(false);
    } catch (err) {
      console.error("Ошибка при создании пользователя:", err);
    }
  };

  // -------------------- STREAM CRUD --------------------
  const handleCreateStream = async (data: NewStreamForm) => {
    const stream = await adminApi.createStream({ url: data.url, description: data.description });
    const userIds = Array.isArray(data.userIds) ? data.userIds : [];

    if (userIds.length > 0) {
      await Promise.all(userIds.map((uid) => createPermission({ user_id: uid, stream_id: stream.id })));
    }

    const streamWithUsers = buildStreamWithUsers(stream, userIds, users);

    setStreams((prev) => [streamWithUsers, ...prev.map(s => ({ ...s, users: s.users.map(u => ({ ...u })) }))]);
    if (userIds.length > 0) applyAssignedStreamsForStream(stream.id, userIds);

    setStreamModalOpen(false);
  };

  const handleUpdateStream = async (streamId: number, data: NewStreamForm) => {
    await adminApi.updateStream(streamId, { url: data.url, description: data.description });

    const { data: permissionsRaw } = await getPermissionsForStream(streamId);
console.log('UPDATE PERMS RAW for stream', streamId, permissionsRaw);

const permissionsForThisStream = filterPermissionsForStream(Array.isArray(permissionsRaw) ? permissionsRaw : permissionsRaw?.data ?? [], streamId);

console.log('UPDATE PERMS FILTERED for stream', streamId, permissionsForThisStream.map((p:any)=>({id:p.id,user_id:p.user_id,stream_id:p.stream_id})));

if (permissionsForThisStream.length > 0) {
  await Promise.all(permissionsForThisStream.map((p: any) => deletePermission(p.id)));
}

    await Promise.all(permissions.map((p: any) => deletePermission(p.id)));

    const newUserIds = Array.isArray(data.userIds) ? data.userIds : [];
    await Promise.all(newUserIds.map((uid) => createPermission({ user_id: uid, stream_id: streamId })));

    setStreams((prev) =>
      prev.map((s) => {
        const clonedUsers = (s.users ?? []).map(u => ({ ...u }));
        if (s.id !== streamId) return { ...s, users: clonedUsers };

        const updatedUsers = users.filter((u) => newUserIds.includes(Number(u.id))).map(u => ({ ...u }));
        return { ...s, url: data.url, description: data.description, users: updatedUsers };
      })
    );

    applyAssignedStreamsForStream(streamId, newUserIds);
    setEditingStream(null);
    setStreamModalOpen(false);
  };

  const handleDeleteStream = async (id: number) => {
    await adminApi.deleteStream(id);
    setStreams((prev) => prev.filter((s) => s.id !== id));
    setUsers((prev) =>
      prev.map((u) => ({ ...u, assignedStreams: (u.assignedStreams ?? []).filter(x => x !== String(id)) }))
    );
    setDeleteTarget(null);
  };

  // -------------------- ASSIGN USERS --------------------
  const handleAssign = async (userId: string, newAssigned: string[]) => {
    const prevUser = users.find(u => u.id === userId);
    const prevAssigned = prevUser?.assignedStreams ?? [];

    const toAdd = newAssigned.filter(id => !prevAssigned.includes(id));
    const toRemove = prevAssigned.filter(id => !newAssigned.includes(id));

    await Promise.all(toAdd.map((sid) => createPermission({ user_id: Number(userId), stream_id: Number(sid) })));
    await Promise.all(toRemove.map(async (sid) => {
      const { data: perms } = await getPermissionsForStream(Number(sid));
      const perm = perms.find((p: any) => p.user_id === Number(userId));
      if (perm) await deletePermission(perm.id);
    }));

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, assignedStreams: [...newAssigned] } : u)));
    
    setStreams((prev) =>
      prev.map((s) => {
        const sid = String(s.id);
        let cur = (s.users ?? []).map(u => ({ ...u }));

        if (toAdd.includes(sid)) {
          const u = users.find(x => x.id === userId);
          if (u && !cur.some(x => x.id === userId)) cur = [...cur, { ...u }];
          return { ...s, users: cur };
        }

        if (toRemove.includes(sid)) {
          cur = cur.filter(x => x.id !== userId).map(x => ({ ...x }));
          return { ...s, users: cur };
        }

        return { ...s, users: cur };
      })
    );
  };

  if (loading) return <div className={styles.container}>Загрузка…</div>;

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button className={activeTab === "streams" ? styles.activeTab : styles.tab} onClick={() => setActiveTab("streams")}>Видеопотоки</button>
        <button className={activeTab === "users" ? styles.activeTab : styles.tab} onClick={() => setActiveTab("users")}>Пользователи</button>
      </div>

      {activeTab === "streams" && (
        <>
          <div className={styles.controls}>
            <button className={styles.createButton} onClick={() => { setEditingStream(null); setStreamModalOpen(true); }}>Создать поток +</button>
            <SearchBar value={query} onChange={setQuery} placeholder="Поиск потоков" />
          </div>

          <StreamsTab
            streams={paginatedStreams}
            onEdit={(s) => { setEditingStream(s); setStreamModalOpen(true); }}
            onDelete={(s) => setDeleteTarget({ type: "stream", id: s.id, label: s.description })}
          />

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>‹ Назад</button>
              <span>{currentPage} / {totalPages}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Дальше ›</button>
            </div>
          )}
        </>
      )}
      {activeTab === "users" && (
        <>
          <div className={styles.controls}>
            <button
              className={styles.createButton}
              onClick={() => setUserModalOpen(true)}
            >
              Добавить пользователя +
            </button>
          </div>

          <UsersTab
            users={users}
            streams={streams}
            onSelectUser={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            onAssign={handleAssign}
          />

          {isUserModalOpen && (
            <UserModal
              user={null} // создание нового
              onClose={() => setUserModalOpen(false)}
              onSubmit={handleCreateUser}
            />
          )}
        </>
      )}

      {isStreamModalOpen && (
        <StreamModal
          stream={editingStream}
          users={users}
          onClose={() => { setEditingStream(null); setStreamModalOpen(false); }}
          onSubmit={(payload) => editingStream ? handleUpdateStream(editingStream.id, payload) : handleCreateStream(payload)}
        />
      )}

      {deleteTarget && deleteTarget.type === "stream" && (
        <DeleteModal
          type="stream"
          itemLabel={deleteTarget.label}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDeleteStream(deleteTarget.id)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
