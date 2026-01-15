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

const LINE_WIDTH = 1.2;   // тонкость линии (CSS-пиксели)
const POINT_RADIUS = 3.0; // радиус точки (CSS-пиксели)

const VideoStreamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const streamId = (location.state as { streamId: number } | null)?.streamId ?? null;

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
        // backend may return different field names; adjust if needed
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

      // Reset transform to avoid accumulating scales
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // scale so we can draw in CSS pixels
      ctx.scale(dpr, dpr);

      // redraw current polygon after resize
      drawPolygon();
    };

    // Initial resize
    resizeCanvas();

    // ResizeObserver to track layout changes of the video div
    const ro = new ResizeObserver(() => {
      resizeCanvas();
    });
    ro.observe(videoEl);

    // also window resize fallback
    window.addEventListener('resize', resizeCanvas);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef.current, canvasRef.current, polygon.length]); // polygon.length to trigger on mount/changes

  /* ---------- DRAW POLYGON FUNCTION ---------- */
  const drawPolygon = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use CSS width/height for clearing & drawing (we scaled context to dpr already)
    const cssW = canvas.clientWidth || parseFloat(canvas.style.width || '0') || 0;
    const cssH = canvas.clientHeight || parseFloat(canvas.style.height || '0') || 0;
    if (cssW === 0 || cssH === 0) {
      // nothing to draw yet
      return;
    }

    // clear in CSS pixels (context is scaled)
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
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }

    if (polygon.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();

    // draw points
    for (const p of polygon) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#C8235A';
      ctx.fill();
    }

    ctx.restore();
  };

  /* Call draw whenever polygon changes */
  useEffect(() => {
    drawPolygon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygon]);

  /* ---------- HANDLERS ---------- */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // bounding rect in CSS pixels
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // push CSS-pixel coordinates (we draw with ctx.scale(dpr,dpr) so these match)
    setPolygon(prev => {
      setRedoStack([]); // clear redo when adding
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
      // optionally clear
      setPolygon([]);
      setRedoStack([]);
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
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <h1>Видеопоток #{streamId ?? '—'}</h1>
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
          style={!streamUrl ? { backgroundColor: '#f1f5f9' } : undefined}
        >
          {streamUrl ? (
            // video element under the canvas (canvas will be absolutely positioned on top)
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

          {/* canvas placed above video and receives clicks */}
          <canvas
            ref={canvasRef}
            className={styles.drawingCanvas}
            onClick={handleCanvasClick}
            // override CSS to ensure canvas receives pointer events and is above video
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
