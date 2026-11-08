// Central do Wi-Fi: leitura da lista colada, fabricante pelo MAC, tipo provável, guia por roteador e check-up.

/* ------------------------------ fabricantes (IEEE, via lista do Wireshark) ------------------------------ */
let base = null
export async function carregarFabricantes() {
  if (base) return base
  const r = await fetch('/dados/fabricantes-mac.json')
  const d = await r.json()
  const mapa = new Map()
  for (const item of d.p.split(',')) mapa.set(item.slice(0, 6), d.nomes[parseInt(item.slice(6), 36)])
  base = mapa
  return mapa
}

/* ------------------------------ MAC e IP ------------------------------ */
const RE_MAC = /\b([0-9a-f]{2}([:-])[0-9a-f]{2}(?:\2[0-9a-f]{2}){4})\b|\b([0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4})\b/i
const RE_IP = /\b((?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3})\b/

export const normalizarMac = (m) => m.replace(/[^0-9a-f]/gi, '').toUpperCase().match(/.{2}/g).join(':')
/** MAC "privado/aleatório": bit de administração local ligado (2º dígito 2, 6, A ou E). */
export const macAleatorio = (mac) => ['2', '6', 'A', 'E'].includes(mac[1])
const macIgnorado = (mac) => mac === 'FF:FF:FF:FF:FF:FF' || mac === '00:00:00:00:00:00' || parseInt(mac.slice(0, 2), 16) & 1 // broadcast/multicast

// palavras de botões e colunas que vêm junto quando se copia a tabela do roteador
const LIXO = /\b(endereço|endereco|físico|fisico|address|physical|hostname|nome do dispositivo|device name|bloquear|block|desbloquear|editar|edit|remover|delete|excluir|detalhes|online|offline|conectado|connected|dinâmico|dinamico|estático|estatico|dynamic|static|wi-?fi|2[.,]4\s?ghz|5\s?ghz|lan|wlan|wireless|cabo|ethernet|ativo|tipo|interface|dhcp|lease|permanente|n\/a|--)\b/gi

