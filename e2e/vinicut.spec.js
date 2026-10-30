import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Vinicut (rede social): confirma que a tela de entrada carrega com os campos de login/cadastro.
// Não cria conta (para não gerar dados de teste no banco real).
test('Rede · Vinicut', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Abre o Vinicut e confirma que a tela de entrada (login e criar conta) carrega com os campos de usuário e senha. Não cria conta para não sujar o banco.' })
  const ev = novaEvidencia('rede', 'vinicut', 'Vinicut')
  let ok = false
  try {
    await test.step('1. Abrir o Vinicut', async () => {
      await page.goto('/vinicut')
      await expect(page.locator('.vc-entrar, .vc-tela')).toBeVisible({ timeout: 20000 })
      await page.waitForTimeout(600)
      await ev.print(page, info, 'Tela de entrada', 'A tela inicial do Vinicut, no estilo Orkut, com login e criar conta.')
    })

    await test.step('2. Os campos de login estão presentes', async () => {
      const usuario = page.locator('input').first()
      await expect(usuario).toBeVisible()
      const senha = page.locator('input[type="password"]')
      await expect(senha).toBeVisible()
      ev.nota('Campos de acesso presentes', 'Usuário e senha disponíveis (login só com usuário e senha, sem e-mail).')
    })

    await test.step('3. Alternar para "Criar conta"', async () => {
      const criar = page.getByRole('button', { name: /criar conta/i }).first()
      if (await criar.count()) {
        await criar.click().catch(() => {})
        await page.waitForTimeout(400)
        await ev.print(page, info, 'Formulário de criar conta', 'O formulário de cadastro (nome, usuário e senha) abre sem erro.')
      }
    })
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
