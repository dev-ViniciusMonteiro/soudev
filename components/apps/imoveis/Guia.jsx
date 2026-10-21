// Guia: como chegar no proprietário pelos caminhos oficiais, o que pedir em cada lugar e os cuidados com a LGPD.

export default function Guia() {
  return (
    <div className="im-pagina im-guia">
      <h2>Como descobrir o dono de um imóvel (do jeito certo)</h2>
      <p>No Brasil, quem é o proprietário está registrado na <strong>matrícula do imóvel</strong>, no Cartório de Registro de Imóveis. A matrícula é pública: qualquer pessoa pode pedir a certidão, sem precisar explicar o motivo.</p>
      <ol>
        <li>
          <strong>Ache o imóvel no mapa</strong> (sua localização ou o endereço) e abra a ficha.
        </li>
        <li>
          <strong>Descubra o cartório e a matrícula</strong> no <a href="https://mapa.onr.org.br/" target="_blank" rel="noopener noreferrer">Mapa do Registro de Imóveis (ONR)</a>. Onde o mapa ainda não chegou, o cartório responsável é o da circunscrição do endereço (pergunte ao cartório da cidade).
        </li>
        <li>
          <strong>Peça a certidão de matrícula</strong> no <a href="https://ridigital.org.br/" target="_blank" rel="noopener noreferrer">RI Digital</a>. Ela traz o proprietário atual, o histórico de compra e venda e se há penhora, hipoteca ou alienação fiduciária.
        </li>
        <li>
          <strong>Sem o número da matrícula?</strong> O número do IPTU (inscrição imobiliária) ajuda o cartório a localizar. A prefeitura informa dados do cadastro, e muitas têm consulta on-line.
        </li>
        <li>
          <strong>Imóvel comercial?</strong> Consulte o CNPJ da empresa no local: a Receita mostra razão social, contato e sócios. Quem ocupa nem sempre é o dono, mas costuma saber quem é.
        </li>
        <li>
          <strong>Abordagem:</strong> carta na portaria ou caixa de correio, conversa com o síndico ou zelador, e anúncios antigos do próprio endereço.
        </li>
      </ol>

      <h3>Documentos para a captação</h3>
      <ul>
        <li>Certidão de matrícula atualizada (até 30 dias)</li>
        <li>Certidão de ônus reais e ações reipersecutórias</li>
        <li>Débitos de IPTU (certidão negativa da prefeitura)</li>
        <li>Declaração de débitos de condomínio (se houver)</li>
        <li>Documentos pessoais do proprietário e do cônjuge</li>
      </ul>

      <h3>Cuidados com a LGPD</h3>
      <ul>
        <li>Use os dados do proprietário só para oferecer o seu serviço de corretagem, e registre de onde veio cada informação.</li>
        <li>Se a pessoa pedir para não ser mais contatada, respeite e apague os dados dela da carteira.</li>
        <li>Não compre listas de “donos de imóveis” de origem desconhecida: costumam ser vazamentos.</li>
        <li>A carteira deste app fica só no seu navegador; nada é enviado para o site.</li>
      </ul>

      <h3>De onde vêm os dados</h3>
      <p className="muted small">Mapa, endereços, construções, comércios e bairro: OpenStreetMap (colaborativo, pode estar incompleto). Imagens de satélite: Esri. CEP: ViaCEP. Município: IBGE (BrasilAPI). Empresas e sócios: Receita Federal (BrasilAPI). Matrícula e certidões: ONR e cartórios.</p>
    </div>
  )
}
