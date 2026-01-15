import React, { useEffect, useRef, useState } from 'react';
import styles from './UserModal.module.css';
import type { UserForm } from '../../types/Admin';

interface Props {
  user?: any | null;
  onClose: () => void;
  onSubmit: (payload: UserForm) => void;
}

const UserModal: React.FC<Props> = ({ user = null, onClose, onSubmit }) => {
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [patronymic, setPatronymic] = useState(user?.patronymic ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      patronymic: patronymic.trim(),
      email: email.trim(),
      password,
      role: 'user'
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>{user ? 'Изменить пользователя' : 'Создать пользователя'}</h3>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>Имя</label>
          <input ref={inputRef} value={firstName} onChange={e => setFirstName(e.target.value)} required />

          <label>Фамилия</label>
          <input value={lastName} onChange={e => setLastName(e.target.value)} required />

          <label>Отчество</label>
          <input value={patronymic} onChange={e => setPatronymic(e.target.value)} />

          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} required />

          <label>Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />

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
