import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './VideoStreamPage.module.css';
import type { Point } from '../../types/VideoStream';
import undoIcon from '../../assets/undo.svg';
import redoIcon from '../../assets/redo.svg';
import { api } from '../../api/axios';

interface Backend {
  id: number;
  description: string;
}

const LINE_WIDTH = 1.2;   // толщина линии в CSS-пикселях
const POINT_RADIUS = 3.0; // радиус точки в CSS-пикселях

const VideoStreamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const streamId = (location.state as { streamId: number } | null)?.streamId ?? null;
  const streamDescription = (location.state as { description: string } | null)?.description ?? null;
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(true);

  const [polygon, setPolygon] = useState<Point[]>([]);
  const [redoStack, setRedoStack] = useState<Point[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [backends, setBackends] = useState<Backend[]>([]);
  const [selectedBackendId, setSelectedBackendId] = useState<number | null>(null);

  /* ---------- LOAD STREAM ---------- */
  useEffect(() => {
    if (!streamId) {
      setLoadingStream(false);
      return;
    }

    const loadStream = async () => {
      try {
        const res = await api.get(`/api/v1/streams/${streamId}`);
        setStreamUrl(res.data.stream_url ?? res.data.url ?? null);
      } catch (e) {
        console.error('Ошибка загрузки стрима', e);
        setStreamUrl(null);
      } finally {
        setLoadingStream(false);
      }
    };

    loadStream();
  }, [streamId]);

  /* ---------- LOAD BACKENDS ---------- */
  useEffect(() => {
    const loadBackends = async () => {
      try {
        const res = await api.get<Backend[]>('/api/v1/backends');
        setBackends(res.data ?? []);
        if (res.data && res.data.length > 0) setSelectedBackendId(res.data[0].id);
      } catch (e) {
        console.error('Ошибка загрузки бекендов', e);
      }
    };
    loadBackends();
  }, []);

  /* ---------- CANVAS SIZE / RESIZE OBSERVER ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const videoEl = videoRef.current;
    if (!canvas || !videoEl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = videoEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Reset transform before resizing
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // scale to CSS pixels
      ctx.scale(dpr, dpr);

      // redraw
      drawPolygon();
    };

    // initial
    resizeCanvas();

    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(videoEl);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef.current, canvasRef.current]);

  /* ---------- DRAW POLYGON FUNCTION ---------- */
  const drawPolygon = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssW = canvas.clientWidth || parseFloat(canvas.style.width || '0') || 0;
    const cssH = canvas.clientHeight || parseFloat(canvas.style.height || '0') || 0;
    if (cssW === 0 || cssH === 0) return;

    ctx.clearRect(0, 0, cssW, cssH);

    if (polygon.length === 0) return;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#C8235A';
    ctx.lineWidth = LINE_WIDTH;
    ctx.fillStyle = 'rgba(200, 35, 90, 0.15)';

    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);

    if (polygon.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();

    for (const p of polygon) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#C8235A';
      ctx.fill();
    }

    ctx.restore();
  };

  useEffect(() => {
    drawPolygon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygon]);

  /* ---------- HANDLERS ---------- */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPolygon(prev => {
      setRedoStack([]);
      return [...prev, { x, y }];
    });
  };

  const handleUndo = () => {
    if (polygon.length === 0) return;
    setPolygon(prev => {
      const copy = [...prev];
      const removed = copy.pop()!;
      setRedoStack(rs => [...rs, removed]);
      return copy;
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setRedoStack(prev => {
      const copy = [...prev];
      const point = copy.pop()!;
      setPolygon(p => [...p, point]);
      return copy;
    });
  };

  const handleSave = async () => {
    if (!selectedBackendId || polygon.length < 3 || !streamId) {
      alert('Выберите бекенд и отметьте как минимум 3 точки.');
      return;
    }

    const payload = {
      backend_id: selectedBackendId,
      stream_id: streamId,
      selection: polygon.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
      description: '',
      pushed_to_backend: false, // заглушка
    };

    try {
      const res = await api.post('/api/v1/selections', payload);
      const data = res?.data;
      console.log('Selection saved response:', data);

      alert('Область успешно сохранена');

      setPolygon([]);
      setRedoStack([]);
    } catch (err) {
      console.error('Ошибка при сохранении выделения', err);
      const msg = (err as any)?.response?.data?.message ?? 'Ошибка при сохранении на сервере';
      alert(msg);
    }
  };

  const confirmExit = () => {
    setPolygon([]);
    setRedoStack([]);
    setConfirmModalOpen(false);
    navigate(-1);
  };

  const undoEnabled = polygon.length > 0;
  const redoEnabled = redoStack.length > 0;
  const saveEnabled = polygon.length >= 3 && selectedBackendId !== null;

  if (loadingStream) {
    return <div className={styles.container}>Загрузка стрима…</div>;
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <h1>{streamDescription ?? 'Название видеопотока отсутствует'}</h1>
      </div>

      <div className={styles.instructions}>
        <div className={styles.instructionsText}>
          <p className={styles.instructionPrimary}>Выделите нужную область</p>
          <p className={styles.instructionSecondary}>Создайте многоугольник из трёх или более точек</p>
        </div>

        <div className={styles.instrButtons}>
          <button className={styles.iconButton} onClick={handleUndo} disabled={!undoEnabled}>
            <img src={undoIcon} alt="undo" className={styles.iconImage} />
          </button>
          <button className={styles.iconButton} onClick={handleRedo} disabled={!redoEnabled}>
            <img src={redoIcon} alt="redo" className={styles.iconImage} />
          </button>
        </div>
      </div>

      <div className={styles.videoContainer}>
        <div
          ref={videoRef}
          className={styles.videoPlaceholder}
          style={!streamUrl ? { backgroundColor: '#f1f5f9' } : undefined}
        >
          {streamUrl ? (
            <video src={streamUrl} autoPlay muted playsInline className={styles.video} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: '#475569',
                fontSize: '1rem',
                padding: '1rem',
              }}
            >
              Ошибка загрузки видеопотока.
              <br />
              Обратитесь к администратору
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={styles.drawingCanvas}
            onClick={handleCanvasClick}
            style={{ pointerEvents: 'auto', zIndex: 2 }}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <button
          className={`${styles.footerButton} ${styles.backButton}`}
          onClick={() => setConfirmModalOpen(true)}
        >
          Назад
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className={styles.backendSelectWrapper}>
            <select
              value={selectedBackendId ?? ''}
              onChange={e => setSelectedBackendId(Number(e.target.value))}
              className={styles.backendSelect}
            >
              <option value="" disabled>
                Выберите бекенд
              </option>
              {backends.map(b => (
                <option key={b.id} value={b.id}>
                  {b.description}
                </option>
              ))}
            </select>
          </div>
          <button
            className={`${styles.footerButton} ${styles.saveButton}`}
            onClick={handleSave}
            disabled={!saveEnabled}
          >
            Сохранить
          </button>
        </div>
      </div>

      {confirmModalOpen && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmBody}>
              <p className={styles.confirmText}>
                <strong style={{ color: '#000' }}>Подтвердите действие</strong>
                <br />
                Выделенная область будет удалена. Уверены, что хотите выйти?
              </p>
              <div className={styles.confirmActions}>
                <button className={styles.stayButton} onClick={() => setConfirmModalOpen(false)}>
                  Остаться
                </button>
                <button className={styles.exitButton} onClick={confirmExit}>
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoStreamPage;
