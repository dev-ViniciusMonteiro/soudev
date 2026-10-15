/**
 * Tela de abertura da Cidade Neon: título em neon desenhado com CSS (sem
 * imagem externa). Clique, toque, qualquer tecla ou botão do controle continua.
 * O primeiro gesto também libera o áudio (política de autoplay).
 * Tem id para o teste automatizado poder removê-la.
 */
export function showSplash(container: HTMLElement, onContinue?: () => void): void {
  const overlay = document.createElement('div');
  overlay.id = 'splash';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;gap:18px;' +
    'align-items:center;justify-content:center;text-align:center;padding:24px;' +
    'background:radial-gradient(ellipse at 50% 120%,#3b0a5c 0%,#0b0620 45%,#000 80%);' +
    'transition:opacity .6s ease;touch-action:none;cursor:pointer;color:#fff;' +
    'font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;';

  const style = document.createElement('style');
  style.textContent =
    '@keyframes splashPulse{0%,100%{opacity:.35}50%{opacity:.95}}' +
    '@keyframes neonFlicker{0%,19%,21%,60%,62%,100%{opacity:1}20%,61%{opacity:.55}}' +
    '#splash .neon{font-size:clamp(44px,11vw,128px);font-weight:900;letter-spacing:.06em;line-height:.95;' +
    'color:#fff;text-shadow:0 0 6px #fff,0 0 18px #ff2bd6,0 0 38px #ff2bd6,0 0 72px #7b2cff;' +
    'animation:neonFlicker 4s infinite;}' +
    '#splash .neon span{display:block;color:#7ff3ff;text-shadow:0 0 6px #fff,0 0 18px #22d3ee,0 0 40px #22d3ee,0 0 80px #2563eb;}';

  const title = document.createElement('div');
  title.className = 'neon';
  title.innerHTML = 'CIDADE<span>NEON</span>'; // texto fixo, sem conteúdo do usuário

  const tagline = document.createElement('div');
  tagline.textContent = 'Dirija, faça entregas e fuja da polícia';
  tagline.style.cssText = 'font-size:clamp(14px,2.4vw,20px);color:rgba(255,255,255,.75);transition:opacity .4s ease;';

  const hint = document.createElement('div');
  hint.textContent = 'Clique ou toque para começar';
  hint.style.cssText =
    'position:absolute;bottom:8%;left:0;right:0;font-size:14px;' +
    'color:rgba(255,255,255,.8);animation:splashPulse 1.4s ease-in-out infinite;transition:opacity .4s ease;' +
    'font-family:ui-monospace,Menlo,Consolas,monospace;';

  const credit = document.createElement('div');
  credit.textContent = 'um jogo de Vinicius.dev';
  credit.style.cssText = 'position:absolute;bottom:3%;left:0;right:0;font-size:12px;color:rgba(255,255,255,.45);';

  overlay.append(style, title, tagline, hint, credit);
  container.appendChild(overlay);

  let dismissed = false;
  let padRaf = 0;

  const cleanup = (): void => {
    removeEventListener('pointerdown', dismiss);
    removeEventListener('keydown', dismiss);
    cancelAnimationFrame(padRaf);
  };

  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    onContinue?.();
    cleanup();
    for (const el of [title, tagline, hint, credit]) {
      el.style.transition = 'opacity .4s ease';
      el.style.opacity = '0';
      el.style.animation = 'none';
    }
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.remove(), 650);
    }, 420);
  };

  addEventListener('pointerdown', dismiss);
  addEventListener('keydown', dismiss);

  // Controles não disparam eventos: verificamos os botões a cada quadro.
  const pollPad = (): void => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (p && p.buttons.some((b) => b.pressed)) {
        dismiss();
        return;
      }
    }
    padRaf = requestAnimationFrame(pollPad);
  };
  padRaf = requestAnimationFrame(pollPad);

  (window as Window & { __skipSplash?: () => void }).__skipSplash = (): void => {
    cleanup();
    overlay.remove();
  };
}
