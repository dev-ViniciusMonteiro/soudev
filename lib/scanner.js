// Análise de arquivos baixados, feita no navegador: o arquivo nunca sai do aparelho.
// Não é um antivírus: procura sinais conhecidos de golpe e de malware (tipo real do arquivo,
// macros, scripts escondidos, comandos perigosos, programas disfarçados) e abre ZIP, GZ e TAR.

import { gunzipSync, inflateSync, unzlibSync } from 'fflate'

const LIMITES = {
  profundidade: 4, // ZIP dentro de ZIP dentro de ZIP...
  itens: 3000,
  itemMax: 80 * 1024 ** 2, // maior arquivo descompactado que analisamos
  totalDescompactado: 600 * 1024 ** 2,
  leitura: 24 * 1024 ** 2, // bytes lidos para procurar textos (começo + fim do arquivo)
}

export const PESO = { ok: 0, info: 1, warn: 2, danger: 3 }
const maior = (a, b) => (PESO[b] > PESO[a] ? b : a)

const u16 = (b, o) => b[o] | (b[o + 1] << 8)
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 0x1000000
const u64 = (b, o) => u32(b, o) + u32(b, o + 4) * 2 ** 32
const latin1 = new TextDecoder('latin1')
const utf8 = new TextDecoder('utf-8')
const ascii = (b, inicio, fim) => latin1.decode(b.subarray(inicio, Math.min(fim, b.length)))
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Texto do arquivo para buscas (latin1 preserva cada byte). Arquivos grandes: começo + fim. */
function textoDe(b) {
  if (b.length <= LIMITES.leitura) return latin1.decode(b)
  const fim = 4 * 1024 ** 2
  return latin1.decode(b.subarray(0, LIMITES.leitura - fim)) + '\n' + latin1.decode(b.subarray(b.length - fim))
}

function indexOfBytes(b, padrao, de = 0, ate = b.length) {
  const primeiro = padrao[0]
  for (let i = b.indexOf(primeiro, de); i !== -1 && i <= ate - padrao.length; i = b.indexOf(primeiro, i + 1)) {
    let ok = true
    for (let j = 1; j < padrao.length; j++) {
      if (b[i + j] !== padrao[j]) {
        ok = false
        break
      }
    }
    if (ok) return i
  }
  return -1
}

const utf16le = (texto) => Uint8Array.from([...texto].flatMap((c) => [c.charCodeAt(0), 0]))

export function entropia(b) {
  const amostra = b.length > 8 * 1024 ** 2 ? b.subarray(0, 8 * 1024 ** 2) : b
  if (!amostra.length) return 0
  const contagem = new Uint32Array(256)
  for (let i = 0; i < amostra.length; i++) contagem[amostra[i]]++
  let h = 0
  for (const c of contagem) {
    if (!c) continue
    const p = c / amostra.length
    h -= p * Math.log2(p)
  }
  return h
}

export async function sha256(b) {
  const hash = await crypto.subtle.digest('SHA-256', b)
  return Array.from(new Uint8Array(hash), (x) => x.toString(16).padStart(2, '0')).join('')
}

// ---------- Tipo real do arquivo ----------

const comeca = (b, ...bytes) => bytes.every((x, i) => b[i] === x)

