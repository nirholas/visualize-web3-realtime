import { useEffect, useState } from 'react';

function formatClock(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function useDesktopClock() {
  const [time, setTime] = useState(formatClock);
  const [date, setDate] = useState(formatDate);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(formatClock());
      setDate(formatDate());
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  return { time, date };
}
