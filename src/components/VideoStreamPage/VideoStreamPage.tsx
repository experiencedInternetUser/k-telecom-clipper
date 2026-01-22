import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './VideoStreamPage.module.css';
import type { Point, Selection } from '../../types/VideoStream';
import undoIcon from '../../assets/undo.svg';
import redoIcon from '../../assets/redo.svg';
import { api } from '../../api/axios';
import { selectionsApi } from '../../api/selections.api';

interface Backend {
  id: number;
  description: string;
}

const LINE_WIDTH = 1.2;   // толщина линии в CSS-пикселях
const POINT_RADIUS = 3.0; // радиус точки в CSS-пикселях
const EXISTING_SELECTION_COLOR = '#3B82F6'; // синий для существующих выделений
const NEW_SELECTION_COLOR = '#C8235A'; // розовый для нового выделения

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
  const [snapshotKey, setSnapshotKey] = useState<number>(Date.now()); // для принудительного обновления снимка

  const [polygon, setPolygon] = useState<Point[]>([]);
  const [redoStack, setRedoStack] = useState<Point[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [backends, setBackends] = useState<Backend[]>([]);
  const [selectedBackendId, setSelectedBackendId] = useState<number | null>(null);

  const [existingSelections, setExistingSelections] = useState<Selection[]>([]);
  const [loadingSelections, setLoadingSelections] = useState(true);
  const [selectedExistingId, setSelectedExistingId] = useState<number | null>(null); // null = новое выделение

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

  /* ---------- LOAD EXISTING SELECTIONS ---------- */
  useEffect(() => {
    if (!streamId) {
      setLoadingSelections(false);
      return;
    }

    const loadSelections = async () => {
      try {
        const selections = await selectionsApi.getByStreamId(streamId);
        setExistingSelections(selections);
      } catch (e) {
        console.error('Ошибка загрузки существующих выделений', e);
      } finally {
        setLoadingSelections(false);
      }
    };

    loadSelections();
  }, [streamId]);

  /* ---------- SNAPSHOT REFRESH INTERVAL ---------- */
  useEffect(() => {
    if (!streamUrl) return;

    const interval = setInterval(() => {
      setSnapshotKey(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, [streamUrl]);

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

      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.scale(dpr, dpr);

      drawPolygon();
    };

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

  /* ---------- DRAW SINGLE POLYGON HELPER ---------- */
  const drawSinglePolygon = (
    ctx: CanvasRenderingContext2D,
    points: Point[],
    strokeColor: string,
    fillColor: string,
    showPoints: boolean = true
  ) => {
    if (points.length === 0) return;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = LINE_WIDTH;
    ctx.fillStyle = fillColor;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);

    if (points.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();

    if (showPoints) {
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, POINT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
      }
    }

    ctx.restore();
  };

  /* ---------- DRAW ALL POLYGONS FUNCTION ---------- */
  const drawPolygon = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssW = canvas.clientWidth || parseFloat(canvas.style.width || '0') || 0;
    const cssH = canvas.clientHeight || parseFloat(canvas.style.height || '0') || 0;
    if (cssW === 0 || cssH === 0) return;

    ctx.clearRect(0, 0, cssW, cssH);

    // Рисуем существующие выделения
    for (const sel of existingSelections) {
      const isSelected = sel.id === selectedExistingId;
      drawSinglePolygon(
        ctx,
        sel.selection,
        isSelected ? NEW_SELECTION_COLOR : EXISTING_SELECTION_COLOR,
        isSelected ? 'rgba(200, 35, 90, 0.15)' : 'rgba(59, 130, 246, 0.15)',
        isSelected // показываем точки только для выбранного выделения
      );
    }

    // Рисуем текущее выделение пользователя (розовое) только если создаём новое
    if (selectedExistingId === null) {
      drawSinglePolygon(
        ctx,
        polygon,
        NEW_SELECTION_COLOR,
        'rgba(200, 35, 90, 0.15)',
        true
      );
    }
  }, [polygon, existingSelections, selectedExistingId]);

  useEffect(() => {
    drawPolygon();
  }, [drawPolygon]);

  /* ---------- HANDLERS ---------- */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Не позволяем рисовать при просмотре существующего выделения
    if (selectedExistingId !== null) return;

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
      pushed_to_backend: false, 
    };

    try {
      const res = await api.post('/api/v1/selections', payload);
      const data = res?.data;
      console.log('Selection saved response:', data);

      alert('Область успешно сохранена');

      setPolygon([]);
      setRedoStack([]);

      // Перезагружаем существующие выделения чтобы отобразить только что сохранённое
      const selections = await selectionsApi.getByStreamId(streamId);
      setExistingSelections(selections);
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

  const undoEnabled = polygon.length > 0 && selectedExistingId === null;
  const redoEnabled = redoStack.length > 0 && selectedExistingId === null;
  const saveEnabled = polygon.length >= 3 && selectedBackendId !== null && selectedExistingId === null;

  if (loadingStream || loadingSelections) {
    return <div className={styles.container}>Загрузка…</div>;
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <h1>{streamDescription ?? 'Название видеопотока отсутствует'}</h1>
      </div>

      <div className={styles.instructions}>
        <div className={styles.instructionsText}>
          <p className={styles.instructionPrimary}>
            {selectedExistingId === null ? 'Выделите нужную область' : 'Просмотр существующего выделения'}
          </p>
          <p className={styles.instructionSecondary}>
            {selectedExistingId === null
              ? 'Создайте многоугольник из трёх или более точек'
              : `Выделение #${selectedExistingId}`}
          </p>
        </div>

        <div className={styles.instrButtons}>
          <div className={styles.selectionSelectWrapper}>
            <select
              value={selectedExistingId ?? 'new'}
              onChange={e => {
                const val = e.target.value;
                if (val === 'new') {
                  setSelectedExistingId(null);
                } else {
                  setSelectedExistingId(Number(val));
                  setPolygon([]);
                  setRedoStack([]);
                }
              }}
              className={styles.selectionSelect}
            >
              <option value="new">+ Новое выделение</option>
              {existingSelections.map((sel, idx) => (
                <option key={sel.id} value={sel.id}>
                  Выделение #{idx + 1} ({sel.backend.description})
                </option>
              ))}
            </select>
          </div>
          <button className={styles.iconButton} onClick={handleUndo} disabled={!undoEnabled || selectedExistingId !== null}>
            <img src={undoIcon} alt="undo" className={styles.iconImage} />
          </button>
          <button className={styles.iconButton} onClick={handleRedo} disabled={!redoEnabled || selectedExistingId !== null}>
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
            <img
              src={`${streamUrl}${streamUrl.includes('?') ? '&' : '?'}_t=${snapshotKey}`}
              alt="Снимок камеры"
              className={styles.video}
            />
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
