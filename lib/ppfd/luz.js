// Conversões de luz para cultivo: lux → PPFD conforme o espectro da luminária, DLI e faixas por fase.
//
// Por que o espectro importa: lux pesa a luz pela sensibilidade do olho (curva V(λ)), que quase não vê o vermelho.
// Um fóton de 660 nm conta ~10× menos lux que um fóton de luz branca, mas vale o mesmo para a planta.
//  - Branco 3000K/3500K CRI 80: ~73–74 lux por µmol/m²/s (dado medido em LEDs de fósforo branco).
//  - 660 nm: 1 µmol/s/m² = 0,1813 W/m² (energia do fóton) × 683 lm/W × V(660)=0,061 ≈ 7,6 lux.
// Uma luz "branca + 660" mistura os dois na proporção de fótons do vermelho.

export const LUX_POR_UMOL_660 = 0.1813 * 683 * 0.061 // ≈ 7,55

/** Fator lux → PPFD (µmol/m²/s por lux) de branco com uma fração de fótons em 660 nm. */
export function fatorMistura(luxPorUmolBranco, fracaoVermelho) {
  const r = Math.min(0.6, Math.max(0, fracaoVermelho))
  return 1 / (luxPorUmolBranco * (1 - r) + LUX_POR_UMOL_660 * r)
}

/**
 * Perfis de luz. "branco" = lux por µmol/m²/s da parte branca; "vermelho" = fração de fótons em 660 nm (padrão).
 * Os perfis com 660 deixam ajustar a porcentagem de vermelho, que muda de luminária para luminária.
 */
export const PERFIS = [
  { id: 'evo3000r', nome: 'Samsung LM301H EVO 3000K + 660 nm', branco: 73, vermelho: 0.15, ajustaVermelho: true, nota: 'Placas full spectrum de floração (ex.: Yxo/Yuxinou, quantum boards com 660 nm).' },
  { id: 'evo3500r', nome: 'Samsung LM301H EVO 3500K + 660 nm', branco: 74, vermelho: 0.15, ajustaVermelho: true, nota: 'Mesmo tipo de placa com branco um pouco mais frio.' },
  { id: 'evo3000', nome: 'LM301H / EVO 3000K (só branco)', branco: 73, vermelho: 0, ajustaVermelho: false, nota: 'Placas só com LEDs brancos.' },
  { id: 'evo3500', nome: 'LM301H / EVO 3500K (só branco)', branco: 74, vermelho: 0, ajustaVermelho: false, nota: 'Placas só com LEDs brancos.' },
  { id: 'sol', nome: 'Luz do sol', fatorFixo: 0.0185, nota: 'Fator usual para luz do dia: 1 klux ≈ 18,5 µmol/m²/s.' },
  { id: 'personalizado', nome: 'Personalizado (meu fator)', fatorFixo: null, nota: 'Use se tiver o fator da sua luminária (PPFD dividido por lux).' },
]

export function fatorDoPerfil(perfil, vermelho, fatorPersonalizado) {
  if (perfil.id === 'personalizado') return Number(fatorPersonalizado) || 0.0145
  if (perfil.fatorFixo) return perfil.fatorFixo
  return fatorMistura(perfil.branco, perfil.ajustaVermelho ? vermelho : perfil.vermelho)
}

/** DLI (mol/m²/dia) = PPFD × horas de luz × 3600 / 1.000.000. */
export const dli = (ppfd, horas) => (ppfd * horas * 3600) / 1e6

/** Faixas de referência de PPFD (µmol/m²/s) para cannabis e plantas de alta luz, sem CO₂ extra. */
export const FAIXAS = [
  { id: 'muda', nome: 'Mudas e clones', min: 100, max: 300, horas: 18, cor: '#93c5fd' },
  { id: 'vega', nome: 'Vegetativo', min: 300, max: 600, horas: 18, cor: '#4ade80' },
  { id: 'flor', nome: 'Floração', min: 600, max: 900, horas: 12, cor: '#f59e0b' },
  { id: 'flor-forte', nome: 'Floração intensa', min: 900, max: 1200, horas: 12, cor: '#ef4444', nota: 'Acima de ~1000 só compensa com CO₂, temperatura e nutrição em dia.' },
]

/** Situação de uma leitura para a fase escolhida, com a dica de altura da luz. */
export function avaliar(ppfd, faseId) {
  const f = FAIXAS.find((x) => x.id === faseId) ?? FAIXAS[2]
  if (ppfd < f.min * 0.85) return { tom: 'baixo', texto: `Abaixo do ideal para ${f.nome.toLowerCase()} (${f.min}–${f.max}). Desça a luz ou aumente a potência.` }
  if (ppfd > f.max * 1.1) return { tom: 'alto', texto: `Acima do ideal para ${f.nome.toLowerCase()} (${f.min}–${f.max}). Suba a luz ou diminua a potência para evitar estresse.` }
  return { tom: 'ok', texto: `Dentro do ideal para ${f.nome.toLowerCase()} (${f.min}–${f.max} µmol/m²/s).` }
}

/**
 * Estimativa pela ficha da luminária: PPF = potência na tomada × eficiência (µmol/J);
 * PPFD médio ≈ PPF × aproveitamento / área. O aproveitamento (~0,8–0,9) desconta a luz que escapa pelas bordas.
 */
export function estimarPelaPotencia({ watts, eficiencia, largura, comprimento, aproveitamento = 0.85 }) {
  const area = (Number(largura) || 0) * (Number(comprimento) || 0)
  const ppf = (Number(watts) || 0) * (Number(eficiencia) || 0)
  return { ppf, area, ppfdMedio: area ? (ppf * aproveitamento) / area : 0 }
}

/** Uniformidade de um mapa de leituras: mínimo ÷ média (acima de 0,7 é bom). */
export function resumoMapa(valores) {
  const v = valores.filter((x) => Number.isFinite(x) && x > 0)
  if (!v.length) return null
  const media = v.reduce((s, x) => s + x, 0) / v.length
  const min = Math.min(...v)
  const max = Math.max(...v)
  return { media, min, max, uniformidade: min / media, n: v.length }
}
