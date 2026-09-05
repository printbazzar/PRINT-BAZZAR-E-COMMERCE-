/**
 * Ultra-lightweight, high-performance HTML5 Canvas Celebration Popper
 * 
 * - Zero external package weight (pure vanilla Canvas API)
 * - 1.5 - 2.0s duration particle explosion
 * - Auto-removes canvas from DOM upon completion
 * - Respects prefers-reduced-motion for accessibility
 * - Runs smoothly at 60fps on mobile and desktop
 */

export function fireCelebrationPopper() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Respect reduced-motion accessibility preference
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery && mediaQuery.matches) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'pb-celebration-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = (canvas.width = window.innerWidth * dpr);
  const height = (canvas.height = window.innerHeight * dpr);

  // Vibrant, festive print-shop palette (Cyan, Magenta, Yellow, Key Black/Gold, Emerald)
  const colors = [
    '#E11D48', // Crimson Red
    '#F59E0B', // Amber Gold
    '#10B981', // Emerald
    '#3B82F6', // Cobalt Blue
    '#8B5CF6', // Purple
    '#EC4899', // Hot Pink
    '#FBBF24', // Print Yellow
    '#06B6D4', // Cyan
  ];

  const particleCount = 120;
  const particles = [];

  // Launch from two lower cannon angles (left and right) for cinematic popper blast
  for (let i = 0; i < particleCount; i++) {
    const isLeft = i % 2 === 0;
    const originX = isLeft ? width * 0.15 : width * 0.85;
    const originY = height * 0.75;

    const angle = isLeft
      ? -Math.PI * (0.15 + Math.random() * 0.4) // shoot up-right
      : -Math.PI * (0.45 + Math.random() * 0.4); // shoot up-left

    const speed = (dpr * 14) + Math.random() * (dpr * 16);

    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (4 + Math.random() * 6) * dpr,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
      gravity: 0.38 * dpr,
      drag: 0.985,
    });
  }

  const startTime = Date.now();
  const maxDurationMs = 2000; // 2 seconds

  let animationFrameId;

  function render() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / maxDurationMs);

    ctx.clearRect(0, 0, width, height);

    let aliveCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Fade out smoothly in the second half
      if (progress > 0.5) {
        p.opacity = Math.max(0, 1 - (progress - 0.5) * 2);
      }

      if (p.opacity > 0 && p.y < height + 50) {
        aliveCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    if (progress < 1 && aliveCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cleanup();
    }
  }

  function cleanup() {
    cancelAnimationFrame(animationFrameId);
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  animationFrameId = requestAnimationFrame(render);
}
