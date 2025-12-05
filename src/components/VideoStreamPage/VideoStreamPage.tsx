import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './VideoStreamPage.module.css';
import type { Point, Polygon, Domofon } from '../../types/VideoStream';
import undoIcon from '../../assets/undo.svg';
import redoIcon from '../../assets/redo.svg';

const VideoStreamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedDomofon = (location.state as { domofon: Domofon })?.domofon || {
    id: '1',
    address: 'г. Екатеринбург, ул. Гагарина, д. 23',
    entrance: 'под. 2'
  };

  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  const [redoStack, setRedoStack] = useState<Point[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      if (videoRef.current && canvas) {
        const rect = videoRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        canvas.style.width = `${Math.round(rect.width)}px`;
        canvas.style.height = `${Math.round(rect.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    polygons.forEach(polygon => {
      if (polygon.points.length < 3) return;
      ctx.save();
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 123, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (let i = 1; i < polygon.points.length; i++) {
        ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    if (currentPolygon.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 107, 107, 0.12)';
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
      for (let i = 1; i < currentPolygon.length; i++) {
        ctx.lineTo(currentPolygon[i].x, currentPolygon[i].y);
      }
      if (currentPolygon.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();

      currentPolygon.forEach(point => {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.restore();
    }
  }, [polygons, currentPolygon]);


  const handleVideoClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCurrentPolygon(prev => {
      setRedoStack([]);
      return [...prev, { x, y }];
    });

    setIsSaved(false);
  };

  const handleUndo = () => {
    if (currentPolygon.length === 0) return;
    setCurrentPolygon(prev => {
      const newArr = prev.slice(0, -1);
      const removed = prev[prev.length - 1];
      setRedoStack(rs => [...rs, removed]);
      return newArr;
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setRedoStack(prev => {
      const copy = [...prev];
      const point = copy.pop()!;
      setCurrentPolygon(curr => [...curr, point]);
      return copy;
    });
  };

  const saveClick = () => {
    setConfirmModalOpen(true);
    setIsSaved(true);
  };

  const confirmStay = () => {
    setConfirmModalOpen(false);
  };

  const confirmExit = () => {
    setPolygons([]);
    setCurrentPolygon([]);
    setRedoStack([]);
    setConfirmModalOpen(false);
    navigate('/domofons');
  };

  const backToList = () => {
    navigate('/domofons');
  };

  const undoEnabled = currentPolygon.length > 0;
  const redoEnabled = redoStack.length > 0;
  const saveEnabled = currentPolygon.length > 0 || polygons.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>{selectedDomofon.address}, {selectedDomofon.entrance}</h1>
        </div>
      </div>

      <div className={styles.instructions}>
        <div className={styles.instructionsText}>
          <p className={styles.instructionPrimary}>Выделите нужную область</p>
          <p className={styles.instructionSecondary}>Создайте многоугольник из трёх или более точек</p>
        </div>

        <div className={styles.instrButtons}>
          <button
            className={styles.iconButton}
            onClick={handleUndo}
            disabled={!undoEnabled}
            aria-label="Назад (undo)"
            title="Удалить последнюю точку"
          >
            <img src={undoIcon} alt="undo" className={styles.iconImage} />
          </button>

          <button
            className={styles.iconButton}
            onClick={handleRedo}
            disabled={!redoEnabled}
            aria-label="Вперед (redo)"
            title="Вернуть точку"
            style={!redoEnabled ? { opacity: 0.35 } : undefined} /* засветлен, если нельзя */
          >
            <img src={redoIcon} alt="redo" className={styles.iconImage} />
          </button>
        </div>
      </div>

      <div className={styles.videoContainer}>
        <div
          ref={videoRef}
          className={styles.videoPlaceholder}
          onClick={handleVideoClick}
          tabIndex={0}
          role="region"
          aria-label="Область видеопотока — клик для добавления точки"
        >
          <div className={styles.videoPlaceholderContent}>
            <div className={styles.videoIcon}>📹</div>
            <p className={styles.videoResolution}>1920×1080</p>
          </div>

          <canvas ref={canvasRef} className={styles.drawingCanvas} />
        </div>
      </div>

      <div className={styles.footer}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={backToList}
            className={`${styles.footerButton} ${styles.backButton}`}
          >
            Назад
          </button>
        </div>

        <button
          onClick={saveClick}
          className={`${styles.footerButton} ${styles.saveButton}`}
          disabled={!saveEnabled}
        >
          Сохранить
        </button>
      </div>

      {confirmModalOpen && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmHeader}>
              <h2 className={styles.confirmTitle}>Подтвердите действие</h2>
              <button className={styles.closeConfirm} onClick={() => setConfirmModalOpen(false)}>×</button>
            </div>

            <div className={styles.confirmBody}>
              <p className={styles.confirmText}>Выделенная область будет удалена. Уверены, что хотите выйти?</p>

              <div className={styles.confirmActions}>
                <button className={styles.stayButton} onClick={confirmStay}>Остаться</button>
                <button className={styles.exitButton} onClick={confirmExit}>Выйти</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VideoStreamPage;
