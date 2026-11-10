const PINKS = ['#f9d9dc', '#f6b8b9'];
const HEART = 'M12 21C9 18 2 13 2 8C2 2 9 1 12 6C15 1 22 2 22 8C22 13 15 18 12 21Z';
const SVG_NS = 'http://www.w3.org/2000/svg';

export function createHeartConfetti(container) {
  let active = [];

  function clear() {
    const previous = active;
    active = [];
    previous.forEach(animation => animation.cancel());
    container.replaceChildren();
  }

  function burst() {
    clear();
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const fragment = document.createDocumentFragment();
    const particles = [];
    const count = reduced ? 6 : 32;

    for (let i = 0; i < count; i++) {
      const heart = document.createElementNS(SVG_NS, 'svg');
      heart.classList.add('xr-confetti-heart');
      heart.setAttribute('viewBox', '0 0 24 24');
      heart.setAttribute('focusable', 'false');
      heart.style.color = PINKS[i % PINKS.length];
      const size = 12 + Math.random() * 10;
      heart.style.width = heart.style.height = `${size}px`;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', HEART);
      path.setAttribute('fill', 'currentColor');
      heart.append(path);
      fragment.append(heart);

      if (reduced) {
        // Corações parados nas laterais: apenas a opacidade muda.
        heart.style.left = `${i % 2 ? 88 : 12}%`;
        heart.style.top = `${38 + Math.floor(i / 2) * 11}%`;
        const fade = 'cubic-bezier(0.23, 1, 0.32, 1)';
        particles.push({ heart, frames: [
          { opacity: 0, offset: 0, easing: fade },
          { opacity: 1, offset: 1 / 3 },
          { opacity: 1, offset: 2 / 3, easing: fade },
          { opacity: 0, offset: 1 },
        ], timing: { duration: 600, easing: 'linear' } });
        continue;
      }

      const duration = 1350 + Math.random() * 300;
      const vx = (i / (count - 1) * 2 - 1) * Math.min(width * 0.65, 300);
      const vy = -Math.min(height * 0.48, 390) * (0.8 + Math.random() * 0.3);
      const gravity = Math.min(height * 0.95, 760);
      const spin = (Math.random() - 0.5) * 540;
      // Trajetória calculada só na largada; o navegador anima transform/opacity.
      const frames = Array.from({ length: 25 }, (_, step) => {
        const progress = step / 24, time = progress * duration / 1000;
        const x = vx * time, y = vy * time + gravity * time * time / 2;
        return {
          offset: progress,
          transform: `translate3d(${x}px, ${y}px, 0) rotate(${spin * progress}deg)`,
          opacity: Math.min(1, progress / 0.08, (1 - progress) / 0.22),
        };
      });
      particles.push({ heart, frames, timing: { duration, delay: Math.floor(i / 8) * 35, easing: 'linear' } });
    }

    container.append(fragment);
    const animations = particles.map(({ heart, frames, timing }) => heart.animate(frames, timing));
    active = animations;
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (active === animations) clear();
    });
  }

  return { burst, clear };
}
