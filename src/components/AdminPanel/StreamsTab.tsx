import React from 'react';
import styles from './StreamsTab.module.css';
import type { Stream } from '../../types/Admin';

interface Props {
  streams: Stream[];
  onEdit: (s: Stream) => void;
  onDelete: (s: Stream) => void;
}

const StreamsTab: React.FC<Props> = ({ streams, onEdit, onDelete }) => {
  return (
    <div className={styles.container}>
      <div className={styles.streamsTableContainer}>
        <table className={styles.streamsTable}>
          <thead>
            <tr>
              <th>URL потока</th>
              <th>Описание</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {streams.map(s => (
              <tr key={s.id} className={styles.streamRow}>
                <td>
                  <div className={styles.rtspUrl}>{s.url}</div>
                </td>

                <td>
                  <div className={styles.address}>{s.description}</div>
                </td>

                <td>
                  <div className={styles.rowActions}>
                    <button onClick={() => onEdit(s)}>✏️</button>
                    <button onClick={() => onDelete(s)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}

            {streams.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.emptyCell}>
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
