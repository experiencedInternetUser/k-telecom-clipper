import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './UsersTab.module.css';
import type { Stream, AdminUser } from '../../types/Admin';

interface Props {
  users: AdminUser[];
  streams: Stream[];
  selectedUserId?: string | null;
  onSelectUser?: (id: string) => void;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onAssign: (userId: string, assigned: string[]) => void;
}

const ITEMS_PER_PAGE = 10;

const UsersTab: React.FC<Props> = ({ users, streams, selectedUserId = null, onSelectUser, onEdit, onDelete, onAssign }) => {
  const [localSelected, setLocalSelected] = useState<string | null>(selectedUserId ?? (users[0]?.id ?? null));
  const initializedRef = useRef(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    if (selectedUserId && selectedUserId !== localSelected) {
      setLocalSelected(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (!initializedRef.current && users.length > 0) {
      initializedRef.current = true;
      if (!localSelected) {
        setLocalSelected(users[0].id);
        onSelectUser?.(users[0].id);
      }
    }
  }, [users, onSelectUser]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(streams.length / ITEMS_PER_PAGE));
    setTotalPages(tp);
    if (currentPage > tp) setCurrentPage(tp);
  }, [streams, currentPage]);

  const selectedUser = useMemo(() => users.find(u => u.id === localSelected) ?? null, [users, localSelected]);

  const handleSelectUser = (id: string) => {
    setLocalSelected(id);
    onSelectUser?.(id);
  };

  const handleToggleAccess = (streamId: string) => {
    if (!selectedUser) return;
    const prevAssigned = selectedUser.assignedStreams ?? [];
    const newAssigned = prevAssigned.includes(streamId)
      ? prevAssigned.filter(id => id !== streamId)
      : [...prevAssigned, streamId];
    onAssign(selectedUser.id, newAssigned);
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedStreams = streams.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    const el = document.querySelector(`.${styles.right}`);
    if (el) (el as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    const pages: React.ReactNode[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    pages.push(
      <button key="prev" className={`${styles.navButton} ${currentPage === 1 ? styles.disabledNav : ''}`} onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
        ‹ Назад
      </button>
    );

    if (start > 1) {
      pages.push(<button key={1} className={styles.pageNumber} onClick={() => goToPage(1)}>1</button>);
      if (start > 2) pages.push(<span key="ellipsis1" className={styles.ellipsis}>…</span>);
    }

    for (let p = start; p <= end; p++) {
      pages.push(
        <button key={p} className={`${styles.pageNumber} ${currentPage === p ? styles.activePage : ''}`} onClick={() => goToPage(p)} aria-current={currentPage === p ? 'page' : undefined}>
          {p}
        </button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<span key="ellipsis2" className={styles.ellipsis}>…</span>);
      pages.push(<button key={totalPages} className={styles.pageNumber} onClick={() => goToPage(totalPages)}>{totalPages}</button>);
    }

    pages.push(
      <button key="next" className={`${styles.navButton} ${currentPage === totalPages ? styles.disabledNav : ''}`} onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
        Дальше ›
      </button>
    );

    return pages;
  };

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <div className={styles.usersList}>
          {users.map(user => {
            const isActive = user.id === localSelected;
            return (
              <div key={user.id} className={`${styles.userItem} ${isActive ? styles.userItemActive : ''}`}
                   onClick={() => handleSelectUser(user.id)}
                   role="button"
                   tabIndex={0}
                   onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelectUser(user.id); }}>
                <span className={styles.userLogin}>{user.login}</span>
              </div>
            );
          })}
          {users.length === 0 && <div className={styles.empty}>Пользователей нет</div>}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.streamsTableContainer}>
          <table className={styles.streamsTable}>
            <thead>
              <tr>
                <th className={styles.rtspHeader}>URL потока</th>
                <th className={styles.addressHeader}>Описание</th>
                <th className={styles.accessHeader}>Доступ</th>
              </tr>
            </thead>
            <tbody>
              {displayedStreams.map(stream => {
                const assignedToUser = selectedUser?.assignedStreams?.includes(String(stream.id)) ?? false;
                return (
                  <tr key={stream.id} className={styles.streamRow}>
                    <td className={styles.rtspCell}><div className={styles.rtspUrl}>{stream.url}</div></td>
                    <td className={styles.addressCell}><div className={styles.cameraAddress}>{stream.description}</div></td>
                    <td className={styles.accessCell}>
                      <input type="checkbox" checked={assignedToUser} onChange={() => handleToggleAccess(String(stream.id))} disabled={!selectedUser} aria-label={`Доступ к ${stream.description}`} />
                    </td>
                  </tr>
                );
              })}
              {displayedStreams.length === 0 && (
                <tr><td colSpan={3} className={styles.emptyCell}>Видеопотоков нет</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={styles.paginationWrap}>
            <div className={styles.pagination}>{renderPagination()}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersTab;
