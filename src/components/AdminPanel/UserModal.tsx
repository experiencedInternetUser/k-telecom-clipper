import React, { useEffect, useState } from 'react';
import styles from './UserModal.module.css';
import type { User, UserForm } from '../../types/Admin';

interface Props {
  user?: User | null;
  onClose: () => void;
  onSubmit: (payload: UserForm) => void;
}

const UserModal: React.FC<Props> = ({ user, onClose, onSubmit }) => {
  const [form, setForm] = useState<UserForm>({
    login: '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        login: user.login,
        password: user.password ?? ''
      });
    } else {
      setForm({ login: '', password: '' });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.login.trim()) return;
    onSubmit(form);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{user ? 'Редактировать пользователя' : 'Создать пользователя'}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Логин</label>
            <input name="login" value={form.login} onChange={handleChange} required />
          </div>

          <div className={styles.formGroup}>
            <label>Пароль</label>
            <input name="password" value={form.password} onChange={handleChange} type="password" />
            {/* подсказка удалена */}
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.submitButton}>Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