function limparNome(txt) {
  return txt
    .replace(LIXO, ' ')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ') // horários
    .replace(/\b\d+(\.\d+)?\s?(mbps|kbps|dbm|ms|min|h|d)\b/gi, ' ')
    .replace(/\b\d{1,3}\b/g, ' ') // números soltos (índice da tabela)
    .replace(/[|;\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[-–:,.\s]+|[-–:,.\s]+$/g, '')
    .slice(0, 60)
}

/** Lê o texto colado (tabela do roteador, app ou `arp -a`) e devolve [{ mac, ip, nome }]. */
export function lerLista(texto) {
  const linhas = String(texto || '').split(/\r?\n/)
  const achados = new Map()
  let pendente = [] // linhas sem MAC antes do MAC (tabelas copiadas com uma célula por linha)
  for (const linha of linhas) {
    const m = linha.match(RE_MAC)
    if (!m) { if (linha.trim()) pendente.push(linha); if (pendente.length > 6) pendente.shift(); continue }
    const mac = normalizarMac(m[0])
    const resto = linha.replace(m[0], ' ')
    let ip = (resto.match(RE_IP) || [])[1] || ''
    let nome = limparNome(resto.replace(RE_IP, ' '))
    // só procura acima quando a linha tem apenas o MAC (tabela com uma célula por linha)
    if (!ip && !nome) {
      // procura nome/IP nas linhas logo acima
      for (const p of pendente.slice().reverse()) {
        if (!ip) { const i = p.match(RE_IP); if (i) { ip = i[1]; continue } }
        if (!nome) { const n = limparNome(p.replace(RE_IP, ' ')); if (n && !RE_MAC.test(p)) nome = n }
      }
    }
    pendente = []
    if (macIgnorado(mac)) continue
    if (ip.endsWith('.255')) continue
    if (!achados.has(mac)) achados.set(mac, { mac, ip, nome })
  }
  return [...achados.values()]
}

/* ------------------------------ tipo provável ------------------------------ */
const PISTAS = [
  [/iphone/i, '📱', 'iPhone'], [/ipad/i, '📱', 'iPad'], [/macbook|imac|mac-?mini/i, '💻', 'Mac'],
  [/galaxy|android|redmi|moto|pixel|xiaomi|poco|celular|phone|sm-[a-z]\d/i, '📱', 'Celular'],
  [/\btv\b|bravia|webos|tizen|roku|fire.?tv|chromecast|tv.?box|apple.?tv/i, '📺', 'TV ou aparelho de TV'],
  [/echo|alexa|nest|google.?home|homepod/i, '🔊', 'Caixa inteligente'],
  [/playstation|ps[345]|xbox|nintendo|switch/i, '🎮', 'Videogame'],
  [/printer|impressora|epson|hp-?[a-z0-9]*print|deskjet|laserjet|brother|canon/i, '🖨️', 'Impressora'],
  [/cam|camera|câmera|dvr|nvr|ipc/i, '📷', 'Câmera'],
  [/desktop|laptop|notebook|\bpc\b|windows|-pc$/i, '💻', 'Computador'],
]
const POR_FABRICANTE = [
  [/apple/i, '📱', 'iPhone, iPad ou Mac'],
  [/samsung/i, '📱', 'Celular, tablet ou TV Samsung'],
  [/motorola|lenovo mobile/i, '📱', 'Celular Motorola'],
  [/xiaomi|beijing xiaomi/i, '📱', 'Celular ou aparelho Xiaomi'],
  [/huawei|honor/i, '📱', 'Celular ou roteador Huawei'],
  [/oneplus|oppo|vivo mobile|realme/i, '📱', 'Celular'],
  [/\blg\b|lg electronics|lg innotek/i, '📺', 'TV ou celular LG'],
  [/sony/i, '🎮', 'PlayStation ou TV Sony'],
  [/nintendo/i, '🎮', 'Nintendo'],
  [/microsoft/i, '💻', 'Xbox ou computador'],
  [/amazon/i, '🔊', 'Echo (Alexa), Fire TV ou Kindle'],
  [/google/i, '📺', 'Chromecast, Google Nest ou Pixel'],
  [/roku/i, '📺', 'Roku'],
  [/intel|realtek|liteon|lite-on|azurewave|hon hai|foxconn|qualcomm|mediatek|rivet|killer|dell|hewlett|hp inc|asustek|acer|lenovo|gigabyte|micro-star|msi/i, '💻', 'Computador ou notebook'],
  [/espressif|tuya|shenzhen|sonoff|itead|broadlink|positivo tecnologia/i, '💡', 'Aparelho inteligente (lâmpada, tomada, sensor)'],
  [/hikvision|dahua|intelbras/i, '📷', 'Câmera, DVR ou aparelho Intelbras'],
  [/tp-link|tplink|mercusys|tenda|d-link|netgear|ubiquiti|zte|askey|mitrastar|arcadyan|sagemcom|technicolor|nokia|fiberhome|multilaser|cisco|linksys|asus/i, '📶', 'Roteador, repetidor ou modem'],
  [/raspberry/i, '🍓', 'Raspberry Pi'],
  [/epson|canon|brother|seiko|lexmark|xerox/i, '🖨️', 'Impressora'],
]
export function tipoProvavel(nome, fabricante, aleatorio) {
  for (const [re, ic, t] of PISTAS) if (re.test(nome || '')) return { icone: ic, tipo: t }
  for (const [re, ic, t] of POR_FABRICANTE) if (re.test(fabricante || '')) return { icone: ic, tipo: t }
  if (aleatorio) return { icone: '📱', tipo: 'Provavelmente celular (endereço privado)' }
  return { icone: '❔', tipo: 'Não identificado' }
}

export const EXEMPLO = `Nome do dispositivo	Endereço IP	Endereço MAC
Galaxy-A54	192.168.0.105	3C:5A:37:12:AB:90
iPhone-de-Ana	192.168.0.110	D8:BB:2C:41:0F:22
LGwebOSTV	192.168.0.120	A8:23:FE:77:10:01
DESKTOP-K2J9	192.168.0.101	F0:D5:BF:9A:33:12
ESP_3B21C0	192.168.0.130	24:62:AB:3B:21:C0
android-8c1f	192.168.0.142	6A:2F:11:90:4C:7E
Echo-Dot	192.168.0.150	68:54:FD:22:91:0A`

/* ------------------------------ guia por roteador ------------------------------ */
// Os nomes de menu variam por modelo e versão; por isso o guia diz "procure por".
export const ROTEADORES = [
  { id: 'tplink', nome: 'TP-Link', ip: '192.168.0.1 ou tplinkwifi.net', app: 'Tether (ou Deco, nos sistemas mesh)', ver: ['"Mapa de rede" → "Clientes"', '"Avançado" → "Rede" → "Servidor DHCP" → lista de clientes'], bloquear: ['"Controle de acesso" (lista de bloqueio)', '"Controle parental" para limitar por horário'] },
  { id: 'intelbras', nome: 'Intelbras', ip: '10.0.0.1 ou 192.168.0.1', app: 'Intelbras Wi-Fi Control', ver: ['"Dispositivos conectados" na tela inicial', '"Status" → clientes sem fio'], bloquear: ['"Controle de acesso" ou "Filtro MAC"', '"Controle parental" (horários)'] },
  { id: 'mercusys', nome: 'Mercusys', ip: 'mwlogin.net ou 192.168.1.1', app: 'Mercusys', ver: ['"Dispositivos conectados" / "Clientes"'], bloquear: ['Toque no aparelho → "Bloquear"', '"Controle parental"'] },
  { id: 'multilaser', nome: 'Multilaser / Multi', ip: '192.168.0.1 ou 192.168.1.1', app: 'conforme o modelo', ver: ['"Gerenciamento de dispositivos" ou "Lista de clientes"'], bloquear: ['"Filtro MAC" / "Lista negra"'] },
  { id: 'huawei', nome: 'Huawei', ip: '192.168.3.1 (roteador) ou 192.168.100.1 (modem de fibra)', app: 'AI Life', ver: ['"Dispositivos" / "Terminais"'], bloquear: ['Toque no aparelho → bloquear ou limitar velocidade', '"Controle dos pais"'] },
  { id: 'vivo', nome: 'Modem da Vivo', ip: '192.168.15.1', app: 'App Vivo (parte de internet/Wi-Fi)', ver: ['"Status" → "Rede local/LAN" ou "Dispositivos conectados"', 'No app da Vivo: área do Wi-Fi'], bloquear: ['"Filtro MAC" / "Controle de acesso" no painel', 'Se não achar, troque a senha do Wi-Fi'] },
  { id: 'claro', nome: 'Modem da Claro / NET', ip: '192.168.0.1', app: 'Claro Wi-Fi / Minha Claro Residencial', ver: ['No app: "Dispositivos conectados"', 'No painel: "Status" → clientes'], bloquear: ['No app: escolha o aparelho → bloquear/pausar', 'No painel: "Filtro MAC"'] },
  { id: 'tim', nome: 'Modem da TIM Live', ip: '192.168.1.1', app: 'Meu TIM', ver: ['"Status" → "LAN"/"WLAN" → clientes'], bloquear: ['"Filtro MAC" / "Controle de acesso"'] },
  { id: 'outro', nome: 'Outro / não sei', ip: 'o "Gateway padrão" (veja abaixo como achar)', app: 'veja o nome na etiqueta do roteador', ver: ['Procure: "Dispositivos conectados", "Clientes", "Lista DHCP", "Wireless clients" ou "Attached devices"'], bloquear: ['Procure: "Controle de acesso", "Filtro MAC", "Blacklist" ou "Controle parental"'] },
]

/* ------------------------------ check-up ------------------------------ */
// bom: a resposta que deixa a rede segura. peso: importância.
export const PERGUNTAS = [
  { id: 'senha-padrao', p: 'A senha do Wi-Fi é a que veio impressa na etiqueta do roteador?', bom: 'nao', peso: 15, dica: 'Troque por uma senha sua, longa (12+ caracteres). A da etiqueta muitas vezes segue um padrão conhecido do modelo.' },
  { id: 'admin-padrao', p: 'A senha do painel do roteador ainda é a de fábrica (ex.: admin/admin)?', bom: 'nao', peso: 15, dica: 'Quem entra no seu Wi-Fi pode abrir o painel e mudar tudo. Troque a senha de administrador.' },
  { id: 'wpa', p: 'A segurança do Wi-Fi é WPA2 ou WPA3?', bom: 'sim', peso: 15, dica: 'No painel, em "Segurança sem fio", escolha WPA2-PSK (AES) ou WPA3. Rede aberta ou WEP é invasão garantida.' },
  { id: 'wps', p: 'O WPS (botão de conectar sem senha) está ligado?', bom: 'nao', peso: 10, dica: 'Desligue o WPS no painel: ele tem falhas conhecidas que permitem descobrir o acesso.' },
  { id: 'tamanho', p: 'A senha do Wi-Fi tem 12 caracteres ou mais?', bom: 'sim', peso: 10, dica: 'Use uma frase ou o Gerador de senha forte do site.' },
  { id: 'visitas', p: 'As visitas usam uma rede separada (rede de convidados)?', bom: 'sim', peso: 8, dica: 'Crie a "Rede de convidados" no painel e passe só ela para visitas, com um QR Code.' },
  { id: 'firmware', p: 'O roteador foi atualizado (firmware) no último ano?', bom: 'sim', peso: 10, dica: 'No painel, procure "Atualização de firmware" ou "Sistema". Modems de operadora costumam atualizar sozinhos.' },
  { id: 'remoto', p: 'O "gerenciamento remoto" (acesso ao painel pela internet) está ligado?', bom: 'nao', peso: 8, dica: 'Desligue, a não ser que você precise mesmo. Ele expõe o painel para a internet.' },
  { id: 'vizinho', p: 'Você já passou a senha para vizinho, ex-inquilino ou alguém que não mora aí?', bom: 'nao', peso: 9, dica: 'Troque a senha: quem já teve acesso continua conectando enquanto ela não mudar.' },
]
