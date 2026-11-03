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

// Escape The Police: FPS 3D em three.js (/jogar/escape-the-police). O teste anda pelo mapa, atira de verdade
// (mirando pelos ganchos window.__etp), joga uma granada e derruba as 3 ondas de policiais até a vitória.
test('Jogo · Escape The Police', async ({ page }, info) => {
  test.setTimeout(240000)
  info.annotations.push({ type: 'O que este teste faz', description: 'Abre o FPS 3D, anda, atira nos policiais, joga granada, confere vida, munição e recarga e vence as 3 ondas.' })
  const ev = novaEvidencia('jogo', 'escape-the-police', 'Escape The Police')
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  const E = (f, a) => page.evaluate(f, a)
  let ok = false
  try {
    await test.step('1. Abrir o jogo', async () => {
      await page.goto('/jogar/escape-the-police/index.html')
      await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible({ timeout: 60000 })
      await ev.print(page, info, 'Menu', 'Objetivo, controles e o botão Jogar.')
    })

    await test.step('2. Começar e andar', async () => {
      await page.getByRole('button', { name: 'Jogar' }).click()
      await expect.poll(() => E(() => window.__etp.estado())).toBe('jogando')
      await E(() => window.__etp.invencivel())
      await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW')
      const j = await E(() => window.__etp.jogador())
      expect(j.z).toBeGreaterThan(-99)
      await ev.print(page, info, 'Primeira pessoa', 'Pistola do Low Poly FPS Pack, vida, munição, granadas e o radar com os policiais.')
    })

    // derruba todos os policiais vivos chegando perto e atirando (com recarga quando o pente acaba)
    async function limparOnda(rotulo) {
      const onda = await E(() => window.__etp.onda())
      for (let volta = 0; volta < 120; volta++) {
        if ((await E(() => window.__etp.estado())) !== 'jogando' || (await E(() => window.__etp.onda())) !== onda) return
        const vivos = await E(() => window.__etp.policiais())
        if (!vivos.length) { await page.waitForTimeout(500); continue }
        const p = vivos[0]
        await E(([x, z]) => window.__etp.irPara(x - 7, z - 7), [p.x, p.z])
        await page.waitForTimeout(120)
        const q = (await E(() => window.__etp.policiais()))[0]
        if (!q) continue
        await E(([x, z]) => { window.__etp.olharPara(x, -5 + 1.15, z); window.__etp.atirar() }, [q.x, q.z])
        const j = await E(() => window.__etp.jogador())
        if (j.municao === 0) { await page.keyboard.press('KeyR'); await page.waitForTimeout(1700) } else await page.waitForTimeout(230)
        if (volta === 2 && rotulo) await ev.print(page, info, rotulo, 'Mira no policial e tiro: a barra de vida dele aparece e diminui.')
      }
    }

    await test.step('3. Onda 1: os 2 policiais da cena original', async () => {
      await page.waitForTimeout(3500) // os policiais nascem aos poucos
      await limparOnda('Tiro no policial')
      await expect.poll(() => E(() => window.__etp.onda()), { timeout: 20000 }).toBe(1)
      await ev.print(page, info, 'Onda 2', 'Ao fim de cada onda o jogador recupera vida e ganha uma granada.')
    })

    await test.step('4. Granada', async () => {
      await page.waitForTimeout(3000)
      const p = (await E(() => window.__etp.policiais()))[0]
      if (p) {
        await E(([x, z]) => { window.__etp.irPara(x - 9, z - 9); window.__etp.olharPara(x, -3.5, z) }, [p.x, p.z])
        const antes = (await E(() => window.__etp.jogador())).granadas
        await E(() => window.__etp.granada())
        await page.waitForTimeout(2400)
        await ev.print(page, info, 'Granada', 'Explode depois de 2 segundos e fere os policiais em volta.')
        expect((await E(() => window.__etp.jogador())).granadas).toBe(antes - 1)
      }
    })

    await test.step('5. Ondas 2 e 3 até a vitória', async () => {
      for (let i = 0; i < 4 && (await E(() => window.__etp.estado())) === 'jogando'; i++) { await limparOnda(); await page.waitForTimeout(3500) }
      await expect(page.getByRole('heading', { name: 'Você escapou da polícia!' })).toBeVisible({ timeout: 30000 })
      expect(await E(() => window.__etp.abatidos())).toBe(12)
      await ev.print(page, info, 'Vitória', '12 policiais abatidos nas 3 ondas, com o tempo da partida.')
    })

    await test.step('6. Taxa de quadros', async () => {
      const fps = await E(() => window.__etp.fps())
      ev.nota('Taxa de quadros', `${Math.round(fps)} fps medidos no navegador do teste.`)
      expect(fps).toBeGreaterThan(20)
    })

    expect(erros, erros.join('\n')).toEqual([])
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
