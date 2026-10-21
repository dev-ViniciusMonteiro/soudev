// Etapas da prospecção na carteira, com a cor do alfinete no mapa.
export const STATUS = [
  ['prospectar', 'Prospectar', '#60a5fa'],
  ['contato', 'Contato feito', '#fbbf24'],
  ['dono', 'Proprietário encontrado', '#a78bfa'],
  ['captado', 'Captado', '#4ade80'],
  ['descartado', 'Descartado', '#94a3b8'],
]

export const corStatus = (s) => STATUS.find(([id]) => id === s)?.[2] ?? '#60a5fa'
export const nomeStatus = (s) => STATUS.find(([id]) => id === s)?.[1] ?? 'Prospectar'
