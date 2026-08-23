"use client";

import { useEffect, useState } from "react";

function getTimeUntilMidnight() {
  const now = new Date();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, end - now);
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

/**
 * Live countdown to end of day, ticking once per second. Shared by the flash
 * sale banner and the per-card countdown chip so every clock stays in sync.
 *
 * Uses a mounted flag to avoid SSR/client hydration mismatches: the initial
 * state is zeros (which renders the same on both sides), and the real value
 * is computed only after the component mounts on the client.
 */
export function useFlashCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Compute the real countdown on first client render, then tick every second.
    setTimeLeft(getTimeUntilMidnight());
    setMounted(true);
    const timer = setInterval(() => setTimeLeft(getTimeUntilMidnight()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");
  return {
    ...timeLeft,
    mounted,
    formatted: `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`,
  };
}
