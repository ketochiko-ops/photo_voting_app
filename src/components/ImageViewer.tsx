import { useEffect, useRef, useState } from 'react';
import { PrivateImage } from './PrivateImage';

interface ImageViewerProps {
  roomId: string;
  photoId: string;
  accessKey: string;
  alt: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.5;

export function ImageViewer({ roomId, photoId, accessKey, alt, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(MIN_SCALE);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number>();
  const pinchScale = useRef(MIN_SCALE);
  const closeButton = useRef<HTMLButtonElement>(null);

  const changeScale = (value: number) => setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === '+' || event.key === '=')
        setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP));
      if (event.key === '-') setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function pointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(second.x - first.x, second.y - first.y);
      pinchScale.current = scale;
    }
  }

  function pointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size !== 2 || !pinchDistance.current) return;
    const [first, second] = [...pointers.current.values()];
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    changeScale(pinchScale.current * (distance / pinchDistance.current));
  }

  function pointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = undefined;
    pinchScale.current = scale;
  }

  return (
    <div className="image-modal-backdrop" onClick={onClose}>
      <section
        className="image-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${alt}の拡大表示`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="image-modal-toolbar">
          <span aria-live="polite">{Math.round(scale * 100)}%</span>
          <button
            aria-label="縮小"
            disabled={scale <= MIN_SCALE}
            onClick={() => changeScale(scale - SCALE_STEP)}
          >
            −
          </button>
          <button
            aria-label="等倍に戻す"
            disabled={scale === MIN_SCALE}
            onClick={() => changeScale(MIN_SCALE)}
          >
            1:1
          </button>
          <button
            aria-label="拡大"
            disabled={scale >= MAX_SCALE}
            onClick={() => changeScale(scale + SCALE_STEP)}
          >
            ＋
          </button>
          <button
            ref={closeButton}
            className="image-modal-close"
            aria-label="閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div
          className="image-modal-viewport"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onDoubleClick={() => changeScale(scale === MIN_SCALE ? 2 : MIN_SCALE)}
        >
          <div className="image-modal-image" style={{ transform: `scale(${scale})` }}>
            <PrivateImage roomId={roomId} photoId={photoId} accessKey={accessKey} alt={alt} />
          </div>
        </div>
        <p className="image-modal-help">ボタンまたはピンチ操作で拡大・縮小できます</p>
      </section>
    </div>
  );
}
