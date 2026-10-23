// Carros dirigíveis: 4 carros compartilhados pela sala. Um motorista por carro (o servidor decide).
// Quem dirige usa os mesmos controles de andar: frente/trás acelera e dá ré, os lados viram o volante.
// Os outros veem o carro seguindo a pose de quem dirige (que já chega interpolada, como a dos bonecos).

import * as THREE from 'three';
import { type Caixa, resolverColisao } from './mundo';
import { CARROS, type EstadoCarro } from './protocolo';

const ESCALA = 4;
/** A roda fica 0,061 abaixo do centro do modelo; o asfalto, 0,073 acima do chão. Assim as rodas encostam na rua. */
const ALTURA = 0.073 + 0.061 * ESCALA;
const RAIO = 1.5; // colisão do carro (círculo)
const VEL_MAX = 18; // m/s (~65 km/h)
const VEL_TURBO = 26; // segurando Shift
const VEL_RE = 7;
const ACELERA = 12;
const FREIA = 26;
const ATRITO = 5;
const VIRA = 1.9; // rad/s com velocidade cheia

export interface Carro {
  id: number;
  grupo: THREE.Object3D;
  rodas: THREE.Object3D[];
  motorista: string;
  x: number;
  z: number;
  rot: number;
}

export class Carros {
  readonly lista: Carro[] = [];
  /** Carro que eu estou dirigindo (null = a pé). */
  meu: Carro | null = null;
  vel = 0;

  constructor(cena: THREE.Scene, modelos: Map<string, THREE.Object3D>) {
    CARROS.forEach((c, id) => {
      const grupo = modelos.get(c.modelo)!.clone();
      grupo.scale.setScalar(ESCALA);
      grupo.position.set(c.x, ALTURA, c.z);
      grupo.rotation.y = c.rot;
      const rodas: THREE.Object3D[] = [];
      grupo.traverse((o) => o.name.includes('wheel') && rodas.push(o));
      cena.add(grupo);
      this.lista.push({ id, grupo, rodas, motorista: '', x: c.x, z: c.z, rot: c.rot });
    });
  }

  /** Estado vindo do servidor (quem dirige e onde ficaram os parados). */
  receber(l: EstadoCarro[], euId: string | undefined): void {
    for (const [id, x, z, rot, motorista] of l) {
      const c = this.lista[id];
      if (!c) continue;
      c.motorista = motorista;
      if (motorista !== euId && !motorista) {
        c.x = x;
        c.z = z;
        c.rot = rot;
      }
    }
    const antes = this.meu;
    this.meu = this.lista.find((c) => c.motorista && c.motorista === euId) ?? null;
    if (this.meu && this.meu !== antes) this.vel = 0;
  }

  /** Carro livre mais perto (para mostrar "E para dirigir"). */
  livrePerto(x: number, z: number, alcance: number): Carro | null {
    let melhor: Carro | null = null;
    let d = alcance;
    for (const c of this.lista) {
      const dc = Math.hypot(c.x - x, c.z - z);
      if (!c.motorista && dc < d) {
        d = dc;
        melhor = c;
      }
    }
    return melhor;
  }

  /** Física do carro que eu dirijo: frente/trás acelera, lados viram. Devolve a posição para mandar como pose. */
  dirigir(dt: number, frente: number, lado: number, turbo: boolean, colisao: Caixa[]): void {
    const c = this.meu;
    if (!c) return;
    const max = turbo ? VEL_TURBO : VEL_MAX;
    if (frente > 0.05) this.vel += (this.vel < 0 ? FREIA : ACELERA) * frente * dt;
    else if (frente < -0.05) this.vel += (this.vel > 0 ? -FREIA : -ACELERA) * -frente * dt;
    else this.vel -= Math.sign(this.vel) * Math.min(Math.abs(this.vel), ATRITO * dt);
    this.vel = Math.max(-VEL_RE, Math.min(max, this.vel));
    // Volante: só vira andando; de ré, o carro vira para o outro lado (como um carro de verdade).
    c.rot -= lado * VIRA * dt * Math.min(1, Math.abs(this.vel) / 6) * Math.sign(this.vel || 1);
    const p = new THREE.Vector3(c.x + Math.sin(c.rot) * this.vel * dt, 0, c.z + Math.cos(c.rot) * this.vel * dt);
    if (resolverColisao(p, RAIO, colisao)) this.vel *= 0.4; // bateu: perde velocidade
    c.x = p.x;
    c.z = p.z;
  }

  /** Atualiza os modelos: o meu pela física, os dos outros pela pose do motorista, rodas girando. */
  animar(poseDe: (id: string) => { x: number; z: number; rot: number } | null): void {
    for (const c of this.lista) {
      const antes = c.grupo.position.clone();
      if (c.motorista && c !== this.meu) {
        const p = poseDe(c.motorista);
        if (p) {
          c.x = p.x;
          c.z = p.z;
          c.rot = p.rot;
        }
      }
      c.grupo.position.set(c.x, ALTURA, c.z);
      c.grupo.rotation.y = c.rot;
      const andou = Math.hypot(c.x - antes.x, c.z - antes.z) * (c === this.meu ? Math.sign(this.vel || 1) : 1);
      for (const r of c.rodas) r.rotation.x += andou / (0.072 * ESCALA);
    }
  }

  /** Caixas de colisão dos carros (para bonecos e para o meu carro não atravessar os outros). */
  caixas(exceto: Carro | null): Caixa[] {
    return this.lista.filter((c) => c !== exceto).map((c) => ({ x: c.x, z: c.z, mx: 1.0, mz: 1.0 }));
  }

  /** Onde a pessoa desce: ao lado da porta do motorista. */
  ladoDaPorta(c: Carro): THREE.Vector3 {
    return new THREE.Vector3(c.x + Math.cos(c.rot) * 1.8, 0, c.z - Math.sin(c.rot) * 1.8);
  }
}
