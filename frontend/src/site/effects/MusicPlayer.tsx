import { useEffect, useRef, useState } from 'react';
import { HiOutlineVolumeOff, HiOutlineVolumeUp } from 'react-icons/hi';

const TARGET_VOLUME = 0.3;

/**
 * Background soundtrack with a floating mute button (guide Part 14).
 * Autoplay policies require a user gesture, so playback starts on the first
 * interaction (the envelope tap naturally provides one on the invite).
 * Sits bottom-right so it never covers a template's top nav; volume fades in.
 */
export default function MusicPlayer({
  url,
  disabled,
  startTime = 0,
  endTime,
}: {
  url: string;
  disabled?: boolean | undefined;
  startTime?: number | undefined;
  endTime?: number | undefined;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    const audio = new Audio(url);
    audio.volume = 0;
    audioRef.current = audio;

    let fadeTimer: ReturnType<typeof setInterval> | null = null;
    const fadeIn = () => {
      if (cancelled) return;
      if (fadeTimer) clearInterval(fadeTimer);
      fadeTimer = setInterval(() => {
        if (cancelled) {
          if (fadeTimer) clearInterval(fadeTimer);
          return;
        }
        audio.volume = Math.min(TARGET_VOLUME, audio.volume + TARGET_VOLUME / 15);
        if (audio.volume >= TARGET_VOLUME && fadeTimer) clearInterval(fadeTimer);
      }, 100);
    };

    // Native loop restarts at 0, escaping the trimmed range — loop manually.
    const restart = () => {
      audio.currentTime = startTime;
      audio.play().catch(() => {});
    };
    const handleTimeUpdate = () => {
      if (endTime && endTime > startTime && audio.currentTime >= endTime) restart();
    };

    const start = () => {
      audio.currentTime = startTime;
      audio
        .play()
        .then(() => {
          if (cancelled) return;
          setStarted(true);
          fadeIn();
        })
        .catch(() => {});
      window.removeEventListener('pointerdown', start);
    };
    // Try immediately (works if the user already interacted, e.g. envelope tap)
    start();
    window.addEventListener('pointerdown', start);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', restart);

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', start);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', restart);
      if (fadeTimer) clearInterval(fadeTimer);
      audio.pause();
      audioRef.current = null;
    };
  }, [url, disabled, startTime, endTime]);

  if (disabled || !started) return null;

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !muted;
    setMuted(!muted);
  };

  return (
    <button
      onClick={toggleMute}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      className="no-print"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 80,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.25)',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {muted ? (
        <HiOutlineVolumeOff style={{ width: 18, height: 18 }} />
      ) : (
        <HiOutlineVolumeUp style={{ width: 18, height: 18 }} />
      )}
    </button>
  );
}
