const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`

const clean = (value, max) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .,@-]/g, '')
    .trim()
    .slice(0, max)

function crc16(payload) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    crc &= 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Gera o "Pix copia e cola" (BR Code estático) conforme o manual do Banco Central.
export function gerarPixPayload({ chave, nome, cidade, valor, txid, descricao }) {
  const conta =
    field('00', 'br.gov.bcb.pix') + field('01', chave.trim()) + (descricao ? field('02', clean(descricao, 40)) : '')
  const id = String(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'
  const payload =
    field('00', '01') +
    field('26', conta) +
    field('52', '0000') +
    field('53', '986') +
    (valor > 0 ? field('54', valor.toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', clean(nome, 25) || 'N') +
    field('60', clean(cidade, 15) || 'BRASIL') +
    field('62', field('05', id)) +
    '6304'
  return payload + crc16(payload)
}
