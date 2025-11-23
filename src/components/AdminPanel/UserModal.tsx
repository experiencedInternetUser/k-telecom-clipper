import React, { useEffect, useRef, useState } from 'react';
import styles from './UserModal.module.css';
import type { User, UserForm } from '../../types/Admin';

interface Props {
  user?: User | null;
  onClose: () => void;
  onSubmit: (payload: UserForm) => void;
}

const UserModal: React.FC<Props> = ({ user = null, onClose, onSubmit }) => {
  const [login, setLogin] = useState(user?.login ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSubmit({ login: login.trim(), password, email: email.trim() });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>{user ? 'Изменить пользователя' : 'Создать пользователя'}</h3>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>Логин</label>
          <input ref={inputRef} value={login} onChange={e => setLogin(e.target.value)} required />

          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />

          <label>Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.submitBtn}>{user ? 'Сохранить' : 'Создать'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
