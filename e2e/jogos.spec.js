import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// The Last Aula: o jogo roda em /jogar/last-aula (build do Vite em public/jogar, gerado pelo npm run build).
// O teste joga o tutorial inteiro segurando D e usa os ganchos de teste (window.__lastAula) para
// conferir ataque, morte, a saída que exige 3 cristais e o final da caverna.

const estado = (page) =>
  page.evaluate(() => {
    const L = window.__lastAula
    const j = L.jogador()
    return { fase: L.fase(), estado: L.estado(), cristais: L.cristais(), inimigos: L.inimigosVivos(), x: j.x, y: j.y }
  })

test('Jogo · The Last Aula', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Joga o tutorial do começo ao fim, testa o ataque contra um robô, a morte nos espinhos, a saída que só abre com 3 cristais e o final na caverna.' })
  const ev = novaEvidencia('jogo', 'last-aula', 'The Last Aula')
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  let ok = false
  try {
    await test.step('1. Abrir o jogo', async () => {
      await page.goto('/jogar/last-aula/index.html')
      await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible({ timeout: 30000 })
      await ev.print(page, info, 'Menu do jogo', 'História, controles e os botões Jogar e Tutorial.')
    })

    await test.step('2. Jogar o tutorial inteiro segurando D', async () => {
      await page.getByRole('button', { name: 'Tutorial' }).click()
      await page.waitForTimeout(700)
      await ev.print(page, info, 'Tutorial', 'Placa com A e D (setas corrigidas), o primeiro cristal e o robô NEMO-MK2.')
      await page.keyboard.down('KeyD')
      await page.waitForTimeout(1400)
      await ev.print(page, info, 'Andando e pegando cristais', 'O contador mostra os cristais pegos.')
      await expect.poll(async () => (await estado(page)).estado, { timeout: 20000 }).not.toBe('jogando')
      await page.keyboard.up('KeyD')
      expect((await estado(page)).cristais).toBe(3)
      await expect(page.getByRole('heading', { name: 'Tutorial completo!' })).toBeVisible({ timeout: 5000 })
      await ev.print(page, info, 'Tutorial completo', 'Com os 3 cristais o dragão entra na saída e o tutorial termina.')
    })

    await test.step('3. Fase 1: atacar um robô', async () => {
      await page.getByRole('button', { name: 'Jogar a Fase 1' }).click()
      await page.waitForTimeout(800)
      await ev.print(page, info, 'Fase 1: Floresta de Zurard', 'Fase convertida das cenas originais do Unity.')
      const antes = (await estado(page)).inimigos
      // coloca o dragão logo atrás do robô que patrulha o chão (x de 17 a 32) e ataca
      await page.evaluate(() => {
        const L = window.__lastAula
        L.iniciar('Fase1')
      })
      await page.waitForTimeout(200)
      // congela o jogo, coloca o dragão logo atrás do robô e ataca no mesmo instante em que descongela
      await page.evaluate(() => {
        const L = window.__lastAula
        L.congelar(true)
        const nemo = L.dados().inimigos[1]
        L.irPara(nemo.x - 1.25, nemo.y + 0.95, 1)
      })
      await page.waitForTimeout(100)
      await ev.print(page, info, 'Robô à frente', 'Um NEMO-MK2 patrulhando: encostar nele é fatal.')
      await page.evaluate(() => { window.__lastAula.congelar(false); window.__lastAula.atacar() })
      await page.waitForTimeout(150)
      await page.evaluate(() => window.__lastAula.congelar(true))
      await ev.print(page, info, 'Ataque do dragão', 'Novidade desta versão: o dragão ataca com a animação de golpe do sprite original e o robô explode.')
      await page.evaluate(() => window.__lastAula.congelar(false))
      await expect.poll(async () => (await estado(page)).inimigos, { timeout: 3000 }).toBe(antes - 1)
      await ev.print(page, info, 'Robô derrotado', `Inimigos vivos: ${antes} → ${antes - 1}.`)
    })

    await test.step('4. Saída sem cristais e morte nos espinhos', async () => {
      await page.evaluate(() => {
        const L = window.__lastAula
        const [sx, sy] = L.dados().saida
        L.irPara(sx - 0.5, sy + 1.3, 1)
      })
      await page.waitForTimeout(500)
      expect((await estado(page)).estado).toBe('jogando')
      await ev.print(page, info, 'Saída fechada sem 3 cristais', 'No fim da fase, sem os cristais, aparece quantos faltam.')
      // espinho em cima da plataforma de madeira em (9, -1)
      await page.evaluate(() => window.__lastAula.irPara(9.5, 0.5, 1))
      await expect(page.getByRole('heading', { name: 'O dragão caiu!' })).toBeVisible({ timeout: 5000 })
      await ev.print(page, info, 'Uma vida só', 'Encostou no espinho: a jornada recomeça da Fase 1, como no original.')
    })

    await test.step('5. Caverna: pegar os cristais e terminar o jogo', async () => {
      await page.evaluate(() => window.__lastAula.iniciar('Fase2'))
      await page.waitForTimeout(800)
      await ev.print(page, info, 'Fase 2: Caverna dos Cristais', 'Plataformas móveis sobre os espinhos, convertidas do MovementPhase.cs.')
      await page.evaluate(() => {
        const L = window.__lastAula
        const [x, y] = L.dados().cristais[0]
        L.irPara(x - 1.2, y + 0.9, 1)
      })
      await page.keyboard.down('KeyD')
      await expect.poll(async () => (await estado(page)).estado, { timeout: 15000 }).not.toBe('jogando')
      await page.keyboard.up('KeyD')
      expect((await estado(page)).cristais).toBeGreaterThanOrEqual(3)
      await expect(page.getByRole('heading', { name: 'Você recuperou os cristais!' })).toBeVisible({ timeout: 5000 })
      await ev.print(page, info, 'Fim do jogo', 'Com os cristais o dragão volta a voar.')
    })

    expect(erros, erros.join('\n')).toEqual([])
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
