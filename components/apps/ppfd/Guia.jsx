// Guia de medição: passo a passo com o papel difusor, calibração, limites do celular e o que fazer com o número.

export default function Guia() {
  return (
    <div className="pf-guia pf-cartao">
      <h2>Como medir PPFD com o celular</h2>
      <ol>
        <li>
          <strong>Difusor:</strong> cubra a câmera da frente com uma folha de papel sulfite branco (presa com fita). O papel espalha a luz e faz o celular “ver” como um sensor de verdade, que mede a luz vinda de todos os ângulos.
        </li>
        <li>
          <strong>Posição:</strong> deite o celular na altura das pontas das plantas, tela para cima, embaixo da luz. Não faça sombra com a mão ou o corpo.
        </li>
        <li>
          <strong>Calibre uma vez:</strong> leve o celular até um ponto com valor conhecido e use “Calibrar” na aba Medir. Serve um medidor de PAR/quantum, um luxímetro ou o mapa de PAR do fabricante (o valor do centro, na altura indicada). Sem calibrar, a câmera não tem como dar um número absoluto.
        </li>
        <li>
          <strong>Escolha a luz certa:</strong> em placas Samsung LM301H EVO com 660 nm (como as de floração da Yxo/Yuxinou), ajuste a porcentagem de vermelho. O vermelho quase não aparece em lux, mas conta para a planta.
        </li>
        <li>
          <strong>Mapa:</strong> meça vários pontos (aba Mapa) e ajuste a altura até a média ficar na faixa da fase com uniformidade acima de 0,7.
        </li>
      </ol>

      <h3>Faixas de referência (sem CO₂ extra)</h3>
      <ul>
        <li>Mudas e clones: 100–300 µmol/m²/s</li>
        <li>Vegetativo: 300–600 µmol/m²/s (DLI ~20–40 com 18 h)</li>
        <li>Floração: 600–900 µmol/m²/s (DLI ~25–40 com 12 h)</li>
        <li>Acima de ~1000: só com CO₂, temperatura e nutrição em dia</li>
      </ul>

      <h3>Limites, sem enrolação</h3>
      <ul>
        <li>Celular não é um sensor quântico. Bem calibrado, costuma ficar a uns ±10–15% de um medidor de verdade para a mesma luz. Sem calibrar, pode errar muito mais.</li>
        <li>A câmera só serve para medir se o navegador deixar travar a exposição (Chrome no Android, na maioria dos aparelhos). No iPhone o Safari não permite: lá a medida fica só relativa.</li>
        <li>O sensor de luz do aparelho só aparece em alguns navegadores. Quando aparece, já mede em lux, mas também melhora calibrando.</li>
        <li>Luz muito forte pode estourar a câmera: dobre o papel (2–3 folhas) e calibre de novo com o mesmo papel dobrado.</li>
        <li>A calibração vale para o mesmo celular, a mesma câmera e o mesmo papel.</li>
      </ul>
    </div>
  )
}
