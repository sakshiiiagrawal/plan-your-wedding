import { useEffect, useRef, useState } from 'react';
import { HiOutlinePlay, HiOutlinePause } from 'react-icons/hi';

interface AudioRangeSelectorProps {
  url: string;
  onRangeChange: (startTime: number, endTime: number) => void;
  initialStart?: number;
  initialEnd?: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MIN_GAP = 0.5;

export default function AudioRangeSelector({
  url,
  onRangeChange,
  initialStart = 0,
  initialEnd,
}: AudioRangeSelectorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd || 45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<Uint8Array | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<'start' | 'end' | null>(null);

  const rangeRef = useRef({ start: startTime, end: endTime });
  useEffect(() => {
    rangeRef.current = { start: startTime, end: endTime };
  }, [startTime, endTime]);

  const initialRangeRef = useRef({ start: initialStart, end: initialEnd });
  initialRangeRef.current = { start: initialStart, end: initialEnd };

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      const { start, end } = initialRangeRef.current;
      const newEnd = Math.min(end || 45, audio.duration);
      const newStart = Math.max(0, Math.min(start, newEnd - MIN_GAP));
      // Only touch local state here — clamping a saved range to the track's
      // actual duration is a display concern, not a user edit, so it must not
      // notify the parent (that would mark the studio dirty on mere load).
      setStartTime(newStart);
      setEndTime(newEnd);
      extractWaveform(url);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const { start, end } = rangeRef.current;
      if (audio.currentTime >= end || audio.currentTime < start) {
        audio.currentTime = start;
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.pause();
    };
  }, [url]);

  const extractWaveform = async (audioUrl: string) => {
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(rawData.length / samples);
      const waveform = new Uint8Array(samples);

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j] ?? 0);
        }
        waveform[i] = Math.floor((sum / blockSize) * 255);
      }

      setWaveformData(waveform);
    } catch (err) {
      console.error('Failed to extract waveform:', err);
    }
  };

  useEffect(() => {
    if (!canvasRef.current || duration === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas 2D can't resolve CSS variables — read the computed values once
    const styles = getComputedStyle(canvas);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const bgColor = token('--bg-base', '#fffdf7');
    const goldColor = token('--gold', '#f59e0b');
    const inkColor = token('--ink-dim', '#a8a29e');

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const startPercent = (startTime / duration) * width;
    const endPercent = (endTime / duration) * width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(0, 0, startPercent, height);
    ctx.fillRect(endPercent, 0, width - endPercent, height);

    ctx.fillStyle = 'rgba(218, 165, 116, 0.1)';
    ctx.fillRect(startPercent, 0, endPercent - startPercent, height);

    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startPercent, 0);
    ctx.lineTo(startPercent, height);
    ctx.moveTo(endPercent, 0);
    ctx.lineTo(endPercent, height);
    ctx.stroke();

    if (waveformData) {
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < waveformData.length; i++) {
        const x = (i / waveformData.length) * width;
        const amp = ((waveformData[i] ?? 0) / 255) * (height / 2.2);
        const y = centerY - amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < waveformData.length; i++) {
        const x = (i / waveformData.length) * width;
        const amp = ((waveformData[i] ?? 0) / 255) * (height / 2.2);
        const y = centerY + amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (isPlaying && currentTime >= startTime && currentTime <= endTime) {
      const progressX = (currentTime / duration) * width;
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [waveformData, duration, startTime, endTime, currentTime, isPlaying]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = Math.max(startTime, Math.min((x / rect.width) * duration, endTime));

    audioRef.current.currentTime = clickTime;
    setCurrentTime(clickTime);
    audioRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleDragStart = (handle: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    setDraggingHandle(handle);
  };

  const nudgeHandle = (handle: 'start' | 'end') => (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = (e.shiftKey ? 5 : 1) * (e.key === 'ArrowLeft' ? -1 : 1);
    if (handle === 'start') {
      const validStart = Math.max(0, Math.min(startTime + step, endTime - MIN_GAP));
      setStartTime(validStart);
      onRangeChange(validStart, endTime);
    } else {
      const validEnd = Math.max(startTime + MIN_GAP, Math.min(endTime + step, duration));
      setEndTime(validEnd);
      onRangeChange(startTime, validEnd);
    }
  };

  useEffect(() => {
    if (!draggingHandle || !containerRef.current) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const newTime = Math.max(0, Math.min((x / rect.width) * duration, duration));

      if (draggingHandle === 'start') {
        const validStart = Math.min(newTime, endTime - MIN_GAP);
        setStartTime(validStart);
        onRangeChange(validStart, endTime);
      } else {
        const validEnd = Math.max(newTime, startTime + MIN_GAP);
        setEndTime(validEnd);
        onRangeChange(startTime, validEnd);
      }
    };

    const handlePointerUp = () => setDraggingHandle(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingHandle, duration, startTime, endTime, onRangeChange]);

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Compact header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          onClick={togglePlayback}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            border: 'none',
            background: isPlaying ? 'var(--gold)' : 'var(--line-soft)',
            color: isPlaying ? 'white' : 'var(--ink-high)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 150ms ease-out',
            boxShadow: isPlaying ? '0 2px 8px rgba(218, 165, 116, 0.3)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isPlaying) {
              e.currentTarget.style.background = 'var(--line-strong)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            if (!isPlaying) {
              e.currentTarget.style.background = 'var(--line-soft)';
            }
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <HiOutlinePause style={{ width: 12, height: 12 }} />
          ) : (
            <HiOutlinePlay style={{ width: 12, height: 12 }} />
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-mid)',
              fontFamily: 'monospace',
              fontWeight: 500,
            }}
          >
            {formatTime(startTime)}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-dim)',
              fontWeight: 500,
              padding: '2px 6px',
              background: 'var(--bg-raised)',
              borderRadius: 3,
            }}
          >
            {formatTime(endTime - startTime)}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-mid)',
              fontFamily: 'monospace',
              fontWeight: 500,
            }}
          >
            {formatTime(endTime)}
          </div>
        </div>
      </div>

      {/* Waveform with handles */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        {/* Handles positioned above */}
        <div style={{ height: 24, marginBottom: -8, position: 'relative', zIndex: 10 }}>
          {/* Start handle */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Clip start time"
            aria-valuemin={0}
            aria-valuemax={endTime - MIN_GAP}
            aria-valuenow={startTime}
            aria-valuetext={formatTime(startTime)}
            onPointerDown={handleDragStart('start')}
            onKeyDown={nudgeHandle('start')}
            onMouseEnter={() => setHoveredHandle('start')}
            onMouseLeave={() => setHoveredHandle(null)}
            onFocus={() => setHoveredHandle('start')}
            onBlur={() => setHoveredHandle(null)}
            style={{
              position: 'absolute',
              left: `${startPercent}%`,
              transform: 'translateX(-50%)',
              cursor: draggingHandle === 'start' ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              padding: 8,
              margin: -8,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                background: hoveredHandle === 'start' || draggingHandle === 'start' ? 'var(--gold)' : 'var(--line-strong)',
                border: '2px solid white',
                borderRadius: 3,
                boxShadow:
                  hoveredHandle === 'start' || draggingHandle === 'start'
                    ? '0 2px 8px rgba(218, 165, 116, 0.4)'
                    : '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 150ms ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 2,
                  height: 8,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 1,
                  marginRight: 2,
                }}
              />
              <div
                style={{
                  width: 2,
                  height: 8,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 1,
                }}
              />
            </div>

            {/* Tooltip for start */}
            {(draggingHandle === 'start' || hoveredHandle === 'start') && (
              <div
                style={{
                  position: 'absolute',
                  top: -28,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--ink-high)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  animation: 'fadeIn 100ms ease-out',
                }}
              >
                {formatTime(startTime)}
              </div>
            )}
          </div>

          {/* End handle */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Clip end time"
            aria-valuemin={startTime + MIN_GAP}
            aria-valuemax={duration}
            aria-valuenow={endTime}
            aria-valuetext={formatTime(endTime)}
            onPointerDown={handleDragStart('end')}
            onKeyDown={nudgeHandle('end')}
            onMouseEnter={() => setHoveredHandle('end')}
            onMouseLeave={() => setHoveredHandle(null)}
            onFocus={() => setHoveredHandle('end')}
            onBlur={() => setHoveredHandle(null)}
            style={{
              position: 'absolute',
              left: `${endPercent}%`,
              transform: 'translateX(-50%)',
              cursor: draggingHandle === 'end' ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              padding: 8,
              margin: -8,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                background: hoveredHandle === 'end' || draggingHandle === 'end' ? 'var(--gold)' : 'var(--line-strong)',
                border: '2px solid white',
                borderRadius: 3,
                boxShadow:
                  hoveredHandle === 'end' || draggingHandle === 'end'
                    ? '0 2px 8px rgba(218, 165, 116, 0.4)'
                    : '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 150ms ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 2,
                  height: 8,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 1,
                  marginRight: 2,
                }}
              />
              <div
                style={{
                  width: 2,
                  height: 8,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 1,
                }}
              />
            </div>

            {/* Tooltip for end */}
            {(draggingHandle === 'end' || hoveredHandle === 'end') && (
              <div
                style={{
                  position: 'absolute',
                  top: -28,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--ink-high)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  animation: 'fadeIn 100ms ease-out',
                }}
              >
                {formatTime(endTime)}
              </div>
            )}
          </div>
        </div>

        {/* Waveform canvas */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            cursor: 'crosshair',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid var(--line-soft)',
            transition: 'border-color 150ms',
          }}
          onMouseLeave={() => setHoveredHandle(null)}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={50}
            onClick={handleCanvasClick}
            style={{
              width: '100%',
              height: 50,
              display: 'block',
            }}
          />
        </div>
      </div>

      <p style={{ fontSize: 9, color: 'var(--ink-dim)', textAlign: 'center' }}>
        Click waveform to preview • Drag handles to trim
      </p>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
