// Filtros de visão do globo (PostProcessStage do Cesium, GLSL ES 3.0).

const cabecalho = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
float ruido(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + float(czm_frameNumber) * 0.618) * 43758.5453); }
float luz(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float vinheta(vec2 uv, float forca) { vec2 d = uv - 0.5; return clamp(1.0 - dot(d, d) * forca, 0.0, 1.0); }
`

export const MODOS = [
  { id: 'normal', nome: 'Normal', tecla: '1', shader: null },
  {
    id: 'crt',
    nome: 'CRT',
    tecla: '2',
    shader: `${cabecalho}
void main() {
  vec2 uv = v_textureCoordinates;
  vec2 d = uv - 0.5;
  uv = 0.5 + d * (1.0 + 0.08 * dot(d, d));
  float r = texture(colorTexture, uv + vec2(0.0015, 0.0)).r;
  float g = texture(colorTexture, uv).g;
  float b = texture(colorTexture, uv - vec2(0.0015, 0.0)).b;
  vec3 c = vec3(r, g, b);
  float linhas = 0.82 + 0.18 * sin(uv.y * czm_viewport.w * 3.14159);
  c *= linhas * vinheta(uv, 1.6);
  c += (ruido(uv * 400.0) - 0.5) * 0.05;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) c = vec3(0.0);
  out_FragColor = vec4(c * vec3(0.95, 1.05, 0.95), 1.0);
}`,
  },
  {
    id: 'nvg',
    nome: 'Visão noturna',
    tecla: '3',
    shader: `${cabecalho}
void main() {
  vec2 uv = v_textureCoordinates;
  float l = luz(texture(colorTexture, uv).rgb);
  l = pow(clamp(l * 1.9 + 0.05, 0.0, 1.0), 0.8);
  l += (ruido(uv * 900.0) - 0.5) * 0.18;
  vec3 c = vec3(0.15, 1.0, 0.25) * l;
  float circulo = smoothstep(0.52, 0.47, distance(uv * vec2(czm_viewport.z / czm_viewport.w, 1.0), vec2(0.5 * czm_viewport.z / czm_viewport.w, 0.5)));
  out_FragColor = vec4(c * vinheta(uv, 1.2) * max(circulo, 0.12), 1.0);
}`,
  },
  {
    id: 'flir',
    nome: 'FLIR (branco quente)',
    tecla: '4',
    shader: `${cabecalho}
void main() {
  vec2 uv = v_textureCoordinates;
  vec3 c = texture(colorTexture, uv).rgb;
  float l = luz(c);
  float calor = clamp(l * 1.25 + (c.r - c.b) * 0.35, 0.0, 1.0);
  calor += (ruido(uv * 600.0) - 0.5) * 0.06;
  out_FragColor = vec4(vec3(calor), 1.0);
}`,
  },
  {
    id: 'termico',
    nome: 'Térmico (paleta ferro)',
    tecla: '5',
    shader: `${cabecalho}
vec3 ferro(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 a = vec3(0.0, 0.0, 0.1);
  vec3 b = vec3(0.45, 0.0, 0.6);
  vec3 c = vec3(0.95, 0.25, 0.1);
  vec3 d = vec3(1.0, 0.85, 0.2);
  vec3 e = vec3(1.0, 1.0, 0.95);
  if (t < 0.25) return mix(a, b, t / 0.25);
  if (t < 0.5) return mix(b, c, (t - 0.25) / 0.25);
  if (t < 0.75) return mix(c, d, (t - 0.5) / 0.25);
  return mix(d, e, (t - 0.75) / 0.25);
}
void main() {
  vec2 uv = v_textureCoordinates;
  vec3 c = texture(colorTexture, uv).rgb;
  float calor = luz(c) * 1.15 + (c.r - c.b) * 0.3;
  out_FragColor = vec4(ferro(calor), 1.0);
}`,
  },
  {
    id: 'noir',
    nome: 'Noir',
    tecla: '6',
    shader: `${cabecalho}
void main() {
  vec2 uv = v_textureCoordinates;
  float l = luz(texture(colorTexture, uv).rgb);
  l = smoothstep(0.08, 0.85, l);
  l += (ruido(uv * 300.0) - 0.5) * 0.08;
  out_FragColor = vec4(vec3(l) * vinheta(uv, 2.2), 1.0);
}`,
  },
  {
    id: 'chuvisco',
    nome: 'Chuvisco (sinal fraco)',
    tecla: '7',
    shader: `${cabecalho}
void main() {
  vec2 uv = v_textureCoordinates;
  float faixa = step(0.985, fract(uv.y * 3.0 - float(czm_frameNumber) * 0.01));
  uv.x += faixa * 0.02 * sin(float(czm_frameNumber));
  vec3 c = texture(colorTexture, uv).rgb;
  float n = ruido(floor(uv * czm_viewport.zw / 2.0));
  c = mix(c, vec3(n), 0.32);
  out_FragColor = vec4(c, 1.0);
}`,
  },
]
