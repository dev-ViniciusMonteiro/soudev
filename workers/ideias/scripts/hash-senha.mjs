/**
 * Gera o hash da senha do admin para o secret ADMIN_PASS_HASH.
 * A senha é digitada aqui no seu PC e NÃO aparece na tela, no git nem no Worker.
 *
 * Uso:
 *   node scripts/hash-senha.mjs
 * Digite a senha quando pedir e copie a linha gerada para:
 *   wrangler secret put ADMIN_PASS_HASH
 */
import crypto from 'node:crypto'
import readline from 'node:readline'

const ITERACOES = 100000 // máximo que o runtime do Cloudflare Workers aceita (PBKDF2-SHA256)

function perguntarSenhaOculta(texto) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const out = process.stdout
    // não ecoa os caracteres digitados
    rl._writeToOutput = (s) => { if (s.includes(texto)) out.write(s) }
    rl.question(texto, (resp) => { out.write('\n'); rl.close(); resolve(resp) })
  })
}

const senha = (await perguntarSenhaOculta('Digite a senha do admin: ')).trim()
if (senha.length < 8) {
  console.error('\nSenha muito curta (use 8+ caracteres).')
  process.exit(1)
}

const salt = crypto.randomBytes(16)
const hash = crypto.pbkdf2Sync(senha, salt, ITERACOES, 32, 'sha256')
const valor = `pbkdf2$${ITERACOES}$${salt.toString('base64')}$${hash.toString('base64')}`

console.log('\nHash gerado (cole quando o wrangler pedir o valor de ADMIN_PASS_HASH):\n')
console.log(valor)
console.log('\nComando:  wrangler secret put ADMIN_PASS_HASH')
