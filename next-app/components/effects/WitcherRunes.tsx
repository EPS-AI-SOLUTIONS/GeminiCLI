'use client';

/**
 * ClaudeHydra - WitcherRunes Component
 * Renders falling white/silver runes effect (Elder Futhark alphabet).
 * Inspired by Matrix Rain but using runic characters in white/silver tones.
 */

import { memo, useEffect, useRef } from 'react';

export const WitcherRunes = memo(({ isDark }: { isDark: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSize = 14;
    let columns = 0;
    let drops: number[] = [];
    const alphabet = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

    const trailColor = isDark ? 'rgba(10, 14, 20, 0.07)' : 'rgba(245, 248, 245, 0.09)';
    const glowColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(120, 140, 155, 0.2)';

    const resize = () => {
      if (canvas && containerRef.current) {
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetHeight;
        columns = Math.floor(canvas.width / fontSize);
        if (drops.length !== columns) {
          drops = new Array(columns).fill(0).map(() => Math.random() * -50);
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = trailColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
      ctx.shadowBlur = isDark ? 4 : 2;
      ctx.shadowColor = glowColor;

      for (let i = 0; i < drops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        const charOpacity = 0.3 + Math.random() * 0.7;
        ctx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${charOpacity * 0.5})`
          : `rgba(120, 140, 160, ${charOpacity * 0.4})`;
        ctx.fillText(text, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const intervalId = setInterval(draw, 70);
    canvas.style.willChange = 'transform';

    return () => {
      clearInterval(intervalId);
      canvas.style.willChange = 'auto';
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden z-0 transition-[opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDark ? 'opacity-[0.18] mix-blend-screen' : 'opacity-[0.20]'}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

WitcherRunes.displayName = 'WitcherRunes';
