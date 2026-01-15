import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPanel.module.css";

import type { Stream, AdminUser, NewStreamForm } from "../../types/Admin";
import StreamsTab from "./StreamsTab";
import UsersTab from "./UsersTab";
import StreamModal from "./StreamModal";
import DeleteModal from "./DeleteModal";
import SearchBar from "./SearchBar";

import { adminApi, createPermission, deletePermission, getPermissionsForStream } from "../../api/admin.api";

const ITEMS_PER_PAGE = 10;

type DeleteTarget = {
  type: "stream" | "user";
  id: number;
  label?: string;
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<"streams" | "users">("streams");

  const [streams, setStreams] = useState<Stream[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [isStreamModalOpen, setStreamModalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [streamsRes, usersRes] = await Promise.all([
          adminApi.getStreams(),
          adminApi.getUsers(),
        ]);
        setStreams(streamsRes);
        setUsers(usersRes);
      } catch (e) {
        console.error("ADMIN LOAD ERROR", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ---------- FILTER ---------- */
  const filteredStreams = useMemo(() => {
    if (!query.trim()) return streams;
    return streams.filter((s) =>
      `${s.url} ${s.description}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [streams, query]);

  /* ---------- PAGINATION ---------- */
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

  /* ---------- STREAM CRUD ---------- */
  // const handleCreateStream = async (payload: {
  //   url: string;
  //   description: string;
  //   userIds: number[];
  // }) => {
  //   const stream = await adminApi.createStream({
  //     url: payload.url,
  //     description: payload.description,
  //   });

  //   for (const userId of payload.userIds) {
  //     await adminApi.createPermission({
  //       user_id: userId,
  //       stream_id: stream.id,
  //       can_read: true,
  //       can_update: true,
  //     });
  //   }

  //   setStreams((prev) => [stream, ...prev]);
  //   setStreamModalOpen(false);
  // };

const handleCreateStream = async (data: NewStreamForm) => {
  const stream = await adminApi.createStream({
    url: data.url,
    description: data.description,
  });

  const users = Array.isArray(data.selectedUsers)
    ? data.selectedUsers
    : [];

  if (users.length > 0) {
    await Promise.all(
      users.map((userId) =>
        createPermission({
          user_id: userId,
          stream_id: stream.id,
        })
      )
    );
  }

  setStreams((prev) => [stream, ...prev]);
  setStreamModalOpen(false);
};


const handleUpdateStream = async (
  streamId: number,
  data: { url: string; description: string; userIds: number[] }
) => {
  // 1. обновляем поток на сервере
  const updatedStream = await adminApi.updateStream(streamId, {
    url: data.url,
    description: data.description,
  });

  const nextUserIds = Array.isArray(data.userIds) ? data.userIds : [];

  // 2. получаем текущие permissions
  const { data: permissions } = await getPermissionsForStream(streamId);

  // 3. удаляем старые permissions
  if (Array.isArray(permissions) && permissions.length > 0) {
    await Promise.all(
      permissions.map((p: any) => deletePermission(p.id))
    );
  }

  // 4. создаём новые permissions
  if (nextUserIds.length > 0) {
    await Promise.all(
      nextUserIds.map((userId) =>
        createPermission({
          user_id: userId,
          stream_id: streamId,
        })
      )
    );
  }

  // ✅ 5. ОБНОВЛЯЕМ STREAMS В STATE
  setStreams((prev) =>
    prev.map((s) => (s.id === streamId ? updatedStream : s))
  );

  setStreamModalOpen(false);
  setEditingStream(null);
};







  const handleDeleteStream = async (id: number) => {
    await adminApi.deleteStream(id);
    setStreams((prev) => prev.filter((s) => s.id !== id));
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className={styles.container}>Загрузка…</div>;
  }

  /* ---------- RENDER ---------- */
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={activeTab === "streams" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("streams")}
        >
          Видеопотоки
        </button>
        <button
          className={activeTab === "users" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("users")}
        >
          Пользователи
        </button>
      </div>

      {activeTab === "streams" && (
        <>
          <div className={styles.controls}>
            <button
              className={styles.createButton}
              onClick={() => {
                setEditingStream(null);
                setStreamModalOpen(true);
              }}
            >
              Создать поток +
            </button>

            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Поиск потоков"
            />
          </div>

          <StreamsTab
            streams={paginatedStreams}
            onEdit={(s) => {
              setEditingStream(s);
              setStreamModalOpen(true);
            }}
            onDelete={(s) =>
              setDeleteTarget({
                type: "stream",
                id: s.id,
                label: s.description,
              })
            }
          />

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹ Назад
              </button>

              <span>
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Дальше ›
              </button>
            </div>
          )}
        </>
      )}

      {isStreamModalOpen && (
        <StreamModal
          stream={editingStream}
          users={users}
          onClose={() => {
            setEditingStream(null);
            setStreamModalOpen(false);
          }}
          onSubmit={(payload) =>
            editingStream
              ? handleUpdateStream(editingStream.id, payload)
              : handleCreateStream(payload)
          }
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
