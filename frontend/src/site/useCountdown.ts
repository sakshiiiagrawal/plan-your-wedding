import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  past: boolean;
}

const ZERO: Countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, past: false };

function compute(target: Date | null): Countdown {
  if (!target) return ZERO;
  const diff = target.getTime() - Date.now();
  // The target is midnight of the wedding date — the day itself isn't "past"
  // (guests visit most on the day), so hold at zero until it ends.
  if (diff <= -24 * 60 * 60 * 1000) return { ...ZERO, past: true };
  if (diff <= 0) return ZERO;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    past: false,
  };
}

export function useCountdown(target: Date | null): Countdown {
  // The interval only bumps a tick; the countdown itself is derived at render
  const [, setTick] = useState(0);
  const targetMs = target?.getTime() ?? null;

  useEffect(() => {
    if (targetMs === null) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  return compute(target);
}
