import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginForm.module.css';
import type { UserLogin } from '../../types/User';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserLogin>({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const togglePasswordVisibility = () => setShowPassword(s => !s);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.login.trim() || !formData.password.trim()) {
      setError('Заполните все поля');
      setIsLoading(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userLogin', formData.login);
      navigate('/domofons');
    } catch (err) {
      console.error(err);
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = () => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userLogin', 'admin');
    localStorage.setItem('isAdmin', 'true');
    navigate('/admin');
  };

  const handleSkipAuth = () => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userLogin', 'guest');
    navigate('/domofons');
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h1>Авторизация</h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label htmlFor="login">Логин</label>
          <input
            id="login"
            name="login"
            value={formData.login}
            onChange={handleChange}
            required
            autoComplete="username"
            disabled={isLoading}
            placeholder="Введите логин"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">Пароль</label>
          <div className={styles.passwordInputContainer}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              disabled={isLoading}
              placeholder="Введите пароль"
              className={styles.passwordInput}
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={togglePasswordVisibility}
              disabled={isLoading}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submitButton} disabled={isLoading}>
          {isLoading ? 'Вход...' : 'Войти'}
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={handleSkipAuth} disabled={isLoading}>Пропустить</button>
          <button type="button" onClick={handleAdminLogin} disabled={isLoading}>Войти как админ</button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
