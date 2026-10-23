// Telão do ranking na praça: placa em pé na borda norte, com os 5 de maior nível. Atualiza a cada minuto.

import * as THREE from 'three';
import type { RespostaRanking } from './protocolo';

export class Telao {
  readonly grupo = new THREE.Group();
  private canvas = document.createElement('canvas');
  private textura: THREE.CanvasTexture;

  constructor() {
    this.canvas.width = 1024;
    this.canvas.height = 576;
    this.textura = new THREE.CanvasTexture(this.canvas);
    this.textura.colorSpace = THREE.SRGBColorSpace;
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.5), new THREE.MeshBasicMaterial({ map: this.textura }));
    tela.position.y = 4.6;
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.9, 0.3), new THREE.MeshStandardMaterial({ color: '#1f2937', flatShading: true }));
    moldura.position.set(0, 4.6, -0.17);
    moldura.castShadow = true;
    const poste = new THREE.MeshStandardMaterial({ color: '#374151', flatShading: true });
    for (const x of [-3, 3]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), poste);
      p.position.set(x, 1.2, -0.2);
      p.castShadow = true;
      this.grupo.add(p);
    }
    this.grupo.add(moldura, tela);
    this.desenhar(null);
  }

  desenhar(r: RespostaRanking | null): void {
    const g = this.canvas.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 576);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 576);
    g.fillStyle = '#facc15';
    g.font = '800 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('🏆 Ranking da praça', 512, 86);
    g.font = '600 46px system-ui, sans-serif';
    if (!r || !r.lista.length) {
      g.fillStyle = '#cbd5e1';
      g.fillText(r ? 'Seja o primeiro!' : 'Carregando…', 512, 300);
    } else {
      r.lista.slice(0, 5).forEach((l, i) => {
        const y = 170 + i * 82;
        g.textAlign = 'left';
        g.fillStyle = ['#facc15', '#e5e7eb', '#f59e0b', '#94a3b8', '#94a3b8'][i];
        g.fillText(`${l.posicao}º`, 90, y);
        g.fillStyle = '#f8fafc';
        g.fillText(l.apelido.slice(0, 16), 200, y);
        g.textAlign = 'right';
        g.fillStyle = '#22d3ee';
        g.fillText(`Nível ${l.valor}`, 934, y);
      });
    }
    this.textura.needsUpdate = true;
  }
}
