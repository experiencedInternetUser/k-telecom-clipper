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

const VideoStreamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const streamId = (location.state as { streamId: number } | null)?.streamId;

  const videoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(true);

  const [polygon, setPolygon] = useState<Point[]>([]);
  const [redoStack, setRedoStack] = useState<Point[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [backends, setBackends] = useState<Backend[]>([]);
  const [selectedBackendId, setSelectedBackendId] = useState<number | null>(null);

  /* ---------- LOAD STREAM ---------- */
  useEffect(() => {
    if (!streamId) return;

    const loadStream = async () => {
      try {
        const res = await api.get(`/api/v1/streams/${streamId}`);
        setStreamUrl(res.data.stream_url);
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
        setBackends(res.data);
        if (res.data.length > 0) setSelectedBackendId(res.data[0].id);
      } catch (e) {
        console.error('Ошибка загрузки бекендов', e);
      }
    };
    loadBackends();
  }, []);

  /* ---------- CANVAS SIZE ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = videoRef.current!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  /* ---------- DRAW POLYGON ---------- */
useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (polygon.length === 0) return;

  ctx.save();
  ctx.strokeStyle = '#C8235A';
  ctx.lineWidth = 1; // тонкая линия
  ctx.fillStyle = 'rgba(200, 35, 90, 0.15)';

  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  polygon.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  if (polygon.length >= 3) {
    ctx.closePath();
    ctx.fill();
  }
  ctx.stroke();

  polygon.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1, 0, Math.PI * 2); // маленькие точки
    ctx.fillStyle = '#C8235A';
    ctx.fill();
  });

  ctx.restore();
}, [polygon]);


  /* ---------- HANDLERS ---------- */
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    const videoEl = videoRef.current;
    if (!canvas || !videoEl) return;

    const rect = videoEl.getBoundingClientRect();
    const xRatio = canvas.width / rect.width;
    const yRatio = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * xRatio;
    const y = (e.clientY - rect.top) * yRatio;

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
    if (!selectedBackendId || polygon.length < 3 || !streamId) return;
    try {
      await api.post('/api/v1/selections', {
        backend_id: selectedBackendId,
        stream_id: streamId,
        points: polygon,
      });
      alert('Область успешно сохранена');
    } catch (e) {
      console.error('Ошибка сохранения области', e);
      alert('Ошибка при сохранении');
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Видеопоток #{streamId}</h1>
      </div>

      <div className={styles.instructions}>
        <div className={styles.instructionsText}>
          <p className={styles.instructionPrimary}>Выделите нужную область</p>
          <p className={styles.instructionSecondary}>Многоугольник из трёх и более точек</p>
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
          onClick={handleCanvasClick}
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
          <canvas ref={canvasRef} className={styles.drawingCanvas} />
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