export function detectarTipo(b) {
  const t = (tipo, rotulo) => ({ tipo, rotulo })
  if (b.length < 4) return t('vazio', 'Arquivo vazio ou muito pequeno')
  if (comeca(b, 0x4d, 0x5a)) {
    const pe = b.length > 0x40 ? u32(b, 0x3c) : 0
    if (pe && pe + 4 < b.length && ascii(b, pe, pe + 4) === 'PE\0\0') return t('pe', 'Programa do Windows')
    return t('pe', 'Programa do Windows (MS-DOS)')
  }
  if (comeca(b, 0x50, 0x4b, 0x03, 0x04) || comeca(b, 0x50, 0x4b, 0x05, 0x06) || comeca(b, 0x50, 0x4b, 0x07, 0x08)) return t('zip', 'Arquivo compactado ZIP')
  if (comeca(b, 0x7f, 0x45, 0x4c, 0x46)) return t('elf', 'Programa do Linux/Android')
  if (comeca(b, 0xcf, 0xfa, 0xed, 0xfe) || comeca(b, 0xce, 0xfa, 0xed, 0xfe) || comeca(b, 0xfe, 0xed, 0xfa, 0xcf)) return t('macho', 'Programa do macOS')
  if (comeca(b, 0xca, 0xfe, 0xba, 0xbe)) return u32(b, 4) > 0 && b[4] === 0 && b[5] === 0 && b[6] === 0 && b[7] < 20 ? t('macho', 'Programa do macOS') : t('class', 'Programa Java (.class)')
  if (comeca(b, 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) return t('ole', 'Documento do Office antigo ou instalador MSI')
  if (comeca(b, 0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00)) return t('lnk', 'Atalho do Windows (.lnk)')
  if (comeca(b, 0x52, 0x61, 0x72, 0x21, 0x1a, 0x07)) return t('rar', 'Arquivo compactado RAR')
  if (comeca(b, 0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)) return t('7z', 'Arquivo compactado 7-Zip')
  if (comeca(b, 0x1f, 0x8b)) return t('gzip', 'Arquivo compactado GZIP')
  if (comeca(b, 0x4d, 0x53, 0x43, 0x46)) return t('cab', 'Arquivo compactado CAB')
  if (comeca(b, 0x64, 0x65, 0x78, 0x0a)) return t('dex', 'Código de app Android (.dex)')
  if (comeca(b, 0x7b, 0x5c, 0x72, 0x74)) return t('rtf', 'Documento RTF')
  if (ascii(b, 0, 1024).includes('%PDF-')) return t('pdf', 'Documento PDF')
  if (comeca(b, 0x89, 0x50, 0x4e, 0x47)) return t('png', 'Imagem PNG')
  if (comeca(b, 0xff, 0xd8, 0xff)) return t('jpeg', 'Imagem JPEG')
  if (ascii(b, 0, 4) === 'GIF8') return t('gif', 'Imagem GIF')
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return t('midia', 'Imagem WEBP')
  if (ascii(b, 0, 4) === 'RIFF') return t('midia', 'Áudio ou vídeo (RIFF)')
  if (ascii(b, 4, 8) === 'ftyp') return t('midia', 'Vídeo ou áudio (MP4/MOV/HEIC)')
  if (ascii(b, 0, 3) === 'ID3' || comeca(b, 0xff, 0xfb) || ascii(b, 0, 4) === 'OggS' || ascii(b, 0, 4) === 'fLaC') return t('midia', 'Áudio')
  if (comeca(b, 0x1a, 0x45, 0xdf, 0xa3)) return t('midia', 'Vídeo (MKV/WEBM)')
  for (const pos of [0x8001, 0x8801, 0x9001]) if (b.length > pos + 5 && ascii(b, pos, pos + 5) === 'CD001') return t('iso', 'Imagem de disco (ISO)')
  if (ascii(b, 0, 8) === 'conectix' || ascii(b, b.length - 512, b.length - 504) === 'conectix') return t('vhd', 'Disco virtual (VHD)')
  if (ascii(b, 0, 8) === 'vhdxfile') return t('vhd', 'Disco virtual (VHDX)')
  if (b.length > 262 && ascii(b, 257, 262) === 'ustar') return t('tar', 'Arquivo compactado TAR')
  if (ehTexto(b)) {
    const inicio = ascii(b, 0, 4096).replace(/^\uFEFF|^\xEF\xBB\xBF/, '').trimStart().toLowerCase()
    if (inicio.startsWith('<svg') || (inicio.startsWith('<?xml') && inicio.includes('<svg'))) return t('svg', 'Imagem SVG (pode ter código)')
    if (/<(!doctype html|html|head|body|script|iframe|form)\b/.test(inicio)) return t('html', 'Página HTML')
    return t('texto', 'Texto ou script')
  }
  return t('binario', 'Arquivo binário (tipo desconhecido)')
}

function ehTexto(b) {
  const n = Math.min(b.length, 8192)
  if (b[0] === 0xff && b[1] === 0xfe) return true // UTF-16
  let ruins = 0
  for (let i = 0; i < n; i++) {
    const c = b[i]
    if (c === 0) return false
    if (c < 9 || (c > 13 && c < 32)) ruins++
  }
  return ruins / n < 0.02
}

// ---------- Nome e extensão ----------

const EXTENSOES = {
  exe: ['warn', 'É um programa do Windows. Só abra se você baixou do site oficial de quem fez o programa.'],
  msi: ['warn', 'É um instalador do Windows. Só abra se você baixou do site oficial.'],
  msix: ['warn', 'É um instalador do Windows. Só abra se você baixou do site oficial.'],
  appx: ['warn', 'É um instalador do Windows. Só abra se você baixou do site oficial.'],
  scr: ['danger', 'Arquivo .scr (proteção de tela) é um programa disfarçado. Quase sempre é vírus.'],
  pif: ['danger', 'Arquivo .pif roda como programa e é usado para disfarçar vírus.'],
  com: ['warn', 'Arquivo .com é um programa antigo do Windows, raro hoje em dia e usado para disfarçar vírus.'],
  cpl: ['danger', 'Arquivo .cpl é um programa do Painel de Controle, muito usado por vírus bancários.'],
  dll: ['warn', 'Biblioteca de programa do Windows (.dll). Não é algo que se baixa para abrir.'],
  sys: ['warn', 'Driver do Windows (.sys). Não instale drivers de fontes desconhecidas.'],
  bat: ['warn', 'Script do Windows (.bat): executa comandos no seu computador ao ser aberto.'],
  cmd: ['warn', 'Script do Windows (.cmd): executa comandos no seu computador ao ser aberto.'],
  ps1: ['warn', 'Script do PowerShell: pode controlar todo o seu computador.'],
  psm1: ['warn', 'Módulo do PowerShell: pode controlar todo o seu computador.'],
  vbs: ['warn', 'Script VBScript: roda direto no Windows. Recebido por e-mail ou mensagem, quase sempre é golpe.'],
  vbe: ['danger', 'Script VBScript codificado (.vbe): feito para esconder o que faz. Quase sempre é vírus.'],
  js: ['warn', 'Arquivo JavaScript: no Windows, abrir com dois cliques executa o código. Recebido por e-mail, quase sempre é golpe.'],
  jse: ['danger', 'Script JavaScript codificado (.jse): feito para esconder o que faz. Quase sempre é vírus.'],
  wsf: ['danger', 'Script do Windows (.wsf): formato raro, usado quase só por vírus.'],
  wsh: ['danger', 'Configuração de script do Windows (.wsh): usada para rodar vírus.'],
  hta: ['danger', 'Aplicativo HTML (.hta): roda com acesso total ao Windows. Usado quase só em ataques.'],
  sct: ['danger', 'Scriptlet do Windows (.sct): usado em ataques para rodar código.'],
  reg: ['warn', 'Arquivo de registro do Windows: altera configurações do sistema ao ser aberto.'],
  lnk: ['warn', 'Atalho do Windows: abrir executa o que estiver escrito nele, e golpistas escondem comandos ali.'],
  url: ['info', 'Atalho de internet: abre um endereço.'],
  scf: ['danger', 'Arquivo .scf: usado para roubar a senha do Windows na rede.'],
  inf: ['warn', 'Arquivo de instalação do Windows (.inf).'],
  chm: ['warn', 'Arquivo de ajuda do Windows (.chm): pode rodar scripts escondidos.'],
  jar: ['warn', 'Programa Java (.jar): roda com acesso ao seu computador. Recebido por mensagem, desconfie.'],
  apk: ['warn', 'Aplicativo de Android baixado fora da Play Store. Golpistas mandam APKs falsos de bancos e de "atualização".'],
  xapk: ['warn', 'Aplicativo de Android baixado fora da Play Store.'],
  iso: ['warn', 'Imagem de disco: golpistas escondem programas dentro dela para escapar dos avisos do Windows.'],
  img: ['warn', 'Imagem de disco: golpistas escondem programas dentro dela para escapar dos avisos do Windows.'],
  vhd: ['warn', 'Disco virtual: golpistas escondem programas dentro dele para escapar dos avisos do Windows.'],
  vhdx: ['warn', 'Disco virtual: golpistas escondem programas dentro dele para escapar dos avisos do Windows.'],
  one: ['warn', 'Caderno do OneNote: já foi muito usado para esconder vírus em botões "clique para ver".'],
  docm: ['warn', 'Documento do Word com macros (programas embutidos).'],
  dotm: ['warn', 'Modelo do Word com macros (programas embutidos).'],
  xlsm: ['warn', 'Planilha do Excel com macros (programas embutidos).'],
  xltm: ['warn', 'Modelo do Excel com macros (programas embutidos).'],
  xlam: ['warn', 'Suplemento do Excel com macros (programas embutidos).'],
  pptm: ['warn', 'Apresentação com macros (programas embutidos).'],
  ppsm: ['warn', 'Apresentação com macros (programas embutidos).'],
  html: ['info', 'Página HTML: abre no navegador. Recebida como anexo, pode ser uma tela falsa de login.'],
  htm: ['info', 'Página HTML: abre no navegador. Recebida como anexo, pode ser uma tela falsa de login.'],
  shtml: ['info', 'Página HTML: abre no navegador.'],
  svg: ['info', 'Imagem SVG: pode conter código que roda no navegador.'],
  dmg: ['info', 'Instalador do macOS. Só abra se você baixou do site oficial.'],
  pkg: ['info', 'Instalador do macOS. Só abra se você baixou do site oficial.'],
  sh: ['info', 'Script do Linux/macOS: executa comandos no computador.'],
  py: ['info', 'Script Python: executa comandos no computador.'],
}
const EXT_PROGRAMA = /^(exe|scr|pif|com|cpl|bat|cmd|ps1|vbs|vbe|js|jse|wsf|wsh|hta|lnk|jar|msi|reg|sct|dll|apk)$/
const EXT_ISCA = /^(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|rtf|mp[34]|zip|rar|csv|odt|html?)$/

export const extensao = (nome) => (nome.match(/\.([a-z0-9]{1,6})$/i)?.[1] || '').toLowerCase()

function analisarNome(nome) {
  const achados = []
  const ext = extensao(nome)
  if (/[\u202A-\u202E\u2066-\u2069\u200E\u200F]/.test(nome)) {
    achados.push(['danger', 'O nome tem um caractere invisível que inverte o texto: um "fdp.exe" aparece como "exe.pdf". Truque clássico de vírus.'])
  }
  const partes = nome.toLowerCase().split('.')
  if (partes.length >= 3 && EXT_PROGRAMA.test(partes.at(-1)) && EXT_ISCA.test(partes.at(-2).trim())) {
    achados.push(['danger', `Extensão dupla: o nome termina em ".${partes.at(-2).trim()}.${partes.at(-1)}". Parece um ${partes.at(-2).trim().toUpperCase()}, mas é ${partes.at(-1).toUpperCase()}. Truque clássico de vírus.`])
  }
  if (/[\s_]{6,}\.[a-z0-9]{2,5}$/i.test(nome)) achados.push(['danger', 'O nome tem muitos espaços antes da extensão, para esconder o final ".exe" (ou parecido) na tela.'])
  if (EXTENSOES[ext]) achados.push([...EXTENSOES[ext], 'generico'])
  return achados
}

// Extensão diz uma coisa, conteúdo diz outra.
const EXT_ESPERADA = {
  pdf: ['pdf'], doc: ['ole'], xls: ['ole'], ppt: ['ole'], msi: ['ole'], docx: ['zip'], xlsx: ['zip'], pptx: ['zip'], odt: ['zip'], zip: ['zip'],
  jpg: ['jpeg'], jpeg: ['jpeg'], png: ['png'], gif: ['gif'], mp4: ['midia'], mp3: ['midia'], mov: ['midia'], webp: ['midia'], heic: ['midia'],
  txt: ['texto'], csv: ['texto'], rar: ['rar'], '7z': ['7z'], gz: ['gzip'], exe: ['pe'], dll: ['pe'], apk: ['zip'], jar: ['zip'], iso: ['iso'], rtf: ['rtf'],
}
const TIPO_EXECUTAVEL = new Set(['pe', 'elf', 'macho', 'lnk', 'class', 'dex'])

function conferirExtensao(nome, tipo, rotulo) {
  const ext = extensao(nome)
  const esperado = EXT_ESPERADA[ext]
  if (!esperado || esperado.includes(tipo) || tipo === 'vazio') return []
  if (TIPO_EXECUTAVEL.has(tipo)) return [['danger', `O arquivo diz ser .${ext}, mas na verdade é: ${rotulo}. Programa disfarçado de documento é sinal forte de vírus.`]]
  if (ext === 'doc' && tipo === 'rtf') return [['warn', 'O arquivo diz ser .doc, mas é um RTF. Esse disfarce é usado em ataques ao Office.']]
  if (['html', 'svg'].includes(tipo) && !['txt', 'csv'].includes(ext)) return [['danger', `O arquivo diz ser .${ext}, mas é uma página HTML. Usado para abrir telas falsas de login.`]]
  if (tipo === 'texto' || tipo === 'binario') return [['warn', `O arquivo diz ser .${ext}, mas o conteúdo não é desse tipo (${rotulo}). Pode estar corrompido ou disfarçado.`]]
  return [['warn', `O arquivo diz ser .${ext}, mas na verdade é: ${rotulo}.`]]
}

// ---------- Comandos e códigos perigosos ----------
// [regex, nível, texto, marca para combinações, vale também dentro de programas (.exe)?]

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

const PADROES = [
  [/powershell(\.exe)?["']?[^\n]{0,120}\s[-/]e(c|n|nc|nco|ncod|ncode|ncodedcommand)?\s+["']?[A-Za-z0-9+/]{20,}={0,2}/i, 'danger', 'Roda um comando do PowerShell escondido em Base64 (texto codificado para não ser lido).', 'exec'],
  [/powershell(\.exe)?[^\n]{0,120}\s-w(i|in|ind|indo|indow|indows|indowst|indowsty|indowstyl|indowstyle)?\s+h(idden)?\b/i, 'warn', 'Abre o PowerShell escondido, sem mostrar a janela.', 'oculto'],
  [/\b(IEX|Invoke-Expression)\b/i, 'warn', 'Executa código montado na hora (Invoke-Expression).', 'exec'],
  [/FromBase64String|\[Convert\]::FromBase64/i, 'info', 'Decodifica dados escondidos em Base64.', 'b64'],
  [/DownloadString|DownloadFile|DownloadData|Invoke-WebRequest|\biwr\s+-?u|Invoke-RestMethod|Start-BitsTransfer|Net\.WebClient/i, 'warn', 'Baixa arquivos ou comandos da internet.', 'baixa'],
  [/certutil(\.exe)?\s+[^\n]*-(urlcache|decode|decodehex)\b/i, 'danger', 'Usa o certutil do Windows para baixar ou decodificar arquivos, técnica típica de vírus.', 'baixa'],
  [/bitsadmin(\.exe)?\s+[^\n]*\/transfer/i, 'danger', 'Usa o bitsadmin do Windows para baixar arquivos escondido.', 'baixa'],
  [/mshta(\.exe)?\s+["']?(https?:|javascript:|vbscript:)/i, 'danger', 'Usa o mshta do Windows para rodar código da internet.', 'exec'],
  [/regsvr32(\.exe)?[^\n]*\/i:\s*["']?https?:/i, 'danger', 'Usa o regsvr32 para rodar código da internet (técnica de ataque conhecida).', 'exec'],
  [/rundll32(\.exe)?[^\n]*(javascript:|url\.dll|ShellExec_RunDLL)/i, 'danger', 'Usa o rundll32 para rodar código escondido.', 'exec'],
  [/vssadmin(\.exe)?\s+delete\s+shadows|wmic(\.exe)?\s+shadowcopy\s+delete|bcdedit[^\n]*recoveryenabled\s+no|wbadmin\s+delete\s+catalog/i, 'danger', 'Apaga as cópias de segurança do Windows. É o que fazem os vírus de sequestro de arquivos (ransomware).', null, true],
  [/Set-MpPreference[^\n]*(Disable|Exclusion)|Add-MpPreference[^\n]*Exclusion|DisableRealtimeMonitoring|DisableAntiSpyware/i, 'danger', 'Tenta desligar ou enganar o antivírus do Windows (Defender).', null, true],
  [/schtasks(\.exe)?\s+\/create/i, 'warn', 'Cria uma tarefa agendada para rodar sozinho depois.', 'fica'],
  [/\\CurrentVersion\\Run(Once)?\b/i, 'warn', 'Configura algo para iniciar sozinho junto com o Windows.', 'fica'],
  [/discord(app)?\.com\/api\/webhooks\//i, 'danger', 'Envia dados para um canal do Discord. É como os ladrões de senha mandam o que roubaram.', 'envia', true],
  [/api\.telegram\.org\/bot/i, 'warn', 'Envia dados para um robô do Telegram, método comum de ladrões de senha.', 'envia', true],
  [/pastebin\.com\/raw|paste\.ee\/r\/|transfer\.sh\/|[a-z0-9-]+\.ngrok(-free)?\.(io|app)|\.trycloudflare\.com|gofile\.io\/d|anonfiles\.com/i, 'warn', 'Usa serviços anônimos (Pastebin, ngrok, transfer.sh...) muito usados por vírus para baixar o resto do ataque.', 'baixa'],
  [/WScript\.Shell|Shell\.Application/i, 'warn', 'Controla o Windows: consegue executar programas e comandos.', 'wsh'],
  [/MSXML2\.(Server)?XMLHTTP|WinHttp\.WinHttpRequest|Microsoft\.XMLHTTP/i, 'info', 'Acessa a internet.', 'rede'],
  [/ADODB\.Stream/i, 'info', 'Grava arquivos no disco.', 'grava'],
  [/URLDownloadToFile/i, 'warn', 'Baixa um arquivo da internet para o computador.', 'baixa', true],
  [/eval\s*\(\s*(atob|unescape|decodeURIComponent|String\.fromCharCode|function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k)/i, 'danger', 'Executa código que estava escondido (ofuscado).', 'exec'],
  [/String\.fromCharCode\(\s*\d+(\s*,\s*\d+){40,}/, 'warn', 'Tem código montado letra por letra para não ser lido (ofuscação).', 'ofusca'],
  [/(\\x[0-9a-f]{2}){60,}/i, 'warn', 'Tem um trecho longo escrito em código hexadecimal para não ser lido (ofuscação).', 'ofusca'],
  [/(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/i, 'warn', 'Baixa um script da internet e executa na hora.', 'baixa'],
  [/\/dev\/tcp\/\d{1,3}\.\d|\bnc(at)?\s[^\n]*\s-e\s+\/bin\/|bash\s+-i\s*>&/i, 'danger', 'Abre uma conexão de controle remoto (reverse shell): dá acesso ao seu computador para outra pessoa.', 'remoto'],
  [/base64\s+(-d|--decode)[^\n]*\|\s*(ba)?sh/i, 'danger', 'Decodifica e executa um comando escondido.', 'exec'],
  [/rm\s+-rf\s+(--no-preserve-root\s+)?\/(\s|$|\*)/i, 'danger', 'Apaga todos os arquivos do sistema.'],
  [/exec\s*\(\s*(base64\.b64decode|zlib\.decompress|marshal\.loads|bytes\.fromhex|__import__\(['"]base64)/i, 'danger', 'Script Python que executa código escondido.', 'exec'],
  [/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}[:/]/i, 'warn', 'Acessa um endereço que é só um número de IP, comum em servidores de vírus.', 'rede'],
  [/data:application\/(octet-stream|x-msdownload|x-msdos-program|zip|x-zip-compressed|vnd\.microsoft\.portable-executable)[;,]/i, 'warn', 'Carrega um programa ou ZIP escondido dentro do próprio arquivo.', 'contrabando'],
  [/[A-Za-z0-9+/]{4000,}={0,2}/, 'info', 'Contém um bloco grande de dados codificados (Base64), que pode esconder outro arquivo.', 'blob'],
]

const ROUBO = [/Login Data/, /Local State/, /\\Cookies\b|Network\\Cookies/, /logins\.json/, /key4\.db/, /cookies\.sqlite/, /wallet\.dat/i, /\bExodus\b/, /\bElectrum\b/, /MetaMask|nkbihfbeogaeaoehlefnkodbefgpgknn/, /Telegram Desktop\\tdata|\\tdata\\/, /\\Steam\\config/]
const ANTIANALISE = [/VBoxService|VBoxTray/, /vmtoolsd|vmwaretray/i, /SbieDll\.dll/, /wireshark\.exe/i, /procmon\.exe|ProcessHacker/i, /x64dbg|ollydbg/i]

function analisarTexto(texto, { programa = false } = {}) {
  const achados = []
  const marcas = new Set()
  if (texto.includes(EICAR)) achados.push(['danger', 'É o arquivo de teste EICAR, que todo antivírus detecta de propósito. Não faz mal, serve para testar.'])
  for (const [re, nivel, msg, marca, valeEmPrograma] of PADROES) {
    if (programa && !valeEmPrograma) continue
    if (re.test(texto)) {
      achados.push([nivel, msg])
      if (marca) marcas.add(marca)
    }
  }
  if (marcas.has('exec') && (marcas.has('baixa') || marcas.has('b64'))) achados.unshift(['danger', 'Combina baixar ou decodificar código com executá-lo na hora: comportamento típico de vírus que instala outros vírus.'])
  else if (marcas.has('wsh') && marcas.has('rede') && marcas.has('grava')) achados.unshift(['danger', 'Baixa um arquivo da internet, grava no disco e executa: comportamento típico de vírus.'])
  else if (marcas.has('baixa') && marcas.has('oculto')) achados.unshift(['danger', 'Baixa algo da internet com a janela escondida.'])

  const roubo = ROUBO.filter((re) => re.test(texto)).length
  if (roubo >= 3) achados.push(['danger', 'Procura senhas salvas, cookies e carteiras de criptomoeda dos navegadores. Padrão de ladrão de senhas (infostealer).'])
  if (ANTIANALISE.filter((re) => re.test(texto)).length >= 2) achados.push(['warn', 'Verifica se está rodando em máquina virtual ou sob análise, para se esconder de antivírus.'])
  return achados
}

function analisarHtml(texto) {
  const achados = []
  const senha = /<input[^>]+type\s*=\s*["']?password/i.test(texto)
  const envioExterno = /<form[^>]+action\s*=\s*["']?https?:\/\//i.test(texto) || /(fetch|XMLHttpRequest|\$\.(ajax|post)|axios\.post|sendBeacon)\s*\(/i.test(texto)
  const marca = texto.match(/\b(Microsoft|Office ?365|Outlook|OneDrive|SharePoint|Gov\.br|Nubank|Ita[uú]|Bradesco|Caixa|Banco do Brasil|Santander|Mercado ?Pago|PayPal|Netflix|Correios|Receita Federal|Gmail|Google|Apple|iCloud|WhatsApp|Instagram|Facebook)\b/i)?.[1]
  if (senha && envioExterno) achados.push(['danger', `Tem um formulário de senha que envia o que você digita para outro site${marca ? ` e cita "${marca}"` : ''}. É uma tela falsa de login (phishing).`])
  else if (senha) achados.push(['warn', `Pede senha${marca ? ` e cita "${marca}"` : ''}. Um anexo que pede login é sinal de phishing.`])
  if (/new\s+Blob\s*\(/.test(texto) && /\.download\s*=|msSaveOrOpenBlob|msSaveBlob/.test(texto)) {
    achados.push(['danger', 'Monta um arquivo escondido dentro da página e baixa sozinho (técnica de "HTML smuggling" para escapar do antivírus).'])
  }
  if (/<meta[^>]+http-equiv\s*=\s*["']?refresh[^>]+url\s*=\s*["']?https?:/i.test(texto) || /(window\.|document\.)?location(\.href)?\s*=\s*["'`]https?:/i.test(texto)) {
    achados.push(['warn', 'Redireciona sozinho para outro site.'])
  }
  if (/<iframe[^>]+(width|height)\s*=\s*["']?0\b|<iframe[^>]+display\s*:\s*none/i.test(texto)) achados.push(['warn', 'Carrega outra página escondida (iframe invisível).'])
  if (/<script[^>]+src\s*=\s*["']?https?:\/\/\d{1,3}(\.\d{1,3}){3}/i.test(texto)) achados.push(['danger', 'Carrega código de um servidor identificado só por IP.'])
  return achados
}

// ---------- Programas do Windows ----------

const EMPACOTADORES = [
  [/^UPX\d/, 'UPX', 'info'],
  [/^\.aspack|^\.adata/, 'ASPack', 'warn'],
  [/^\.MPRESS/, 'MPRESS', 'warn'],
  [/^\.themida|^\.winlice/, 'Themida', 'warn'],
  [/^\.vmp\d/, 'VMProtect', 'warn'],
  [/^\.enigma/, 'Enigma Protector', 'warn'],
  [/^\.petite/, 'Petite', 'warn'],
  [/^nsp\d|^\.nsp\d/, 'NsPack', 'warn'],
  [/^PEC2|^pec\d/, 'PECompact', 'warn'],
]
// Nomes de autoridades certificadoras e carimbo de tempo: o que sobra é quem assinou o programa.
const AUTORIDADES = /\bCA\b|\bCA\d|root|authority|time ?stamp|timestamping|responder|\bsigner\b|\bTSA\b|code ?signing|\bPCA\b|certificate services|verification|\bID Verified\b|issuing|digicert|sectigo|comodo|globalsign|verisign|symantec|thawte|entrust|godaddy|certum|ssl\.com|usertrust|starfield|geotrust|baltimore|identrust|quovadis|actalis|harica|wosign/i
const GRANDES_EMPRESAS = /^(Microsoft|Google|Mozilla|Adobe|Apple|Oracle|Intel|NVIDIA|Advanced Micro Devices|AMD|Valve|Zoom|WhatsApp|Meta|Facebook|Spotify|Discord|Epic Games|Riot Games|Dropbox|Opera|Brave|Avast|AVG|Kaspersky|ESET|Malwarebytes|McAfee|Norton|Logitech|Realtek|Dell|HP|Lenovo|ASUS|Samsung)\b/i

/** Nomes comuns (CN) dos certificados da assinatura, sem repetição. */
function nomesDoCertificado(b, inicio, fim) {
  const nomes = []
  for (let i = inicio; i < fim - 7; i++) {
    if (b[i] !== 0x06 || b[i + 1] !== 0x03 || b[i + 2] !== 0x55 || b[i + 3] !== 0x04 || b[i + 4] !== 0x03) continue
    const tag = b[i + 5]
    const len = b[i + 6]
    if (![0x0c, 0x13, 0x14, 0x16, 0x1e].includes(tag) || len > 127 || i + 7 + len > fim) continue
    const bruto = b.subarray(i + 7, i + 7 + len)
    const valor = tag === 0x1e ? new TextDecoder('utf-16be').decode(bruto) : utf8.decode(bruto)
    if (valor.trim() && !nomes.includes(valor.trim())) nomes.push(valor.trim())
  }
  return nomes
}

function infoDeVersao(b) {
  const info = {}
  const inicio = Math.max(0, b.length - 64 * 1024 ** 2)
  for (const chave of ['CompanyName', 'FileDescription', 'ProductName', 'OriginalFilename', 'FileVersion', 'LegalCopyright']) {
    const pos = indexOfBytes(b, utf16le(`${chave}\0`), inicio)
    if (pos === -1) continue
    let p = pos + (chave.length + 1) * 2
    while (p < b.length - 1 && b[p] === 0 && b[p + 1] === 0) p += 2
    let valor = ''
    while (p < b.length - 1 && (b[p] || b[p + 1]) && valor.length < 160) {
      valor += String.fromCharCode(u16(b, p))
      p += 2
    }
    if (valor.trim()) info[chave] = valor.trim()
  }
  return info
}

function analisarPE(b, nome) {
  const achados = []
  const detalhes = []
  const pe = u32(b, 0x3c)
  if (!(pe + 24 < b.length && ascii(b, pe, pe + 4) === 'PE\0\0')) {
    achados.push(['warn', 'Programa antigo do MS-DOS ou com cabeçalho estranho.'])
    return { achados, detalhes }
  }
  const maquina = { 0x14c: '32 bits (x86)', 0x8664: '64 bits (x64)', 0xaa64: 'ARM64', 0x1c4: 'ARM' }[u16(b, pe + 4)] || 'outra'
  const nSecoes = u16(b, pe + 6)
  const data = u32(b, pe + 8)
  const tamOpcional = u16(b, pe + 20)
  const caracteristicas = u16(b, pe + 22)
  const opt = pe + 24
  const pe64 = u16(b, opt) === 0x20b
  const subsistema = u16(b, opt + 68)
  const diretorios = opt + (pe64 ? 112 : 96)
  const dir = (i) => ({ va: u32(b, diretorios + i * 8), tamanho: u32(b, diretorios + i * 8 + 4) })

  const tipo = caracteristicas & 0x2000 ? 'Biblioteca (DLL)' : subsistema === 1 ? 'Driver' : subsistema === 3 ? 'Programa de linha de comando' : 'Programa com janela'
  detalhes.push(['Tipo de programa', `${tipo}, ${maquina}`])
  if (data > 946684800 && data < Date.now() / 1000 + 86400) detalhes.push(['Compilado em', new Date(data * 1000).toLocaleDateString('pt-BR')])

  const secoes = []
  for (let i = 0, s = opt + tamOpcional; i < Math.min(nSecoes, 96) && s + 40 <= b.length; i++, s += 40) {
    secoes.push(ascii(b, s, s + 8).replace(/\0+$/, ''))
  }
  for (const [re, nomeEmp, nivel] of EMPACOTADORES) {
    if (secoes.some((s) => re.test(s))) {
      achados.push([nivel, nivel === 'info' ? `Programa compactado com ${nomeEmp}. É comum, mas também esconde vírus de antivírus.` : `Programa protegido com ${nomeEmp} para impedir que vejam o que ele faz. Muito usado por vírus (e por alguns jogos).`])
      break
    }
  }
  if (dir(14).tamanho) detalhes.push(['Feito em', '.NET (C#/VB.NET)'])

  const versao = infoDeVersao(b)
  if (versao.CompanyName) detalhes.push(['Empresa (declarada)', versao.CompanyName])
  if (versao.FileDescription) detalhes.push(['Descrição', versao.FileDescription])
  if (versao.ProductName) detalhes.push(['Produto', versao.ProductName])
  if (versao.FileVersion) detalhes.push(['Versão', versao.FileVersion])
  if (versao.OriginalFilename) {
    detalhes.push(['Nome original', versao.OriginalFilename])
    const original = versao.OriginalFilename.toLowerCase().replace(/\.mui$/, '')
    const atual = nome.toLowerCase()
    if (/\.(exe|dll|scr)$/.test(original) && !atual.includes(original.replace(/\.(exe|dll|scr)$/, '')) && !original.includes(atual.replace(/\.[^.]+$/, ''))) {
      achados.push(['info', `O programa foi criado com o nome "${versao.OriginalFilename}", diferente do nome atual. Pode ser só renomeado, mas vírus costumam trocar de nome.`])
    }
  }

  const seg = dir(4)
  const assinado = seg.tamanho > 8 && seg.va > 0 && seg.va + seg.tamanho <= b.length
  if (assinado) {
    const nomes = nomesDoCertificado(b, seg.va, seg.va + seg.tamanho)
    const donos = nomes.filter((n) => !AUTORIDADES.test(n))
    detalhes.push(['Assinatura digital', `Tem${donos.length ? `: ${donos.slice(0, 3).join(', ')}` : ''} (não validada aqui)`])
    achados.push(['info', `Tem assinatura digital${donos.length ? ` em nome de ${donos[0]}` : ''}. Não conseguimos validar o certificado no navegador: no Windows, clique com o botão direito > Propriedades > Assinaturas Digitais para confirmar.`])
  } else {
    detalhes.push(['Assinatura digital', 'Não tem'])
    if (versao.CompanyName && GRANDES_EMPRESAS.test(versao.CompanyName)) {
      // Arquivos do próprio Windows são assinados por catálogo, fora do arquivo: por isso só alerta.
      achados.push(['warn', `Diz ser da ${versao.CompanyName}, mas não tem assinatura digital. Programas baixados dessa empresa vêm assinados: se você não copiou este arquivo da pasta do Windows, provavelmente é falso.`])
    } else {
      achados.push(['warn', 'Não tem assinatura digital. Programas de empresas sérias costumam ser assinados.'])
    }
  }

  const texto = textoDe(b)
  const largo = texto.replace(/\0/g, '')
  achados.push(...analisarTexto(largo, { programa: true }))
  const injeta = ['VirtualAllocEx', 'WriteProcessMemory'].every((f) => texto.includes(f)) && /CreateRemoteThread|NtCreateThreadEx|QueueUserAPC|SetThreadContext/.test(texto)
  // Navegadores e antivírus assinados usam essas funções de forma legítima.
  if (injeta && !assinado) achados.push(['warn', 'Consegue injetar código dentro de outros programas (técnica usada por vírus para se esconder).'])
  if (/GetAsyncKeyState|SetWindowsHookEx/.test(texto) && /GetForegroundWindow/.test(texto) && !assinado) achados.push(['warn', 'Consegue registrar as teclas que você digita e saber qual janela está aberta (comportamento de keylogger).'])
  const instalador = largo.match(/Nullsoft Install System|Inno Setup|InstallShield|WiX Toolset|Advanced Installer|Squirrel/)?.[0]
  if (instalador) detalhes.push(['Instalador', instalador])

  const h = entropia(b)
  if (h > 7.4 && !instalador) achados.push(['info', 'O conteúdo é quase todo compactado ou criptografado, o que dificulta a análise.'])
  return { achados, detalhes }
}

// ---------- Documentos ----------

function analisarPdf(b) {
  const achados = []
  const detalhes = []
  let texto = textoDe(b)
  // Decodifica fluxos compactados: vírus escondem JavaScript dentro deles.
  let extraido = 0
  const re = /\/FlateDecode[\s\S]{0,300}?stream\r?\n/g
  let m
  let fluxos = 0
  while ((m = re.exec(texto)) && fluxos < 400 && extraido < 40 * 1024 ** 2) {
    const inicio = m.index + m[0].length
    const fim = texto.indexOf('endstream', inicio)
    if (fim === -1) break
    fluxos++
    try {
      const dados = unzlibSync(b.subarray(inicio, fim))
      if (dados.length < 8 * 1024 ** 2) {
        texto += '\n' + latin1.decode(dados)
        extraido += dados.length
      }
    } catch {
      // Fluxo de imagem ou corrompido: ignora.
    }
    re.lastIndex = fim
  }
  // Nomes como /J#61vaScript escondem /JavaScript.
  const n = texto.replace(/\/([A-Za-z0-9#]+)/g, (_, nome) => '/' + nome.replace(/#([0-9a-f]{2})/gi, (__, hex) => String.fromCharCode(parseInt(hex, 16))))
  const conta = (r) => (n.match(r) || []).length
  const js = conta(/\/(JavaScript|JS)\b/g)
  const abre = conta(/\/OpenAction\b/g) + conta(/\/AA\b/g)
  if (conta(/\/Launch\b/g)) achados.push(['danger', 'O PDF tenta abrir um programa ou comando do computador (/Launch).'])
  if (js && abre) achados.push(['danger', 'O PDF roda JavaScript sozinho quando é aberto. PDFs normais não fazem isso.'])
  else if (js) achados.push(['warn', 'O PDF tem JavaScript. Formulários usam às vezes, mas é raro em documentos comuns.'])
  if (conta(/\/EmbeddedFile\b/g)) achados.push(['warn', 'O PDF tem outro arquivo anexado dentro dele. Não abra anexos de PDF de origem desconhecida.'])
  if (conta(/\/RichMedia\b/g)) achados.push(['warn', 'O PDF tem conteúdo multimídia embutido (Flash), usado em ataques antigos.'])
  if (conta(/\/XFA\b/g)) achados.push(['info', 'O PDF usa formulário XFA, recurso raro e já explorado em ataques.'])
  if (conta(/\/SubmitForm\b/g)) achados.push(['warn', 'O PDF envia dados de formulário para a internet.'])
  if (conta(/\/Encrypt\b/g)) detalhes.push(['Protegido', 'Sim (criptografado)'])

  const links = [...new Set([...n.matchAll(/\/URI\s*\(([^)]{4,400})\)/g)].map((x) => x[1].replace(/\\(.)/g, '$1')))]
  if (links.length) {
    const dominios = [...new Set(links.map((l) => { try { return new URL(l).hostname } catch { return '' } }).filter(Boolean))]
    detalhes.push(['Links no PDF', `${links.length}${dominios.length ? `: ${dominios.slice(0, 6).join(', ')}${dominios.length > 6 ? '…' : ''}` : ''}`])
    const ruins = links.filter((l) => /\.(exe|scr|zip|rar|js|vbs|hta|msi|apk|iso|lnk|bat)(\?|$)/i.test(l) || /^https?:\/\/\d+\.\d+\.\d+\.\d+/.test(l) || /bit\.ly|tinyurl|cutt\.ly|is\.gd|t\.co\/|encurtador|rebrand\.ly/i.test(l))
    if (ruins.length) achados.push(['warn', `Tem link que baixa programa, aponta para um IP ou usa encurtador: ${ruins[0].slice(0, 80)}`])
    else achados.push(['info', `O PDF tem ${links.length} link${links.length > 1 ? 's' : ''}. Golpes em PDF pedem para clicar em "ver documento" ou "baixar fatura". Confira o endereço antes.`])
  }
  achados.push(...analisarTexto(n.slice(0, 30 * 1024 ** 2)).filter(([nivel]) => nivel !== 'info'))
  return { achados, detalhes }
}

function analisarOle(b, nome) {
  const achados = []
  const texto = textoDe(b)
  const macros = /_VBA_PROJECT|VBA_PROJECT|Attribut[\s\S]e VB_Nam/.test(texto)
  const automatica = /AutoOpen|Auto_Open|Document_Open|Workbook_Open|AutoExec|Document_Close|Auto_Close|Workbook_Activate/i.test(texto)
  const suspeita = texto.match(/\b(Shell|WScript|CreateObject|URLDownloadToFile|XMLHTTP|ADODB|PowerShell|cmd\.exe|Environ|CallByName|MacScript|Lib "kernel32")\b/gi) || []
  if (macros && automatica && suspeita.length) achados.push(['danger', `Tem macro que roda sozinha ao abrir e usa comandos perigosos (${[...new Set(suspeita.map((s) => s.toLowerCase()))].slice(0, 4).join(', ')}). Não clique em "Habilitar conteúdo".`])
  else if (macros && automatica) achados.push(['warn', 'Tem macro que roda sozinha ao abrir o documento. Não clique em "Habilitar conteúdo" se não souber a origem.'])
  else if (macros) achados.push(['warn', 'Tem macros (pequenos programas). Não clique em "Habilitar conteúdo" se não souber a origem.'])
  if (/Equation\.3|Equation Native/.test(texto)) achados.push(['danger', 'Tem um objeto do antigo Editor de Equações, usado para explorar uma falha do Office (CVE-2017-11882).'])
  if (/Ole10Native/.test(texto)) {
    const escondido = texto.match(/[\w\- .()]{1,80}\.(exe|scr|js|jse|vbs|vbe|bat|cmd|ps1|hta|jar|lnk|wsf|pif|cpl)\b/i)?.[0]
    achados.push(escondido ? ['danger', `Tem um programa escondido dentro do documento ("${escondido.trim()}").`] : ['warn', 'Tem um arquivo embutido dentro do documento.'])
  }
  if (extensao(nome) === 'msi') achados.push(['warn', 'É um instalador do Windows (.msi). Só abra se você baixou do site oficial.', 'generico'])
  achados.push(...analisarTexto(texto).filter(([nivel]) => nivel !== 'info'))
  return { achados, detalhes: macros ? [['Macros', 'Sim']] : [] }
}

function analisarRtf(b) {
  const achados = []
  const texto = textoDe(b)
  const objeto = /\\obj(data|emb|link|ocx)\b/.test(texto)
  if (/Equation\.3|0002CE02-0000-0000-C000-000000000046/i.test(texto.replace(/\s/g, '')) || /4571756174696f6e2e33/i.test(texto.replace(/\s/g, ''))) {
    achados.push(['danger', 'Tem um objeto do antigo Editor de Equações, usado para explorar uma falha do Office (CVE-2017-11882).'])
  }
  if (objeto && /\\objupdate/.test(texto)) achados.push(['danger', 'Tem um objeto embutido configurado para rodar sozinho ao abrir.'])
  else if (objeto) achados.push(['warn', 'Tem um objeto embutido (outro arquivo ou programa dentro do documento).'])
  if (/\{\\\*\\template\s+https?:/i.test(texto)) achados.push(['danger', 'Busca um modelo na internet ao abrir, técnica usada para baixar vírus.'])
  return { achados, detalhes: [] }
}

function analisarLnk(b) {
  const texto = textoDe(b).replace(/\0/g, '')
  const achados = []
  const alvo = texto.match(/\b(powershell|pwsh|cmd|mshta|wscript|cscript|rundll32|regsvr32|certutil|bitsadmin|msiexec|curl|conhost|forfiles|explorer)(\.exe)?\b/i)?.[1]
  if (alvo) achados.push(['danger', `O atalho executa o ${alvo.toLowerCase()}. Atalho recebido que roda comandos é golpe.`])
  achados.push(...analisarTexto(texto))
  return { achados, detalhes: alvo ? [['Executa', alvo.toLowerCase()]] : [] }
}

function analisarImagem(b, tipo) {
  // Dados escondidos depois do fim da imagem (programa ou ZIP colado no final).
  let fim = -1
  if (tipo === 'png') {
    const p = indexOfBytes(b, [0x49, 0x45, 0x4e, 0x44], 8)
    if (p !== -1) fim = p + 8
  } else if (tipo === 'jpeg') {
    for (let i = b.length - 2; i > 2 && i > b.length - 4 * 1024 ** 2; i--) {
      if (b[i] === 0xff && b[i + 1] === 0xd9) {
        fim = i + 2
        break
      }
    }
  }
  if (fim === -1 || b.length - fim < 1024) return { achados: [], detalhes: [], resto: null }
  const resto = b.subarray(fim)
  const tipoResto = detectarTipo(resto)
  const grave = ['pe', 'zip', 'rar', '7z', 'lnk', 'elf', 'html', 'texto'].includes(tipoResto.tipo)
  return {
    achados: [[grave ? 'danger' : 'info', grave ? `A imagem tem outro arquivo escondido depois do fim dela: ${tipoResto.rotulo}.` : 'A imagem tem dados extras depois do fim dela.']],
    detalhes: [],
    resto: grave ? resto : null,
  }
}

// ---------- ZIP e outros compactados ----------

function lerZip(b) {
  let eocd = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (u32(b, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd === -1) return null
  let total = u16(b, eocd + 10)
  let cd = u32(b, eocd + 16)
  if (cd === 0xffffffff || total === 0xffff) {
    const loc = eocd - 20
    if (loc >= 0 && u32(b, loc) === 0x07064b50) {
      const z64 = u64(b, loc + 8)
      if (u32(b, z64) === 0x06064b50) {
        total = u64(b, z64 + 32)
        cd = u64(b, z64 + 48)
      }
    }
  }
  const itens = []
  for (let p = cd, i = 0; i < total && p + 46 <= b.length && u32(b, p) === 0x02014b50; i++) {
    const flags = u16(b, p + 8)
    const metodo = u16(b, p + 10)
    let comprimido = u32(b, p + 20)
    let tamanho = u32(b, p + 24)
    const nLen = u16(b, p + 28)
    const eLen = u16(b, p + 30)
    const cLen = u16(b, p + 32)
    let local = u32(b, p + 42)
    const nomeBytes = b.subarray(p + 46, p + 46 + nLen)
    const nome = flags & 0x800 ? utf8.decode(nomeBytes) : (() => { try { return new TextDecoder('utf-8', { fatal: true }).decode(nomeBytes) } catch { return new TextDecoder('ibm866').decode(nomeBytes) } })()
    // Campos ZIP64 no extra.
    for (let e = p + 46 + nLen; e + 4 <= p + 46 + nLen + eLen; ) {
      const id = u16(b, e)
      const len = u16(b, e + 2)
      if (id === 0x0001) {
        let q = e + 4
        if (tamanho === 0xffffffff) { tamanho = u64(b, q); q += 8 }
        if (comprimido === 0xffffffff) { comprimido = u64(b, q); q += 8 }
        if (local === 0xffffffff) local = u64(b, q)
      }
      e += 4 + len
    }
    itens.push({ nome, flags, metodo, comprimido, tamanho, local, criptografado: Boolean(flags & 1) || metodo === 99, pasta: nome.endsWith('/') })
    p += 46 + nLen + eLen + cLen
  }
  return itens
}

function extrairZip(b, item) {
  const p = item.local
  if (u32(b, p) !== 0x04034b50) throw new Error('cabeçalho local inválido')
  const inicio = p + 30 + u16(b, p + 26) + u16(b, p + 28)
  const dados = b.subarray(inicio, inicio + item.comprimido)
  if (item.metodo === 0) return dados
  if (item.metodo === 8) return inflateSync(dados, { out: new Uint8Array(item.tamanho) })
  throw new Error('método de compressão não suportado')
}

function lerTar(b) {
  const itens = []
  for (let p = 0; p + 512 <= b.length && itens.length < LIMITES.itens; ) {
    const nome = ascii(b, p, p + 100).replace(/\0.*$/s, '')
    if (!nome) break
    const prefixo = ascii(b, p + 345, p + 500).replace(/\0.*$/s, '')
    const tamanho = parseInt(ascii(b, p + 124, p + 136).replace(/\0.*$/s, '').trim() || '0', 8) || 0
    const tipo = String.fromCharCode(b[p + 156] || 48)
    itens.push({ nome: prefixo ? `${prefixo}/${nome}` : nome, dados: b.subarray(p + 512, p + 512 + tamanho), pasta: tipo === '5' })
    p += 512 + Math.ceil(tamanho / 512) * 512
  }
  return itens
}

function sinaisDoOffice(nomes) {
  const achados = []
  const tem = (re) => nomes.some((n) => re.test(n))
  if (tem(/vbaProject\.bin$/i)) achados.push(['warn', 'O documento tem macros (pequenos programas). Não clique em "Habilitar conteúdo" se não souber a origem.'])
  if (tem(/^xl\/macrosheets\//i)) achados.push(['danger', 'A planilha tem macros antigas do Excel 4.0 (XLM), muito usadas em golpes porque escapam de antivírus.'])
  if (tem(/\/activeX\//i)) achados.push(['warn', 'O documento tem controles ActiveX, que podem rodar código.'])
  if (tem(/\/embeddings\/.*\.(exe|scr|js|vbs|bat|cmd|ps1|hta|lnk|jar)$/i)) achados.push(['danger', 'O documento tem um programa embutido dentro dele.'])
  else if (tem(/\/embeddings\/oleObject/i)) achados.push(['warn', 'O documento tem um objeto embutido (outro arquivo dentro dele).'])
  return achados
}

function sinaisDoOfficeXml(nome, texto) {
  const achados = []
  if (nome.endsWith('.rels')) {
    for (const rel of texto.match(/<Relationship\b[^>]*>/gi) || []) {
      if (!/TargetMode\s*=\s*["']External/i.test(rel)) continue
      const tipo = rel.match(/Type\s*=\s*["'][^"']*\/([A-Za-z]+)["']/)?.[1]
      const alvo = rel.match(/Target\s*=\s*["']([^"']+)/)?.[1] || ''
      if (/attachedTemplate|oleObject|frame|subDocument/i.test(tipo || '')) {
        achados.push(['danger', `Ao abrir, o documento busca ${tipo === 'attachedTemplate' ? 'um modelo' : 'um objeto'} na internet (${alvo.slice(0, 70)}). Técnica usada para baixar vírus sem macro.`])
      }
    }
  }
  if (/<w:instrText[^>]*>\s*"?\s*DDE(AUTO)?\b/i.test(texto) || /<w:fldSimple[^>]+w:instr="\s*DDE(AUTO)?\b/i.test(texto) || /ddeService=/i.test(texto)) {
    achados.push(['danger', 'O documento usa DDE para executar um comando ao ser aberto (ataque conhecido do Office).'])
  }
  return achados
}

function sinaisDoApk(manifesto) {
  const t = latin1.decode(manifesto).replace(/\0/g, '')
  const tem = (p) => t.includes(p)
  const achados = []
  const acessibilidade = tem('BIND_ACCESSIBILITY_SERVICE')
  const sobrepor = tem('SYSTEM_ALERT_WINDOW')
  const sms = tem('RECEIVE_SMS') || tem('READ_SMS')
  if (acessibilidade && (sobrepor || sms)) achados.push(['danger', 'O app pede acessibilidade junto com sobreposição de tela ou leitura de SMS. É o padrão dos vírus bancários que atacam bancos brasileiros (controlam o celular e roubam códigos).'])
  else if (acessibilidade) achados.push(['warn', 'O app pede o serviço de acessibilidade, que permite ler a tela e tocar sozinho. Vírus bancários usam isso para controlar o celular.'])
  if (sms) achados.push(['warn', 'O app pode ler seus SMS, inclusive códigos de confirmação do banco.'])
  if (sobrepor) achados.push(['warn', 'O app pode desenhar por cima de outros apps (usado para telas falsas de banco).'])
  if (tem('BIND_DEVICE_ADMIN')) achados.push(['warn', 'O app pede para ser administrador do aparelho, o que dificulta desinstalar.'])
  if (tem('REQUEST_INSTALL_PACKAGES')) achados.push(['warn', 'O app pode instalar outros apps.'])
  if (tem('READ_CONTACTS') && tem('SEND_SMS')) achados.push(['warn', 'O app lê seus contatos e envia SMS.'])
  return achados
}

// ---------- Análise principal ----------

/**
 * Analisa os bytes de um arquivo (e o que tiver dentro dele).
 * Retorna { nome, caminho, tamanho, tipo, rotulo, sha256, achados, detalhes, filhos, nivel }.
 */
export async function analisar(nome, bytes, { onProgress } = {}) {
  const ctx = { itens: 0, descompactado: 0, onProgress, ultimaPausa: Date.now() }
  return analisarNo(nome, nome, bytes, 0, ctx)
}

async function analisarNo(nome, caminho, b, profundidade, ctx) {
  ctx.itens++
  if (Date.now() - ctx.ultimaPausa > 60) {
    ctx.onProgress?.(`Analisando ${caminho}…`)
    await sleep()
    ctx.ultimaPausa = Date.now()
  }
  const { tipo, rotulo } = detectarTipo(b)
  const no = { nome, caminho, tamanho: b.length, tipo, rotulo, sha256: null, achados: [], detalhes: [], filhos: [], nivel: 'ok' }
  const add = (lista) => no.achados.push(...lista.map(([nivel, texto, marca]) => ({ nivel, texto, generico: marca === 'generico' })))
  const ehRaiz = profundidade === 0
  const merecemHash = TIPO_EXECUTAVEL.has(tipo) || ['ole', 'pdf', 'rtf', 'zip', 'texto', 'html', 'svg', 'binario', 'rar', '7z', 'iso', 'vhd', 'cab'].includes(tipo)
  if (ehRaiz || merecemHash) no.sha256 = await sha256(b)

  add(analisarNome(nome))
  add(conferirExtensao(nome, tipo, rotulo))

  const recursar = async (filhoNome, filhoCaminho, dados) => {
    if (profundidade + 1 > LIMITES.profundidade) return
    no.filhos.push(await analisarNo(filhoNome, filhoCaminho, dados, profundidade + 1, ctx))
  }

  if (tipo === 'pe') {
    const r = analisarPE(b, nome)
    if (!EXTENSOES[extensao(nome)] || !['exe', 'msi', 'dll', 'com'].includes(extensao(nome))) add([['warn', 'É um programa do Windows. Só abra se você baixou do site oficial de quem fez o programa.', 'generico']])
    add(r.achados)
    no.detalhes.push(...r.detalhes)
  } else if (tipo === 'elf' || tipo === 'macho' || tipo === 'class' || tipo === 'dex') {
    add([['warn', `É um programa (${rotulo}). Só abra se você sabe de onde veio.`, 'generico']])
    add(analisarTexto(textoDe(b), { programa: true }))
  } else if (tipo === 'pdf') {
    const r = analisarPdf(b)
    add(r.achados)
    no.detalhes.push(...r.detalhes)
  } else if (tipo === 'ole') {
    const r = analisarOle(b, nome)
    add(r.achados)
    no.detalhes.push(...r.detalhes)
  } else if (tipo === 'rtf') {
    add(analisarRtf(b).achados)
  } else if (tipo === 'lnk') {
    const r = analisarLnk(b)
    if (extensao(nome) !== 'lnk') add([['warn', 'É um atalho do Windows: abrir executa o que estiver escrito nele.', 'generico']])
    add(r.achados)
    no.detalhes.push(...r.detalhes)
  } else if (tipo === 'html' || tipo === 'svg') {
    const texto = textoDe(b)
    add(analisarHtml(texto))
    add(analisarTexto(texto))
    if (tipo === 'svg' && /<script\b|\bon(load|click|mouseover)\s*=/i.test(texto)) add([['warn', 'A imagem SVG tem código JavaScript, o que é raro em imagens normais.']])
  } else if (tipo === 'texto') {
    // Scripts salvos em UTF-16 (comum no PowerShell) viram texto normal antes da busca.
    const texto = b[0] === 0xff && b[1] === 0xfe ? new TextDecoder('utf-16le').decode(b.subarray(0, LIMITES.leitura)) : textoDe(b)
    add(analisarTexto(texto))
    const ext = extensao(nome)
    if (ext === 'url' && /URL\s*=\s*(file:|\\\\)/i.test(texto)) add([['danger', 'O atalho de internet aponta para um arquivo na rede ou no computador, técnica usada para rodar vírus.']])
  } else if (tipo === 'png' || tipo === 'jpeg') {
    const r = analisarImagem(b, tipo)
    add(r.achados)
    if (r.resto) await recursar('(escondido no fim da imagem)', `${caminho} › escondido`, r.resto)
  } else if (tipo === 'iso' || tipo === 'vhd') {
    if (!['iso', 'img', 'vhd', 'vhdx'].includes(extensao(nome))) add([['warn', 'É uma imagem de disco: golpistas escondem programas dentro dela para escapar dos avisos do Windows.', 'generico']])
    add([['info', 'Não conseguimos abrir imagens de disco no navegador. Se tiver um .exe, .lnk ou script dentro, não abra.']])
  } else if (tipo === 'rar' || tipo === '7z' || tipo === 'cab') {
    add([['info', `Não conseguimos abrir arquivos ${tipo.toUpperCase()} no navegador. Extraia no seu computador (sem abrir nada) e envie aqui os arquivos de dentro.`]])
  } else if (tipo === 'gzip') {
    try {
      const dados = gunzipSync(b)
      ctx.descompactado += dados.length
      const interno = nome.replace(/\.(t?gz|gzip)$/i, (m) => (m.toLowerCase() === '.tgz' ? '.tar' : ''))
      await recursar(interno, `${caminho} › ${interno}`, dados)
    } catch {
      add([['info', 'Não foi possível descompactar este GZIP.']])
    }
  } else if (tipo === 'tar') {
    const itens = lerTar(b).filter((i) => !i.pasta)
    no.detalhes.push(['Arquivos dentro', String(itens.length)])
    for (const item of itens) {
      if (ctx.itens >= LIMITES.itens) break
      await recursar(item.nome.split('/').pop(), `${caminho} › ${item.nome}`, item.dados)
    }
  } else if (tipo === 'zip') {
    await analisarZip(no, b, nome, caminho, profundidade, ctx, add, recursar)
  } else if (tipo === 'binario' && b.length > 64) {
    add(analisarTexto(textoDe(b), { programa: true }))
  }

  if (ehRaiz && tipo !== 'pe' && b.length > 1024 && !['zip', 'gzip', 'rar', '7z', 'midia', 'png', 'jpeg', 'gif', 'pdf', 'cab', 'iso', 'vhd'].includes(tipo) && entropia(b) > 7.6) {
    add([['info', 'O conteúdo parece criptografado ou compactado, o que impede ver o que tem dentro.']])
  }

  // Tira repetições e calcula o nível do nó (o pior entre ele e o que tem dentro).
  const vistos = new Set()
  no.achados = no.achados.filter((a) => !vistos.has(a.texto) && vistos.add(a.texto))
  no.achados.sort((a, b2) => PESO[b2.nivel] - PESO[a.nivel])
  no.nivel = [...no.achados.map((a) => a.nivel), ...no.filhos.map((f) => f.nivel)].reduce(maior, 'ok')
  return no
}

async function analisarZip(no, b, nome, caminho, profundidade, ctx, add, recursar) {
  const itens = lerZip(b)
  if (!itens) {
    add([['warn', 'O ZIP está corrompido ou incompleto: não foi possível ler a lista de arquivos.']])
    return
  }
  const arquivos = itens.filter((i) => !i.pasta)
  const nomes = arquivos.map((i) => i.nome)
  const tem = (n) => nomes.includes(n)
  const totalDescompactado = arquivos.reduce((s, i) => s + i.tamanho, 0)
  no.detalhes.push(['Arquivos dentro', String(arquivos.length)])
  if (arquivos.length) no.detalhes.push(['Tamanho descompactado', formatarBytes(totalDescompactado)])

  const office = tem('[Content_Types].xml') && nomes.some((n) => /^(word|xl|ppt)\//.test(n))
  const apk = tem('AndroidManifest.xml') && nomes.some((n) => /^classes\d*\.dex$/.test(n))
  const jar = !apk && tem('META-INF/MANIFEST.MF') && nomes.some((n) => n.endsWith('.class'))
  const appx = tem('AppxManifest.xml')
  if (office) no.rotulo = 'Documento do Office (Word, Excel ou PowerPoint)'
  if (apk) {
    no.rotulo = 'Aplicativo de Android (APK)'
    if (!['apk', 'xapk'].includes(extensao(nome))) add([['warn', 'É um aplicativo de Android. Só instale apps da Play Store.', 'generico']])
  }
  if (jar) {
    no.rotulo = 'Programa Java (JAR)'
    if (extensao(nome) !== 'jar') add([['warn', 'É um programa Java: roda com acesso ao seu computador.', 'generico']])
  }
  if (appx) no.rotulo = 'Instalador de app do Windows'

  const criptografados = arquivos.filter((i) => i.criptografado)
  const programas = arquivos.filter((i) => EXT_PROGRAMA.test(extensao(i.nome)) || /\.(iso|img|vhdx?|one|docm|xlsm)$/i.test(i.nome))
  if (criptografados.length) {
    no.detalhes.push(['Senha', `Sim (${criptografados.length} arquivo${criptografados.length > 1 ? 's' : ''})`])
    if (programas.some((p) => p.criptografado)) add([['danger', 'ZIP com senha contendo programa ou script. É o truque clássico para o vírus passar pelo antivírus do e-mail: o golpista manda a senha na mensagem.']])
    else add([['warn', 'O ZIP tem senha, então não conseguimos ver o conteúdo dos arquivos. Golpistas usam senha para esconder vírus do antivírus.']])
  }
  if (!office && !apk && !jar && arquivos.length <= 3 && programas.length && programas.length === arquivos.length) {
    add([['warn', `O ZIP tem só ${programas.length === 1 ? 'um programa ou script' : 'programas ou scripts'} dentro (${programas.map((p) => p.nome.split('/').pop()).join(', ')}). É a forma mais comum de mandar vírus por e-mail e WhatsApp.`]])
  }
  if (arquivos.some((i) => /(^|[\\/])\.\.([\\/]|$)|^[\\/]|^[a-z]:/i.test(i.nome))) add([['warn', 'Tem arquivo com caminho que tenta sair da pasta ao extrair (../), técnica para gravar em outros lugares do computador.']])
  const bomba = arquivos.find((i) => i.tamanho > 200 * 1024 ** 2 && i.comprimido > 0 && i.tamanho / i.comprimido > 500) || (totalDescompactado > 20 * 1024 ** 3 ? arquivos[0] : null)
  if (bomba) {
    add([['danger', `É uma "bomba de ZIP": arquivos minúsculos que viram ${formatarBytes(totalDescompactado)} ao extrair, para travar o computador ou o antivírus. Não extraia.`]])
    return
  }

  if (office) add(sinaisDoOffice(nomes))

  for (const item of arquivos) {
    if (ctx.itens >= LIMITES.itens) {
      add([['info', `Paramos depois de ${LIMITES.itens} arquivos analisados.`]])
      break
    }
    const sub = item.nome.split('/').pop()
    const subCaminho = `${caminho} › ${item.nome}`
    if (item.criptografado) {
      no.filhos.push({ nome: sub, caminho: subCaminho, tamanho: item.tamanho, tipo: 'senha', rotulo: 'Protegido por senha', sha256: null, achados: analisarNome(sub).map(([nivel, texto, m]) => ({ nivel, texto, generico: m === 'generico' })), detalhes: [], filhos: [], nivel: analisarNome(sub).map(([n]) => n).reduce(maior, 'ok') })
      continue
    }
    // Documentos do Office e APKs: só abrimos o que importa (o resto são imagens e XML internos).
    if (office && !/\.rels$|^word\/document\.xml$|^xl\/externalLinks\/|vbaProject\.bin$|\/embeddings\/|\/activeX\/.*\.bin$/i.test(item.nome)) continue
    if (apk && !/^AndroidManifest\.xml$|\.(apk|jar|zip|dex|so|exe|dll|js|sh)$/i.test(item.nome)) continue
    if (jar && item.nome.endsWith('.class') && arquivos.length > 50) continue
    if (item.tamanho > LIMITES.itemMax || ctx.descompactado + item.tamanho > LIMITES.totalDescompactado) {
      no.filhos.push({ nome: sub, caminho: subCaminho, tamanho: item.tamanho, tipo: 'grande', rotulo: 'Grande demais para analisar aqui', sha256: null, achados: analisarNome(sub).map(([nivel, texto, m]) => ({ nivel, texto, generico: m === 'generico' })), detalhes: [], filhos: [], nivel: analisarNome(sub).map(([n]) => n).reduce(maior, 'ok') })
      continue
    }
    let dados
    try {
      dados = extrairZip(b, item)
      ctx.descompactado += dados.length
    } catch {
      no.filhos.push({ nome: sub, caminho: subCaminho, tamanho: item.tamanho, tipo: 'erro', rotulo: 'Não foi possível descompactar', sha256: null, achados: [], detalhes: [], filhos: [], nivel: 'ok' })
      continue
    }
    if (office && /\.rels$|document\.xml$|externalLinks/i.test(item.nome)) {
      add(sinaisDoOfficeXml(item.nome, utf8.decode(dados)))
      continue
    }
    if (apk && item.nome === 'AndroidManifest.xml') {
      add(sinaisDoApk(dados))
      continue
    }
    await recursar(sub, subCaminho, dados)
  }
}

export function formatarBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

/** Todos os nós da árvore, em ordem (o arquivo e o que tem dentro). */
export function listarNos(no, lista = []) {
  lista.push(no)
  for (const filho of no.filhos) listarNos(filho, lista)
  return lista
}

/** Aplica o resultado das bases de malware conhecido (consulta pelo SHA-256). */
export function aplicarConsulta(raiz, resultados) {
  for (const no of listarNos(raiz)) {
    const r = no.sha256 && resultados[no.sha256]
    if (!r) continue
    if (r.bazaar) {
      no.achados.unshift({ nivel: 'danger', texto: `Este arquivo está na base de vírus conhecidos MalwareBazaar${r.bazaar.assinatura ? ` como "${r.bazaar.assinatura}"` : ''}. Não abra e apague.` })
    }
    if (r.circl?.malicioso) {
      no.achados.unshift({ nivel: 'danger', texto: `Este arquivo exato já foi identificado como malicioso (fonte: ${r.circl.malicioso}). Não abra e apague.` })
    } else if (r.circl && !r.bazaar) {
      no.achados.push({ nivel: 'ok', texto: `Este arquivo exato está no banco de arquivos conhecidos de softwares legítimos${r.circl.nome ? ` ("${r.circl.nome}")` : ''}.` })
      no.conhecido = true
      // Arquivo legítimo conhecido: o aviso genérico de "é um programa" deixa de pesar.
      no.achados = no.achados.map((a) => (a.generico && a.nivel === 'warn' ? { ...a, nivel: 'info' } : a))
    }
  }
  recalcular(raiz)
}

function recalcular(no) {
  for (const filho of no.filhos) recalcular(filho)
  no.achados.sort((a, b) => PESO[b.nivel] - PESO[a.nivel])
  no.nivel = [...no.achados.map((a) => a.nivel), ...no.filhos.map((f) => f.nivel)].reduce(maior, 'ok')
}
