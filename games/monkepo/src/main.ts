// MonKePo: entrada do jogo (login, escolha do inicial e laço de desenho).

import { SPECIES } from '../shared/data';
import { decodeMonsters, encodeMonsters } from '../shared/monster';
import { carregar, currentSession, entrar, type ApiReply } from './api';
import { currentBattle, drawBattle, inBattle } from './battleScene';
import { H, W, clearPresses, ctx, drawWidgets, feedWidgets, image, preload, say, setFormMode, setupTouchPad, text, uiBusy } from './engine';
import { chooseStarter, drawTransition, drawWorld, game, saveNow, startGame, updateWorld } from './game';

let started = false;

/* ---------- Laço principal ---------- */

function frame(now: number): void {
  if (!feedWidgets() && (game.scene !== 'world' || !started)) clearPresses();
  if (started) updateWorld(now);
  ctx.imageSmoothingEnabled = false;
  if (!started) drawTitle(now);
  else if (game.scene === 'battle' && inBattle()) drawBattle(now);
  else {
    drawWorld(now);
    if (game.scene === 'transition') drawTransition();
  }
  drawWidgets(now);
  requestAnimationFrame(frame);
}

function drawTitle(t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3a6ab8');
  g.addColorStop(1, '#8ac0f0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  text('MonKePo', W / 2, 92, { size: 56, color: '#f8d030', align: 'center', shadow: '#203060' });
  text('capture, treine e dispute o ranking', W / 2, 124, { size: 16, color: '#ffffff', align: 'center', shadow: '#203060' });
  text('Artes das criaturas: projeto Tuxemon (CC BY-SA 4.0)', W / 2, H - 10, { size: 11, color: '#e8f0ff', align: 'center', shadow: '' });
  const show = [1, 4, 7];
  show.forEach((sp, i) => {
    const img = image(`monstros/${SPECIES.find((s) => s.id === sp)!.sprite}.png`);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, 64, 64, 60 + i * 130, 150 + Math.sin(t / 400 + i) * 6, 112, 112);
  });
}

/* ---------- Login ---------- */

const form = document.getElementById('login') as HTMLFormElement;
const userInput = document.getElementById('usuario') as HTMLInputElement;
const passInput = document.getElementById('senha') as HTMLInputElement;
const errorBox = document.getElementById('erro') as HTMLParagraphElement;
const submit = form.querySelector('button') as HTMLButtonElement;

function askLogin(message = ''): Promise<ApiReply> {
  form.hidden = false;
  setFormMode(true);
  errorBox.textContent = message;
  userInput.focus();
  return new Promise((resolve) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const user = userInput.value.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,16}$/.test(user)) {
        errorBox.textContent = 'Usuário: 3 a 16 letras minúsculas, números ou _.';
        return;
      }
      if (passInput.value.length < 6) {
        errorBox.textContent = 'A senha precisa ter pelo menos 6 caracteres.';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Entrando...';
      errorBox.textContent = '';
      const reply = await entrar(user, passInput.value);
      submit.disabled = false;
      submit.textContent = 'Entrar';
      if (!reply.ok) {
        errorBox.textContent = reply.erro ?? 'Não foi possível entrar.';
        return;
      }
      passInput.value = '';
      form.hidden = true;
      setFormMode(false);
      resolve(reply);
    };
  });
}

async function boot(): Promise<void> {
  setupTouchPad();
  await preload(SPECIES.map((s) => `monstros/${s.sprite}.png`));
  requestAnimationFrame(frame);

  let reply: ApiReply | null = null;
  if (currentSession()) {
    reply = await carregar();
    if (!reply.ok) reply = null;
  }
  if (!reply) reply = await askLogin();
  const user = String(reply.usuario ?? currentSession()?.usuario ?? '');
  let monsters = decodeMonsters(String(reply.monstros ?? '')) ?? [];
  const rev = Number(reply.rev ?? 0);
  const data = String(reply.monstros ?? '');

  if (monsters.length === 0) {
    const starter = await chooseStarter();
    monsters = [starter];
    startGame(user, rev, data, monsters);
    started = true;
    let r = await saveNow();
    while (r && !r.ok) {
      await say(`Não consegui salvar seu inicial: ${r.erro}. Vou tentar de novo.`);
      r = await saveNow();
    }
    await say('Use as setas para andar, A (Z/Enter) para falar e START (P) para o menu. Segure B (X) para correr.');
    await say('Vá para o norte, na Rota 1, e procure MonKePos na grama alta!');
  } else {
    startGame(user, rev, data, monsters);
    started = true;
    await say(`Bem-vindo de volta, ${user}! ${monsters.length} MonKePo(s) na sua conta.`);
  }
}

void boot();

// Ganchos para os testes automatizados.
declare global {
  interface Window {
    __monkepo?: unknown;
  }
}
window.__monkepo = { game, encodeMonsters, currentBattle, uiBusy, get started() { return started; } };
