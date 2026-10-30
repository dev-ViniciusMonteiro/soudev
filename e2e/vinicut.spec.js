import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Vinicut (rede social). A parte pública (tela de entrada) roda sempre. O fluxo logado
// (perfil, recado, comunidades) roda quando VC_USER e VC_SENHA são passados por variável
// de ambiente — as credenciais não ficam no repositório.
//   VC_USER=vinivn VC_SENHA=... npm run test:e2e -- -g Vinicut
const USER = process.env.VC_USER || ''
const SENHA = process.env.VC_SENHA || ''

test('Rede · Vinicut', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Abre o Vinicut, confirma a tela de entrada (login e criar conta) e, com credenciais de teste, entra e percorre perfil, recado e comunidades — tudo com prints.' })
  const ev = novaEvidencia('rede', 'vinicut', 'Vinicut')
  let ok = false
  try {
    await test.step('1. Abrir o Vinicut (tela de entrada)', async () => {
      await page.goto('/vinicut')
      await expect(page.locator('.vc-entrar')).toBeVisible({ timeout: 20000 })
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('.vc-abas button')).toHaveCount(2)
      await ev.print(page, info, 'Tela de entrada', 'Login e "criar conta" no estilo Orkut, com usuário e senha (sem e-mail).')
    })

    await test.step('2. Alternar para "Criar conta"', async () => {
      await page.getByRole('button', { name: /criar conta/i }).click()
      await expect(page.getByPlaceholder(/como vão te chamar|seu nome/i)).toBeVisible()
      await ev.print(page, info, 'Formulário de criar conta', 'O cadastro pede nome, usuário e senha.')
      await page.locator('.vc-abas button', { hasText: /entrar/i }).click()
    })

    if (!USER || !SENHA) {
      ev.nota('Fluxo logado não executado', 'Rode com VC_USER e VC_SENHA para testar login, perfil, recado e comunidades.')
    } else {
      await test.step('3. Entrar com a conta de teste', async () => {
        await page.locator('input').first().fill(USER)
        await page.locator('input[type="password"]').fill(SENHA)
        await page.locator('form button[type="submit"]').click()
        await expect(page.locator('.vc-topo')).toBeVisible({ timeout: 20000 })
        await ev.print(page, info, 'Início logado', 'Entrou com usuário e senha; aparece o topo com o nome e os atalhos.')
      })

      await test.step('4. Abrir o meu perfil', async () => {
        await page.goto(`/vinicut/u/${USER.toLowerCase()}`)
        await expect(page.locator('.vc-perfil-mini')).toBeVisible()
        await ev.print(page, info, 'Meu perfil', 'Perfil com contadores (recados, amigos, depoimentos, comunidades) e abas.')
      })

      await test.step('5. Deixar um recado (e ver aparecer)', async () => {
        const texto = `Recado de teste automatizado — ${new Date().toISOString().slice(0, 16)}`
        const caixa = page.locator('.vc-enviar textarea').first()
        await caixa.fill(texto)
        await page.locator('.vc-enviar button[type="submit"]').first().click()
        await expect(page.locator('.vc-recados', { hasText: texto }).first()).toBeVisible({ timeout: 10000 })
        await ev.print(page, info, 'Recado publicado', 'O recado enviado aparece na hora no mural do perfil.')
      })

      await test.step('6. Ver as comunidades', async () => {
        await page.goto('/vinicut/comunidades')
        await expect(page.locator('.vc-card').first()).toBeVisible()
        await ev.print(page, info, 'Comunidades', 'Lista de comunidades e o formulário para criar uma nova.')
      })

      await test.step('7. Sair da conta', async () => {
        await page.goto('/vinicut')
        const sair = page.locator('.vc-eu button')
        if (await sair.count()) await sair.click().catch(() => {})
      })
    }
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
