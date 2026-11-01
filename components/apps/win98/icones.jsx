// Ícones desenhados em pixel (SVG 32×32, sem anti-serrilhado) no espírito do Windows 98.
// São desenhos próprios: nenhum arquivo de ícone da Microsoft é usado.

const R = (x, y, w, h, f) => <rect x={x} y={y} width={w} height={h} fill={f} />

const desenhos = {
  computador: (
    <>
      {R(4, 3, 24, 19, '#000')}
      {R(5, 4, 22, 17, '#dfdfdf')}
      {R(5, 4, 21, 1, '#fff')}
      {R(7, 6, 18, 12, '#000')}
      {R(8, 7, 16, 10, '#008080')}
      {R(9, 8, 6, 2, '#5fd7d7')}
      {R(22, 19, 2, 1, '#00a000')}
      {R(10, 22, 12, 2, '#808080')}
      {R(6, 24, 22, 5, '#000')}
      {R(7, 25, 20, 3, '#c0c0c0')}
      {R(8, 26, 14, 1, '#808080')}
    </>
  ),
  pasta: (
    <>
      {R(2, 7, 11, 3, '#808000')}
      {R(3, 8, 9, 2, '#ffff80')}
      {R(2, 9, 28, 19, '#808000')}
      {R(3, 10, 26, 17, '#ffd700')}
      {R(3, 10, 26, 2, '#ffff80')}
      {R(3, 26, 26, 1, '#c09000')}
    </>
  ),
  pastaAberta: (
    <>
      {R(2, 7, 11, 3, '#808000')}
      {R(2, 9, 24, 19, '#808000')}
      {R(3, 10, 22, 17, '#ffd700')}
      {R(7, 6, 16, 14, '#000')}
      {R(8, 7, 14, 13, '#fff')}
      <polygon points="2,28 8,15 31,15 25,28" fill="#808000" />
      <polygon points="4,27 9,16 29,16 24,27" fill="#ffff80" />
    </>
  ),
  documentos: (
    <>
      {R(2, 7, 11, 3, '#808000')}
      {R(2, 9, 28, 19, '#808000')}
      {R(3, 10, 26, 17, '#ffd700')}
      {R(8, 4, 15, 18, '#000')}
      {R(9, 5, 13, 16, '#fff')}
      {R(11, 8, 9, 1, '#000080')}
      {R(11, 11, 9, 1, '#000080')}
      {R(11, 14, 6, 1, '#000080')}
      <polygon points="2,28 6,17 30,17 26,28" fill="#808000" />
      <polygon points="3,27 7,18 29,18 25,27" fill="#ffe24d" />
    </>
  ),
  texto: (
    <>
      <polygon points="6,2 21,2 27,8 27,30 6,30" fill="#000" />
      <polygon points="7,3 20,3 26,9 26,29 7,29" fill="#fff" />
      <polygon points="20,3 20,9 26,9" fill="#c0c0c0" />
      {R(9, 12, 14, 1, '#808080')}
      {R(9, 15, 14, 1, '#808080')}
      {R(9, 18, 14, 1, '#808080')}
      {R(9, 21, 14, 1, '#808080')}
      {R(9, 24, 9, 1, '#808080')}
    </>
  ),
  bloco: (
    <>
      {R(6, 4, 21, 26, '#000')}
      {R(7, 5, 19, 24, '#fff')}
      {R(7, 5, 19, 4, '#5f9fff')}
      {[9, 13, 17, 21].map((x) => (
        <rect key={x} x={x} y={2} width={2} height={5} fill="#808080" />
      ))}
      {R(9, 12, 15, 1, '#000080')}
      {R(9, 15, 15, 1, '#000080')}
      {R(9, 18, 15, 1, '#000080')}
      {R(9, 21, 10, 1, '#000080')}
      {R(9, 24, 13, 1, '#000080')}
    </>
  ),
  lixeira: (
    <>
      <polygon points="6,8 26,8 23,30 9,30" fill="#000" />
      <polygon points="7,9 25,9 22,29 10,29" fill="#c0c0c0" />
      {[10, 13, 16, 19, 22].map((x) => (
        <rect key={x} x={x} y={10} width={1} height={18} fill="#808080" />
      ))}
      {R(5, 6, 22, 3, '#000')}
      {R(6, 7, 20, 1, '#fff')}
    </>
  ),
  lixeiraCheia: (
    <>
      <polygon points="9,2 17,6 13,10 6,6" fill="#fff" stroke="#000" strokeWidth="1" />
      <polygon points="16,1 26,4 23,9 15,7" fill="#ffff80" stroke="#000" strokeWidth="1" />
      <polygon points="6,8 26,8 23,30 9,30" fill="#000" />
      <polygon points="7,9 25,9 22,29 10,29" fill="#c0c0c0" />
      {[10, 13, 16, 19, 22].map((x) => (
        <rect key={x} x={x} y={10} width={1} height={18} fill="#808080" />
      ))}
      {R(5, 6, 22, 3, '#000')}
      {R(6, 7, 20, 1, '#fff')}
    </>
  ),
  internet: (
    <>
      <circle cx="16" cy="16" r="12" fill="#000" />
      <circle cx="16" cy="16" r="11" fill="#1e64d2" />
      <path d="M9 9 h5 v4 h-3 v4 h4 v5 h-3 v4 h-2 v-6 h-3 v-6 z M18 7 h4 v3 h3 v4 h-4 v3 h3 v6 h-3 v-3 h-3 v-4 h-2 v-4 h2 z" fill="#2ea043" />
      <ellipse cx="16" cy="16" rx="15" ry="5" fill="none" stroke="#ffd700" strokeWidth="2" transform="rotate(-25 16 16)" />
    </>
  ),
  minado: (
    <>
      {R(15, 3, 2, 26, '#000')}
      {R(3, 15, 26, 2, '#000')}
      <path d="M7 7 L25 25 M25 7 L7 25" stroke="#000" strokeWidth="2" />
      <circle cx="16" cy="16" r="8" fill="#000" />
      {R(12, 12, 3, 3, '#fff')}
    </>
  ),
  calculadora: (
    <>
      {R(6, 2, 20, 28, '#000')}
      {R(7, 3, 18, 26, '#c0c0c0')}
      {R(9, 5, 14, 5, '#000')}
      {R(10, 6, 12, 3, '#b8e0b8')}
      {[0, 1, 2, 3].map((l) =>
        [0, 1, 2].map((c) => <rect key={`${l}${c}`} x={9 + c * 5} y={12 + l * 4} width={4} height={3} fill={c === 2 ? '#c00000' : '#000080'} />),
      )}
    </>
  ),
  paint: (
    <>
      <path d="M4 18 C4 8 14 4 21 6 C29 8 30 16 26 19 C23 21 19 18 18 22 C17 27 13 29 9 27 C5 25 4 22 4 18 Z" fill="#000" />
      <path d="M5 18 C5 9 14 5 21 7 C28 9 29 16 25 18 C22 20 18 17 17 22 C16 26 13 28 9 26 C6 24 5 21 5 18 Z" fill="#e6c88c" />
      <circle cx="10" cy="14" r="2" fill="#ff0000" />
      <circle cx="15" cy="10" r="2" fill="#0000ff" />
      <circle cx="21" cy="11" r="2" fill="#00a000" />
      <circle cx="10" cy="21" r="2" fill="#ffff00" />
      <path d="M29 1 L20 18" stroke="#800000" strokeWidth="3" />
      {R(18, 17, 3, 4, '#000')}
    </>
  ),
  dos: (
    <>
      {R(2, 4, 28, 24, '#000')}
      {R(3, 5, 26, 22, '#c0c0c0')}
      {R(3, 5, 26, 4, '#000080')}
      {R(5, 11, 22, 14, '#000')}
      <text x="7" y="21" fontSize="9" fontFamily="monospace" fontWeight="bold" fill="#c0c0c0">C:\</text>
    </>
  ),
  disquete: (
    <>
      {R(5, 5, 22, 22, '#000')}
      {R(6, 6, 20, 20, '#404040')}
      {R(10, 6, 12, 8, '#c0c0c0')}
      {R(17, 7, 3, 6, '#404040')}
      {R(9, 17, 14, 9, '#fff')}
    </>
  ),
  disco: (
    <>
      <polygon points="3,14 9,8 29,8 29,10 23,16 3,16" fill="#000" />
      <polygon points="4,14 10,9 28,9 22,14" fill="#dfdfdf" />
      {R(3, 14, 21, 9, '#000')}
      {R(4, 15, 19, 7, '#c0c0c0')}
      <polygon points="24,14 29,9 29,18 24,23" fill="#808080" />
      {R(6, 19, 3, 1, '#00c000')}
    </>
  ),
  cdrom: (
    <>
      {R(3, 14, 26, 10, '#000')}
      {R(4, 15, 24, 8, '#c0c0c0')}
      {R(6, 18, 14, 2, '#808080')}
      <circle cx="16" cy="9" r="7" fill="#e0e0ff" stroke="#000" />
      <circle cx="16" cy="9" r="2" fill="#fff" stroke="#000" />
    </>
  ),
  painel: (
    <>
      {R(2, 7, 11, 3, '#808000')}
      {R(2, 9, 28, 19, '#808000')}
      {R(3, 10, 26, 17, '#ffd700')}
      <circle cx="12" cy="18" r="5" fill="#808080" stroke="#000" />
      <circle cx="12" cy="18" r="2" fill="#ffd700" />
      {R(18, 13, 9, 7, '#000')}
      {R(19, 14, 7, 5, '#008080')}
    </>
  ),
  video: (
    <>
      {R(4, 3, 24, 19, '#000')}
      {R(5, 4, 22, 17, '#dfdfdf')}
      {R(7, 6, 18, 12, '#000')}
      {R(8, 7, 16, 10, '#c040c0')}
      {R(8, 7, 8, 5, '#ffff00')}
      {R(16, 12, 8, 5, '#00c0c0')}
      {R(10, 22, 12, 4, '#808080')}
      {R(6, 26, 20, 2, '#000')}
    </>
  ),
  relogio: (
    <>
      <circle cx="16" cy="16" r="13" fill="#000" />
      <circle cx="16" cy="16" r="12" fill="#fff" />
      <path d="M16 8 V16 L22 19" stroke="#000" strokeWidth="2" fill="none" />
      {[0, 90, 180, 270].map((a) => (
        <rect key={a} x={15} y={5} width={2} height={2} fill="#000080" transform={`rotate(${a} 16 16)`} />
      ))}
    </>
  ),
  programas: (
    <>
      {R(2, 7, 11, 3, '#808000')}
      {R(2, 9, 28, 19, '#808000')}
      {R(3, 10, 26, 17, '#ffd700')}
      {R(9, 13, 15, 11, '#000')}
      {R(10, 14, 13, 9, '#fff')}
      {R(10, 14, 13, 2, '#000080')}
    </>
  ),
  executar: (
    <>
      {R(3, 6, 22, 18, '#000')}
      {R(4, 7, 20, 16, '#fff')}
      {R(4, 7, 20, 3, '#000080')}
      <polygon points="17,15 29,15 29,12 32,18 29,24 29,21 17,21" fill="#000" />
      <polygon points="18,16 30,16 30,14 31,18 30,22 30,20 18,20" fill="#00a000" />
    </>
  ),
  ajuda: (
    <>
      {R(5, 4, 22, 25, '#000')}
      {R(6, 5, 20, 23, '#5050c8')}
      {R(6, 5, 3, 23, '#2a2a80')}
      <text x="12" y="23" fontSize="17" fontWeight="bold" fontFamily="serif" fill="#ffff00">?</text>
    </>
  ),
  desligar: (
    <>
      {R(4, 3, 24, 19, '#000')}
      {R(5, 4, 22, 17, '#dfdfdf')}
      {R(7, 6, 18, 12, '#000')}
      <circle cx="16" cy="12" r="4" fill="none" stroke="#ff4040" strokeWidth="2" />
      {R(15, 6, 2, 6, '#ff4040')}
      {R(10, 22, 12, 4, '#808080')}
      {R(6, 26, 20, 2, '#000')}
    </>
  ),
  logoff: (
    <>
      <circle cx="11" cy="12" r="7" fill="#000" />
      <circle cx="11" cy="12" r="6" fill="#ffd700" />
      <circle cx="11" cy="12" r="2" fill="#000" />
      {R(16, 11, 13, 3, '#000')}
      {R(17, 12, 11, 1, '#ffd700')}
      {R(24, 14, 2, 4, '#000')}
      {R(20, 14, 2, 3, '#000')}
    </>
  ),
  documentosMenu: (
    <>
      {R(4, 6, 16, 20, '#000')}
      {R(5, 7, 14, 18, '#fff')}
      {R(11, 3, 16, 20, '#000')}
      {R(12, 4, 14, 18, '#ffffe0')}
      {R(14, 8, 10, 1, '#808080')}
      {R(14, 11, 10, 1, '#808080')}
      {R(14, 14, 7, 1, '#808080')}
    </>
  ),
  configuracoes: (
    <>
      {R(2, 7, 11, 3, '#808000')}
      {R(2, 9, 28, 19, '#808000')}
      {R(3, 10, 26, 17, '#ffd700')}
      <circle cx="16" cy="18" r="6" fill="#808080" stroke="#000" />
      <circle cx="16" cy="18" r="2" fill="#ffd700" stroke="#000" />
      {[0, 45, 90, 135].map((a) => (
        <rect key={a} x={15} y={10} width={2} height={16} fill="#808080" transform={`rotate(${a} 16 18)`} />
      ))}
    </>
  ),
  imagem: (
    <>
      <polygon points="6,2 21,2 27,8 27,30 6,30" fill="#000" />
      <polygon points="7,3 20,3 26,9 26,29 7,29" fill="#fff" />
      {R(9, 12, 15, 13, '#000')}
      {R(10, 13, 13, 11, '#80c0ff')}
      <polygon points="10,24 15,17 19,21 21,19 23,24" fill="#008000" />
      {R(19, 14, 3, 3, '#ffff00')}
    </>
  ),
  aplicativo: (
    <>
      {R(3, 5, 26, 22, '#000')}
      {R(4, 6, 24, 20, '#c0c0c0')}
      {R(4, 6, 24, 4, '#000080')}
      {R(6, 12, 20, 12, '#fff')}
    </>
  ),
  arquivo: (
    <>
      <polygon points="6,2 21,2 27,8 27,30 6,30" fill="#000" />
      <polygon points="7,3 20,3 26,9 26,29 7,29" fill="#fff" />
      <polygon points="20,3 20,9 26,9" fill="#c0c0c0" />
    </>
  ),
  soudev: (
    <>
      <circle cx="16" cy="16" r="13" fill="#000" />
      <circle cx="16" cy="16" r="12" fill="#1f5c45" />
      <polygon points="8,16 16,8 16,13 24,13 24,19 16,19 16,24" fill="#fffdf8" />
    </>
  ),
  rede: (
    <>
      {R(2, 2, 12, 10, '#000')}
      {R(3, 3, 10, 7, '#008080')}
      {R(18, 2, 12, 10, '#000')}
      {R(19, 3, 10, 7, '#008080')}
      {R(10, 18, 12, 10, '#000')}
      {R(11, 19, 10, 7, '#008080')}
      {R(7, 12, 2, 4, '#000')}
      {R(23, 12, 2, 4, '#000')}
      {R(7, 15, 18, 2, '#000')}
      {R(15, 15, 2, 3, '#000')}
    </>
  ),
  erro: (
    <>
      <circle cx="16" cy="16" r="14" fill="#000" />
      <circle cx="16" cy="16" r="13" fill="#ff0000" />
      <path d="M10 10 L22 22 M22 10 L10 22" stroke="#fff" strokeWidth="3.5" />
    </>
  ),
  aviso: (
    <>
      <polygon points="16,2 31,29 1,29" fill="#000" />
      <polygon points="16,4 29,28 3,28" fill="#ffff00" />
      {R(15, 11, 3, 10, '#000')}
      {R(15, 23, 3, 3, '#000')}
    </>
  ),
  info: (
    <>
      <path d="M3 14 C3 6 9 2 16 2 C24 2 29 7 29 14 C29 21 24 25 16 25 L10 31 L11 24 C6 23 3 19 3 14 Z" fill="#fff" stroke="#000" />
      {R(14, 6, 4, 3, '#0000ff')}
      {R(14, 11, 4, 10, '#0000ff')}
    </>
  ),
  pergunta: (
    <>
      <path d="M3 14 C3 6 9 2 16 2 C24 2 29 7 29 14 C29 21 24 25 16 25 L10 31 L11 24 C6 23 3 19 3 14 Z" fill="#fff" stroke="#000" />
      <text x="10" y="21" fontSize="17" fontWeight="bold" fontFamily="serif" fill="#0000ff">?</text>
    </>
  ),
  // Uma janela de quatro vidraças (desenho próprio, não é o logotipo da Microsoft).
  logo: (
    <>
      {R(2, 3, 28, 26, '#000')}
      {R(3, 4, 26, 5, '#000080')}
      {R(24, 5, 4, 3, '#c0c0c0')}
      {R(3, 9, 26, 19, '#c0c0c0')}
      {R(5, 11, 10, 7, '#e8412c')}
      {R(17, 11, 10, 7, '#2ea043')}
      {R(5, 20, 10, 7, '#2f6fe0')}
      {R(17, 20, 10, 7, '#f2b51c')}
      {R(5, 11, 10, 1, '#ff9a8a')}
      {R(17, 11, 10, 1, '#8ee39b')}
      {R(5, 20, 10, 1, '#9cc0ff')}
      {R(17, 20, 10, 1, '#ffe08a')}
    </>
  ),
  alto: (
    <>
      {R(8, 10, 4, 12, '#000')}
      <polygon points="12,10 20,4 20,28 12,22" fill="#000" />
      <path d="M23 10 Q27 16 23 22" stroke="#000" strokeWidth="2" fill="none" />
    </>
  ),
}

export default function Icone({ nome, tamanho = 32, className = '' }) {
  const d = desenhos[nome] || desenhos.arquivo
  return (
    <svg className={`w98-icone ${className}`} width={tamanho} height={tamanho} viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true" data-icone-nome={nome}>
      {d}
    </svg>
  )
}

/** Ícone de um item do disco pelo nome/tipo. */
export function iconeDoArquivo(nome, tipo) {
  if (tipo === 'pasta') return 'pasta'
  const ext = nome.includes('.') ? nome.split('.').pop().toLowerCase() : ''
  if (ext === 'txt' || ext === 'ini' || ext === 'bat' || ext === 'sys') return 'texto'
  if (ext === 'bmp' || ext === 'png') return 'imagem'
  if (ext === 'exe' || ext === 'com') {
    const n = nome.toLowerCase()
    if (n.startsWith('notepad')) return 'bloco'
    if (n.startsWith('calc')) return 'calculadora'
    if (n.startsWith('winmine')) return 'minado'
    if (n.startsWith('mspaint')) return 'paint'
    if (n.startsWith('command')) return 'dos'
    if (n.startsWith('iexplore')) return 'internet'
    return 'aplicativo'
  }
  return 'arquivo'
}
