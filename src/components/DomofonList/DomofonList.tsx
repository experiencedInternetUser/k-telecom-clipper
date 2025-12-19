import { useState, useEffect } from 'react';
import styles from './DomofonList.module.css';
import type { Domofon } from '../../types/Domofon';
import { useNavigate } from 'react-router-dom';
import { streamsApi } from '../../api/streams.api';

const ITEMS_PER_PAGE = 10;

const DomofonList = () => {
  const [domofons, setDomofons] = useState<Domofon[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);

      try {
        const data = await streamsApi.getAll();

        setDomofons(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE)));
      } catch (e) {
        console.error('Ошибка загрузки домофонов', e);
        setDomofons([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const paginated = domofons.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelect = (d: Domofon) => {
    navigate('/video', { state: { domofon: d } });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }

    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className={styles.pagination}>
        <button
          className={styles.navButton}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Назад"
        >
          ‹ Назад
        </button>

        <div className={styles.pages}>
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`e-${idx}`} className={styles.ellipsis}>…</span>
            ) : (
              <button
                key={p}
                className={`${styles.pageNumber} ${
                  currentPage === p ? styles.activePage : ''
                }`}
                onClick={() => handlePageChange(p)}
                aria-current={currentPage === p ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          className={styles.navButton}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Дальше"
        >
          Дальше ›
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Видеопотоки с домофонов</h1>
      </div>

      <ul className={styles.list} role="list">
        {paginated.map(d => (
          <li
            key={d.id}
            className={styles.item}
            onClick={() => handleSelect(d)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(d); }}
          >
            <div className={styles.title}>
              {d.address}{d.entrance ? `, ${d.entrance}` : ''}
            </div>
            <div className={styles.separator} />
          </li>
        ))}

        {paginated.length === 0 && (
          <li className={styles.empty}>Домофоны не найдены</li>
        )}
      </ul>

      {totalPages > 1 && renderPagination()}
    </div>
  );
};

export default DomofonList;
