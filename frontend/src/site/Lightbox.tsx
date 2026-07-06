import { useCallback, useEffect, useRef } from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineX } from 'react-icons/hi';

interface LightboxProps {
  images: { url: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** Fullscreen image viewer with keyboard navigation, shared by all templates. */
export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const goPrevious = useCallback(
    () => onNavigate(index === 0 ? images.length - 1 : index - 1),
    [index, images.length, onNavigate],
  );
  const goNext = useCallback(
    () => onNavigate(index === images.length - 1 ? 0 : index + 1),
    [index, images.length, onNavigate],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrevious();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    // Restore whatever overflow the host page had (it may not be the default)
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, goPrevious, goNext]);

  // Touch swipe: most guests open invites on phones
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      if (dx < 0) goNext();
      else goPrevious();
    }
  };

  const current = images[index];
  if (!current) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[200] bg-black/90 flex items-center justify-center"
      style={{ height: '100vh', touchAction: 'pan-y' }}
      onClick={onClose}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
      >
        <HiOutlineX className="w-7 h-7" />
      </button>
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrevious();
          }}
          aria-label="Previous photo"
          className="absolute left-3 p-2 text-white/70 hover:text-white"
        >
          <HiOutlineChevronLeft className="w-8 h-8" />
        </button>
      )}
      <img
        src={current.url}
        alt=""
        className="max-h-[88vh] max-w-[92vw] object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next photo"
          className="absolute right-3 p-2 text-white/70 hover:text-white"
        >
          <HiOutlineChevronRight className="w-8 h-8" />
        </button>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
