import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Ferramentas 4dev. Tudo roda no navegador, menos o Webhook Inspector, que usa o worker:
// o fluxo dele só roda com E2E_COMPARTILHADO=1 (de preferência contra o worker local).
// O API Tester chama a API pública jsonplaceholder.typicode.com.
const COMPARTILHADO = process.env.E2E_COMPARTILHADO === '1'
const limpar = (page) => page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})

async function abrir(page, slug) {
  await page.goto(`/4dev/${slug}`)
  await limpar(page)
  await page.locator('.dv-palco').scrollIntoViewIfNeeded()
  await expect(page.locator('.dv-palco > *').first()).toBeVisible({ timeout: 30000 })
  await page.waitForTimeout(600)
}

function cenario(slug, nome, descricao, corpo) {
  test(`4dev · ${nome}`, async ({ page }, info) => {
    info.annotations.push({ type: 'O que este teste faz', description: descricao })
    const ev = novaEvidencia('4dev', slug, nome)
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))
    page.on('dialog', (d) => d.accept())
    let ok = false
    try {
      await test.step('1. Abrir a ferramenta', async () => {
        await abrir(page, slug)
      })
      await corpo(page, info, ev)
      await test.step('Sem erro de JavaScript', async () => {
        expect(erros, `erros de JS: ${erros.join(' | ')}`).toHaveLength(0)
      })
      ok = true
    } finally {
      ev.salvar(ok)
    }
  })
}

cenario('json-toolkit', 'JSON Toolkit', 'Mostra o erro com linha e coluna, corrige, navega na árvore, converte para TypeScript e compara dois JSONs.', async (page, info, ev) => {
  await test.step('2. Erro com linha e coluna', async () => {
    await page.locator('.dv-codigo textarea').first().fill('{"a": 1,\n  "b": [1, 2,],\n}')
    await expect(page.locator('.dv-aviso[data-tipo="erro"]')).toContainText('linha 2')
    await ev.print(page, info, 'JSON inválido', 'Aponta a linha e a coluna do erro e destaca a linha.')
    await page.getByRole('button', { name: 'Corrigir' }).click()
    await expect(page.locator('.dv-status')).toContainText('válido')
  })
  await test.step('3. Árvore e caminho', async () => {
    await page.getByRole('button', { name: 'Exemplo' }).click()
    await page.getByRole('tab', { name: 'Árvore' }).click()
    await page.locator('.dv-j-chave', { hasText: '"cidade"' }).click()
    await expect(page.locator('.dv-caminho')).toHaveText('$.endereco.cidade')
    await ev.print(page, info, 'Árvore navegável', 'Clicar na chave mostra o caminho JSONPath.')
  })
  await test.step('4. Converter e comparar', async () => {
    await page.getByRole('tab', { name: 'Converter' }).click()
    await page.getByRole('radio', { name: 'TypeScript' }).click()
    await expect(page.locator('textarea[aria-label="Resultado"]')).toHaveValue(/export interface/)
    await ev.print(page, info, 'JSON para TypeScript', 'Interfaces geradas, com campos opcionais detectados.')
    await page.getByRole('tab', { name: 'Comparar' }).click()
    await page.locator('.dv-codigo textarea').nth(1).fill('{"id": 42, "nome": "Ana", "ativo": false}')
    await expect(page.locator('.dv-tabela tbody tr').first()).toBeVisible()
    await ev.print(page, info, 'Diferenças', 'Diff estrutural: adicionado, removido e alterado por caminho.')
  })
})

cenario('jwt-decoder', 'JWT Decoder', 'Decodifica o token de exemplo, verifica a assinatura com o segredo certo e com um errado, e gera um token.', async (page, info, ev) => {
  await test.step('2. Decodificar e verificar', async () => {
    await page.getByRole('button', { name: 'Exemplo' }).click()
    await page.getByPlaceholder('Segredo (secret) do HMAC').fill('segredo-de-teste')
    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.locator('.dv-aviso[data-tipo="ok"]')).toContainText('Assinatura válida')
    await ev.print(page, info, 'Assinatura válida', 'Header, payload com claims explicadas e verificação HS256.')
    await page.getByPlaceholder('Segredo (secret) do HMAC').fill('errado')
    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.locator('.dv-aviso[data-tipo="erro"]')).toContainText('inválida')
  })
  await test.step('3. Gerar token', async () => {
    await page.getByRole('tab', { name: /Gerar token/ }).click()
    await expect(page.locator('textarea[aria-label="Token gerado"]')).toHaveValue(/^eyJ/)
    await ev.print(page, info, 'Token gerado', 'Token HS256 gerado a partir do header, payload e segredo.')
  })
})

cenario('cron-builder', 'Cron Builder', 'Explica uma expressão em português, usa um atalho, monta pelo editor visual e mostra as próximas execuções.', async (page, info, ev) => {
  await test.step('2. Explicação e próximas execuções', async () => {
    await expect(page.locator('.dv-cron-frase')).toContainText('de segunda a sexta')
    await expect(page.locator('.dv-lista-datas li')).toHaveCount(10)
    await ev.print(page, info, 'Expressão explicada', '“Às 09:00, de segunda a sexta” e as próximas 10 execuções.')
  })
  await test.step('3. Atalho e editor visual', async () => {
    await page.getByRole('button', { name: 'Sexta às 18:30' }).click()
    await page.locator('.dv-cron-campo').first().getByRole('radio', { name: 'A cada' }).click()
    await expect(page.locator('.dv-cron-input')).toHaveValue('*/5 18 * * 5')
    await ev.print(page, info, 'Montado pelo editor', 'Minuto “a cada 5” escolhido no editor visual.')
  })
  await test.step('4. Erro de sintaxe', async () => {
    await page.locator('.dv-cron-input').fill('0 0 * *')
    await expect(page.locator('.dv-aviso[data-tipo="erro"]')).toContainText('5 campos')
  })
})

