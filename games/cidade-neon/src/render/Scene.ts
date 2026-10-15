import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { daylightFactor, sunPosition } from '../core/math';
import { makeGlowTexture } from './textures';
import type { City } from '../world/City';

/** Reescreve as coordenadas de textura de uma geometria (para girar/repetir o mosaico). */
function remapUv(geo: THREE.BufferGeometry, fn: (u: number, v: number) => [number, number]): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const [a, b] = fn(uv.getX(i), uv.getY(i));
    uv.setXY(i, a, b);
  }
  uv.needsUpdate = true;
}

/**
 * Owns the renderer, scene graph, camera and the static environment (ground +
 * road grid + dusk lighting). A single directional light covers the whole city
 * for shadows; everything else is emissive, which keeps the night look cheap.
 */
export interface SceneQuality {
  maxPixelRatio?: number; // cap device pixel ratio (lower = cheaper)
  shadowMapSize?: number; // directional shadow resolution
  streaming?: boolean; // streamed world: ground/shadow/sun follow the player (R007)
}

// In streamed mode the shadow frustum is a tight window around the player rather
// than the whole (unbounded) world.
const STREAM_SHADOW_HALF = 90;

// Night (t=0, the original look) ↔ day palette, lerped by the daylight factor.
const NIGHT = {
  sky: 0x141a2e,
  ambient: { color: 0x35406a, intensity: 0.6 },
  hemiSky: 0x3a4a7a,
  sun: { color: 0xbcd0ff, intensity: 1.5 },
};
const DAY = {
  sky: 0x9ec3e6,
  ambient: { color: 0x9fb3d0, intensity: 0.95 },
  hemiSky: 0x87b5e0,
  sun: { color: 0xfff4e0, intensity: 2.6 },
};

export class SceneEnv {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private ambient!: THREE.AmbientLight;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;
  private sunDisc!: THREE.Sprite;
  private sunRadius = 0;
  private ground!: THREE.Mesh;
  private readonly streaming: boolean;
  private followX = 0;
  private followZ = 0;
  private readonly shadowHalf: number;

