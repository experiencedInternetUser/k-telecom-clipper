import { useState, useEffect } from 'react';
import styles from './DomofonList.module.css';
import type { Stream } from '../../types/Admin';
import { useNavigate } from 'react-router-dom';
import { streamsApi } from '../../api/streams.api';

const ITEMS_PER_PAGE = 10;

const DomofonList = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await streamsApi.getAll();
        setStreams(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE)));
      } catch (e) {
        console.error('Ошибка загрузки потоков', e);
        setStreams([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const paginated = streams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelect = (s: Stream) => {
    navigate('/video', {
    state: { streamId: s.id, description: s.description }
  });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Видеопотоки</h1>
      </div>

      <ul className={styles.list}>
        {paginated.map(stream => (
          <li
            key={stream.id}
            className={styles.item}
            onClick={() => handleSelect(stream)}
            tabIndex={0}
            role="button"
            onKeyDown={e => e.key === 'Enter' && handleSelect(stream)}
          >
            <div className={styles.title}>
              {stream.description || `Поток #${stream.id}`}
            </div>
            <div className={styles.separator} />
          </li>
        ))}

        {paginated.length === 0 && (
          <li className={styles.empty}>Потоки не найдены</li>
        )}
      </ul>

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
    </div>
  );
};

export default DomofonList;
