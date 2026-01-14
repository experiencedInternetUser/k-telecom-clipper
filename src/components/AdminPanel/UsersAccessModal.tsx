import React, { useState } from 'react';
import styles from './UsersAccessModal.module.css';
import type { User } from '../../types/Admin';

interface Props {
  title: string;
  address?: string;
  userIds: string[];
  allUsers: User[];
  onClose: () => void;
  onApply: (selected: string[]) => void;
}

const UsersAccessModal: React.FC<Props> = ({ title, address, userIds, allUsers, onClose, onApply }) => {
  const [selected, setSelected] = useState<string[]>(userIds || []);

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeX} onClick={onClose}>✕</button>
        </div>

        {/* {address && <div className={styles.address}>{address}</div>} */}
        <div className={styles.address}>Пользователи с доступом</div>
        <div className={styles.chipList}>
          {allUsers.map(u => {
            const isSelected = selected.includes(u.id);
            return (
              <div
                key={u.id}
                className={`${styles.chip} ${isSelected ? styles.chipSelected : ''}`}
                tabIndex={0}
                onClick={() => toggle(u.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(u.id); } }}
              >
                {u.login}
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Отмена</button>
          <button className={styles.applyBtn} onClick={() => onApply(selected)}>Применить</button>
        </div>
      </div>
    </div>
  );
};

export default UsersAccessModal;