  constructor(container: HTMLElement, city: City, quality: SceneQuality = {}) {
    const maxPixelRatio = quality.maxPixelRatio ?? 2;
    const shadowMapSize = quality.shadowMapSize ?? 2048;
    this.streaming = !!quality.streaming;
    // Finite world: the shadow frustum spans the whole map. Streamed world: a
    // tight window that follows the player (city.half is effectively unbounded).
    this.shadowHalf = this.streaming ? STREAM_SHADOW_HALF : city.half;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141a2e);
    this.scene.fog = new THREE.Fog(0x141a2e, city.extent * 0.18, city.extent * 0.7);

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.5,
      city.extent * 1.5,
    );
    this.camera.position.set(0, 30, 30);

    this.addLights(city, shadowMapSize);
    this.addGround(city);
    // Streamed roads are everywhere (the grid between blocks); the finite per-
    // roadCenter planes don't apply, so the ground reads as asphalt-dark instead.
    if (!this.streaming) this.addRoads(city);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
  }

  private addLights(city: City, shadowMapSize: number): void {
    this.ambient = new THREE.AmbientLight(NIGHT.ambient.color, NIGHT.ambient.intensity);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight(NIGHT.hemiSky, 0x0a0a12, 0.7);
    this.scene.add(this.hemi);

    const sun = new THREE.DirectionalLight(NIGHT.sun.color, NIGHT.sun.intensity);
    sun.position.set(city.half * 0.6, city.half * 1.2, city.half * 0.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    const cam = sun.shadow.camera;
    cam.left = -this.shadowHalf;
    cam.right = this.shadowHalf;
    cam.top = this.shadowHalf;
    cam.bottom = -this.shadowHalf;
    cam.near = 1;
    cam.far = city.extent * 2.5;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    this.scene.add(sun.target); // target stays at origin; moving the light sweeps shadows
    this.sun = sun;

    // A visible sun/moon disc that rides the same arc as the directional light.
    this.sunRadius = city.extent * 1.1; // inside the camera far plane (extent*1.5)
    const disc = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    disc.scale.setScalar(city.extent * 0.22);
    this.scene.add(disc);
    this.sunDisc = disc;
    this.setTimeOfDay(0); // place everything for the initial (midnight) look
  }

  /**
   * Drive the day/night look from a time-of-day in [0,1) (0 = midnight). Lerps
   * sky/fog colour and light colour+intensity between the night and day
   * palettes by a daylight factor (0 at night, 1 at noon), and rides the sun
   * (the shadow-casting directional light + a visible disc) along an east→
   * overhead→west arc so shadows sweep across the city through the day.
   */
  setTimeOfDay(t: number): void {
    const d = daylightFactor(t); // 0 night → 1 noon
    const mix = (a: number, b: number): THREE.Color => new THREE.Color(a).lerp(new THREE.Color(b), d);
    const lerpN = (a: number, b: number): number => a + (b - a) * d;

    const sky = mix(NIGHT.sky, DAY.sky);
    (this.scene.background as THREE.Color).copy(sky);
    (this.scene.fog as THREE.Fog).color.copy(sky);

    this.ambient.color.copy(mix(NIGHT.ambient.color, DAY.ambient.color));
    this.ambient.intensity = lerpN(NIGHT.ambient.intensity, DAY.ambient.intensity);
    this.hemi.color.copy(mix(NIGHT.hemiSky, DAY.hemiSky));
    this.sun.color.copy(mix(NIGHT.sun.color, DAY.sun.color));
    this.sun.intensity = lerpN(NIGHT.sun.intensity, DAY.sun.intensity);

    // Sweep the light + disc along the day's arc. The target sits at the follow
    // centre (origin in the finite world; the player in the streamed world), so
    // the shadow frustum rides along instead of being left behind.
    const dir = sunPosition(t);
    this.sun.position.set(
      this.followX + dir.x * this.sunRadius,
      dir.y * this.sunRadius,
      this.followZ + dir.z * this.sunRadius,
    );
    this.sun.target.position.set(this.followX, 0, this.followZ);
    this.sun.target.updateMatrixWorld();
    this.sunDisc.position.copy(this.sun.position);
    // Warm sun by day, pale moon by night; never fully invisible.
    this.sunDisc.material.color.copy(mix(0xaec6ff, 0xfff1c4));
    this.sunDisc.material.opacity = 0.45 + 0.4 * d;
  }

  /** Texturas CC0 do ambientCG (ver public/textures/CREDITOS.txt), repetidas em mosaico. */
  private texture(file: string, color: boolean): THREE.Texture {
    const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/${file}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  private addGround(city: City): void {
    const size = city.extent * 2;
    // Calçadas e praças: paralelepípedo (ladrilho de 6 m x 3 m). No mundo
    // infinito o chão faz o papel das ruas, então fica em asfalto.
    const material = this.streaming
      ? new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 1 })
      : new THREE.MeshStandardMaterial({
          map: this.texture('paving_color.jpg', true),
          normalMap: this.texture('paving_normal.jpg', false),
          color: 0xb4b4b4,
          roughness: 0.95,
        });
    const geometry = new THREE.PlaneGeometry(size, size);
    if (!this.streaming) remapUv(geometry, (u, v) => [(u * size) / 6, (v * size) / 3]);
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;
  }

  /**
   * Streamed world: recentre the ground + the shadow/sun window on the player so
   * the lit, shadow-casting region travels with them (the sun is repositioned
   * from these in `setTimeOfDay`, which runs every frame). No-op when finite.
   */
  follow(x: number, z: number): void {
    if (!this.streaming) return;
    this.followX = x;
    this.followZ = z;
    this.ground.position.set(x, 0, z);
  }

  /**
   * Ruas em trechos entre cruzamentos (textura com faixas pintadas, uma
   * repetição a cada largura de rua) e cruzamentos em asfalto liso, para as
   * faixas não se cruzarem e as duas camadas não brigarem (z-fighting).
   * Tudo é mesclado em poucas malhas: 3 draw calls para a cidade inteira.
   */
  private addRoads(city: City): void {
    const w = city.config.roadWidth;
    const half = city.half;
    const centers = [...city.roadCenters].sort((a, b) => a - b);

    // Intervalos de um eixo que não são atravessados por outra rua.
    const spans: [number, number][] = [];
    let cursor = -half;
    for (const c of centers) {
      if (c - w / 2 - cursor > 0.5) spans.push([cursor, c - w / 2]);
      cursor = c + w / 2;
    }
    if (half - cursor > 0.5) spans.push([cursor, half]);

    const along: THREE.BufferGeometry[] = [];
    const crossings: THREE.BufferGeometry[] = [];
    for (const c of centers) {
      for (const [a, b] of spans) {
        const len = b - a;
        const mid = (a + b) / 2;
        // Rua no eixo X (em z = c): a textura corre ao longo do comprimento.
        const h = new THREE.PlaneGeometry(len, w);
        remapUv(h, (u, v) => [v, (u * len) / w]);
        h.rotateX(-Math.PI / 2);
        h.translate(mid, 0.02, c);
        along.push(h);
        // Rua no eixo Z (em x = c).
        const v = new THREE.PlaneGeometry(w, len);
        remapUv(v, (u, vv) => [u, (vv * len) / w]);
        v.rotateX(-Math.PI / 2);
        v.translate(c, 0.02, mid);
        along.push(v);
      }
      for (const c2 of centers) {
        const x = new THREE.PlaneGeometry(w, w);
        remapUv(x, (u, v) => [(u * w) / 8, (v * w) / 8]);
        x.rotateX(-Math.PI / 2);
        x.translate(c, 0.02, c2);
        crossings.push(x);
      }
    }

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.texture('road_color.jpg', true),
      normalMap: this.texture('road_normal.jpg', false),
      color: 0xc4c8d2,
      roughness: 0.85,
    });
    const crossMat = new THREE.MeshStandardMaterial({
      map: this.texture('asphalt_color.jpg', true),
      color: 0x9aa0ab,
      roughness: 0.9,
    });
    for (const [geos, mat] of [
      [along, roadMat],
      [crossings, crossMat],
    ] as const) {
      const mesh = new THREE.Mesh(mergeGeometries(geos as THREE.BufferGeometry[]), mat);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      for (const g of geos) g.dispose();
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
