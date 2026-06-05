import { useState, useEffect } from 'react';

interface Props {
  delayMs?: number;
}

export function DelayedFallback({ delayMs = 200 }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!isVisible) return null;

  return (
    <div className="page-root">
      <div className="flex-1 flex items-center justify-center text-muted text-sm">불러오는 중...</div>
    </div>
  );
}