cenario('api-tester', 'API Tester', 'Envia GET e POST para uma API pública no layout estilo Postman, importa um cURL e gera o código.', async (page, info, ev) => {
  await test.step('2. GET', async () => {
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('.pm-metricas')).toContainText('200', { timeout: 20000 })
    await ev.print(page, info, 'Resposta do GET', 'Status, tempo, tamanho e o JSON colorido.')
  })
  await test.step('3. POST com body JSON', async () => {
    await page.locator('.pm-col li', { hasText: 'Criar post' }).locator('button').first().click()
    await page.locator('.pm-painel').getByRole('tab', { name: /Body/ }).click()
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('.pm-metricas')).toContainText('201', { timeout: 20000 })
    await ev.print(page, info, 'POST criado (201)', 'Body raw JSON e resposta da API.')
  })
  await test.step('4. Importar cURL e ver o código', async () => {
    await page.getByRole('button', { name: '＋ New' }).click()
    await page.locator('.pm-url').focus()
    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.setData('text', "curl -X PUT 'https://httpbin.org/put?x=1' -H 'Authorization: Bearer abc123' -H 'Content-Type: application/json' --data-raw '{\"a\":1}'")
      document.querySelector('.pm-url').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    })
    await expect(page.locator('.pm-metodo')).toHaveValue('PUT')
    await page.locator('.pm-resp').getByRole('tab', { name: 'Code' }).click()
    await expect(page.locator('.pm-code .pm-corpo')).toContainText('curl -X PUT')
    await ev.print(page, info, 'cURL importado', 'Colar um cURL na URL preenche método, params, Bearer e body; a aba Code gera cURL, fetch e Python.')
  })
})

cenario('sql-toolkit', 'SQL Toolkit', 'Formata, explica com alertas, converte para SQL Server e gera INSERT a partir de CSV.', async (page, info, ev) => {
  await test.step('2. Formatar', async () => {
    await expect(page.locator('textarea[aria-label="SQL formatado"]')).toHaveValue(/SELECT\n/)
    await ev.print(page, info, 'SQL formatado', 'Palavras-chave em maiúsculas, uma cláusula por linha e AND/OR alinhados.')
  })
  await test.step('3. Explicar', async () => {
    await page.getByRole('tab', { name: 'Explicar' }).click()
    await expect(page.locator('.dv-passos li').first()).toBeVisible()
    await expect(page.locator('.dv-alertas .dv-aviso').first()).toBeVisible()
    await ev.print(page, info, 'Explicação e alertas', 'Passo a passo em português e alertas de índice e LIKE com %.')
  })
  await test.step('4. Converter e gerar INSERT', async () => {
    await page.getByRole('tab', { name: 'Converter banco' }).click()
    await expect(page.locator('textarea[aria-label="SQL convertido"]')).toHaveValue(/TOP 10/)
    await ev.print(page, info, 'Convertido para SQL Server', 'LIMIT virou TOP e as aspas mudaram.')
    await page.getByRole('tab', { name: /INSERT/ }).click()
    await expect(page.locator('textarea[aria-label="INSERT gerado"]')).toHaveValue(/INSERT INTO/)
    await ev.print(page, info, 'CSV para INSERT', 'CREATE TABLE com tipos deduzidos e INSERT com aspas escapadas.')
  })
})

cenario('webhook-inspector', 'Webhook Inspector', 'Gera uma URL temporária, recebe requisições (JSON e formulário) e configura a resposta.', async (page, info, ev) => {
  if (!COMPARTILHADO) {
    await ev.print(page, info, 'Tela inicial', 'Botão para gerar a URL temporária.')
    ev.nota('Fluxo com servidor não executado', 'Rode com E2E_COMPARTILHADO=1 (contra o worker local) para gerar a URL e receber requisições.')
    return
  }
  let url = ''
  await test.step('2. Gerar a URL', async () => {
    await page.getByRole('button', { name: 'Gerar URL temporária' }).click()
    url = await page.locator('.wh-url code').innerText()
    expect(url).toContain('/wh/r/')
  })
  await test.step('3. Receber requisições', async () => {
    await page.request.post(`${url}/stripe/evento?tentativa=1`, { headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=abc' }, data: { type: 'payment_intent.succeeded', data: { object: { amount: 4990 } } } })
    await page.request.post(url, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, data: 'nome=Ana&valor=10' })
    await expect(page.locator('.wh-lista li')).toHaveCount(2, { timeout: 10000 })
    await page.locator('.wh-lista li').nth(1).locator('button').click()
    await ev.print(page, info, 'Requisição recebida', 'Método, caminho, query, headers e payload JSON formatado.')
  })
  await test.step('4. Configurar a resposta', async () => {
    await page.locator('summary', { hasText: 'Resposta que a URL devolve' }).click()
    await page.locator('.wh-resposta input[type=number]').fill('201')
    await page.getByRole('button', { name: 'Salvar resposta' }).click()
    await page.waitForTimeout(500)
    const r = await page.request.post(`${url}/x`, { data: 'oi' })
    expect(r.status()).toBe(201)
    ev.nota('Resposta configurada', 'A URL passou a responder 201.')
  })
})
