import React from 'react';
import styles from './StreamsTab.module.css';
import type { StreamWithUsers } from '../../types/Admin';

interface Props {
  streams: StreamWithUsers[];
  onEdit: (s: StreamWithUsers) => void;
  onDelete: (s: StreamWithUsers) => void;
}

const MAX_VISIBLE_USERS = 2;

const StreamsTab: React.FC<Props> = ({ streams, onEdit, onDelete }) => {
  return (
    <div className={styles.container}>
      <div className={styles.streamsTableContainer}>
        <table className={styles.streamsTable}>
          <thead>
            <tr>
              <th>RTSP-адрес потока</th>
              <th>Адрес камеры</th>
              <th>Доступно пользователям</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {streams.map((s) => {
              const users = s.users ?? [];
              const visibleUsers = users.slice(0, MAX_VISIBLE_USERS);
              const hiddenCount = users.length - visibleUsers.length;

              return (
                <tr key={s.id} className={styles.streamRow}>
                  <td><div className={styles.rtspUrl}>{s.url}</div></td>
                  <td><div className={styles.address}>{s.description}</div></td>

                  <td className={styles.usersCell}>
                    <div className={styles.userLogins}>
                      {visibleUsers.map((u) => (
                        <span key={u.id} className={styles.userLogin}>
                          {u.login}
                        </span>
                      ))}

                      {hiddenCount > 0 && (
                        <span className={styles.moreUsers}>+{hiddenCount}</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className={styles.rowActions}>
                      <button onClick={() => onEdit(s)}>✏️</button>
                      <button onClick={() => onDelete(s)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}


            {streams.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  Потоков нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StreamsTab;
