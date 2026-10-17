import Link from 'next/link'
import CopiarCodigo from '@/components/sistemas/CopiarCodigo'
import { SITE_URL, jsonLd } from '@/lib/site'
import { nichos } from '@/lib/sistemas/nichos'

const title = 'Como Ligar os Sistemas à Sua Planilha do Google'
const description =
  'Passo a passo para guardar os dados dos sistemas de gestão numa planilha do Google: criar a planilha, colar o código, publicar e entrar com o código do e-mail.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/sistemas/planilha' },
  openGraph: { title, description, url: '/sistemas/planilha' },
}

function Caminho({ itens }) {
  return (
    <span className="sx-caminho">
      {itens.map((item, i) => (
        <span key={item}>
          {i > 0 && <i aria-hidden="true">›</i>}
          <b>{item}</b>
        </span>
      ))}
    </span>
  )
}

function Passo({ n, titulo, tempo, children }) {
  return (
    <li className="sx-guia-passo" id={`passo-${n}`}>
      <span className="sx-guia-n" aria-hidden="true">
        {n}
      </span>
      <div className="sx-guia-conteudo">
        <h3>
          {titulo}
          {tempo && <small>{tempo}</small>}
        </h3>
        {children}
      </div>
    </li>
  )
}

const problemas = [
  ['“Este e-mail não tem acesso a esta planilha”', 'Use o e-mail da conta Google que criou a planilha e rodou o “configurar”. Para outra pessoa entrar, cadastre o e-mail dela em Usuários, dentro do sistema.'],
  ['“A planilha respondeu algo inesperado”', 'O link colado não é o do App da Web. Ele precisa começar com https://script.google.com/macros/s/ e terminar em /exec. Confira também se “Quem pode acessar” está como “Qualquer pessoa”.'],
  ['“Servidor não configurado: rode a função configurar()”', 'Falta o passo 5. Volte ao Apps Script, escolha “configurar” no topo e clique em Executar. Não precisa implantar de novo.'],
  ['O código não chegou no e-mail', 'Olhe a caixa de spam e a aba Promoções. O e-mail sai da própria conta Google dona da planilha. Se pedir muitas vezes seguidas, espere 15 minutos.'],
  ['“Sessão expirada”', 'Por segurança a sessão vale 30 dias. Vá em Configurações e entre de novo com o código do e-mail. Nada do que estava na fila se perde.'],
  ['Mexi direto na planilha e não apareceu no sistema', 'O sistema só recebe o que passa por ele. Cadastre e edite pelo sistema; use a planilha para consultar, filtrar e fazer gráficos.'],
  ['“Erro ao sincronizar · X na fila”', 'Normalmente é internet ou instabilidade do Google. Os dados ficam guardados no aparelho e sobem sozinhos. Clique no aviso no topo para tentar na hora.'],
]

export default function GuiaPlanilha() {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description,
    totalTime: 'PT5M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'BRL', value: '0' },
    tool: [{ '@type': 'HowToTool', name: 'Conta Google' }],
    step: [
      'Crie uma planilha nova no Google Planilhas',
      'Abra Extensões > Apps Script',
      'Cole o código do servidor e salve',
      'Ajuste o fuso horário para São Paulo',
      'Rode a função configurar e autorize',
      'Implante como App da Web com acesso para qualquer pessoa',
      'Cole o link no sistema e entre com o código enviado ao seu e-mail',
    ].map((text, i) => ({ '@type': 'HowToStep', position: i + 1, name: text, text, url: `${SITE_URL}/sistemas/planilha#passo-${i + 1}` })),
  }

  return (
    <main className="container tool-page sx-guia">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href="/sistemas">Sistemas</Link>
        <span aria-hidden="true">/</span>
        <span>Ligar à planilha</span>
      </nav>

      <header className="index-header">
        <h1>Guardar os dados na sua planilha do Google</h1>
        <p className="lead">
          A demonstração funciona sem nada disso, com os dados só no seu navegador. Quando quiser usar de verdade (vários aparelhos, funcionários, e-mail a cada venda), siga os 7 passos abaixo. Leva uns 5
          minutos, é grátis e a planilha fica na sua conta.
        </p>
      </header>

      <section className="sx-guia-resumo">
        <div>
          <strong>Você vai precisar</strong>
          <span>Uma conta Google (Gmail) e um computador. No celular o editor do Apps Script não funciona bem.</span>
        </div>
        <div>
          <strong>O que você ganha</strong>
          <span>Uma aba por tabela (clientes, produtos, vendas…), uso em vários aparelhos ao mesmo tempo, login por e-mail e aviso de cada venda.</span>
        </div>
        <div>
          <strong>Seus dados</strong>
          <span>Ficam na sua planilha, na sua conta. Ninguém mais tem acesso, nem este site.</span>
        </div>
      </section>

      <section className="tool-info">
        <h2>Passo a passo</h2>
        <ol className="sx-guia-passos">
          <Passo n={1} titulo="Crie uma planilha nova" tempo="30 s">
            <p>
              Abra <a href="https://sheets.new" target="_blank" rel="noopener noreferrer">sheets.new</a> com a conta Google que vai ser a dona dos dados (a do seu negócio). Dê um nome, por exemplo “Gestão da
              minha loja”.
            </p>
          </Passo>

          <Passo n={2} titulo="Abra o Apps Script" tempo="15 s">
            <p>No menu da planilha, clique em:</p>
            <Caminho itens={['Extensões', 'Apps Script']} />
            <p className="muted small">Abre uma aba nova com um editor de código e um arquivo chamado Código.gs.</p>
          </Passo>

          <Passo n={3} titulo="Cole o código do servidor" tempo="30 s">
            <CopiarCodigo />
            <ol className="sx-guia-sub">
              <li>
                No editor, clique dentro do texto e aperte <kbd>Ctrl</kbd>+<kbd>A</kbd> e depois <kbd>Delete</kbd> para apagar o <code>function myFunction()</code> que vem de exemplo.
              </li>
              <li>
                Cole com <kbd>Ctrl</kbd>+<kbd>V</kbd> e salve com <kbd>Ctrl</kbd>+<kbd>S</kbd> (ou no ícone de disquete).
              </li>
            </ol>
            <p className="muted small">O código começa com “// Sistemas de gestão” e tem cerca de 740 linhas. Você não precisa entender nem mudar nada nele.</p>
          </Passo>

          <Passo n={4} titulo="Acerte o fuso horário" tempo="20 s">
            <p>Na barra da esquerda do editor, clique na engrenagem:</p>
            <Caminho itens={['⚙️ Configurações do projeto', 'Fuso horário', '(GMT-03:00) Horário de Brasília - São Paulo']} />
            <p className="muted small">Sem isso os horários livres da agenda podem sair errados.</p>
          </Passo>

          <Passo n={5} titulo="Rode o “configurar” e autorize" tempo="1 min">
            <ol className="sx-guia-sub">
              <li>
                Volte para o editor (ícone <b>‹›</b> na barra da esquerda). No topo, ao lado de “Depurar”, escolha a função <b>configurar</b> e clique em <b>▶ Executar</b>.
              </li>
              <li>
                Aparece <b>“Autorização necessária”</b>. Clique em <b>Revisar permissões</b> e escolha a sua conta.
              </li>
              <li>
                Aparece <b>“O Google não verificou este app”</b>. É normal, porque o app é seu. Clique em <b>Avançado</b> e depois em <b>Acessar (não seguro)</b>.
              </li>
              <li>
                Clique em <b>Permitir</b>. O código pede para mexer nesta planilha e enviar e-mails em seu nome (os códigos de login e os avisos de venda).
              </li>
            </ol>
            <p className="notice ok">
              Deu certo quando o registro de execução mostra “Pronto! Dono: seu@email…” e as abas <code>clientes</code>, <code>produtos</code>, <code>vendas</code> etc. aparecem na planilha.
            </p>
          </Passo>

          <Passo n={6} titulo="Publique como App da Web" tempo="1 min">
            <Caminho itens={['Implantar (botão azul, no alto à direita)', 'Nova implantação']} />
            <ol className="sx-guia-sub">
              <li>
                Clique na engrenagem ao lado de <b>Selecione o tipo</b> e escolha <b>App da Web</b>.
              </li>
              <li>Preencha exatamente assim:</li>
            </ol>
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr>
                    <th>Descrição</th>
                    <td>qualquer uma, ex.: “sistema”</td>
                  </tr>
                  <tr>
                    <th>Executar como</th>
                    <td>
                      <b>Eu</b> (seu e-mail)
                    </td>
                  </tr>
                  <tr>
                    <th>Quem pode acessar</th>
                    <td>
                      <b>Qualquer pessoa</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Clique em <b>Implantar</b> e copie o <b>URL do app da Web</b>. Ele é parecido com <code>https://script.google.com/macros/s/AKfy…/exec</code>.
            </p>
            <p className="muted small">
              “Qualquer pessoa” não deixa ninguém ver a planilha: só permite que o sistema converse com ela. Para ler ou gravar dados é preciso entrar com o código do e-mail. O que fica aberto é só o necessário
              para o cardápio, o agendamento online e o acompanhamento de pedido funcionarem para os seus clientes.
            </p>
          </Passo>

          <Passo n={7} titulo="Conecte o sistema" tempo="1 min">
            <ol className="sx-guia-sub">
              <li>
                Abra o sistema que você quer usar (lista abaixo) e vá em <b>⚙️ Configurações</b>, no fim do menu.
              </li>
              <li>
                Cole o link em <b>Link do App da Web</b> e coloque o <b>mesmo e-mail</b> da conta da planilha.
              </li>
              <li>
                Clique em <b>Receber código por e-mail</b>, digite os 6 números que chegaram e clique em <b>Entrar</b>.
              </li>
              <li>
                Se quiser ver as abas já preenchidas com exemplos, deixe marcado <b>“Enviar os dados desta demonstração”</b>. Para começar vazio, desmarque.
              </li>
            </ol>
            <p className="notice ok">
              Pronto quando o aviso no topo do sistema mostra <b>“Planilha em dia”</b>.
            </p>
          </Passo>
        </ol>
      </section>

      <section className="tool-info">
        <h2>Teste em 1 minuto</h2>
        <ol className="steps-list">
          <li>
            <span>
              No sistema, preencha <b>Configurações → Dados do negócio</b>: nome, Pix, WhatsApp e os e-mails que recebem as vendas. Salve.
            </span>
          </li>
          <li>
            <span>
              Faça uma venda em <b>Vender (PDV)</b> ou um pedido pelo cardápio do cliente.
            </span>
          </li>
          <li>
            <span>
              Abra a planilha: a venda aparece numa linha nova da aba <code>vendas</code>, com número, itens e pagamento.
            </span>
          </li>
          <li>
            <span>Confira o e-mail: chega o aviso da venda com os itens e o total.</span>
          </li>
          <li>
            <span>Abra o mesmo sistema em outro aparelho e conecte com o mesmo link e e-mail: os dados estão lá.</span>
          </li>
        </ol>
      </section>

      <section className="tool-info">
        <h2>Abrir um sistema para conectar</h2>
        <div className="sx-guia-links">
          {nichos.map((n) => (
            <Link key={n.slug} href={`/sistemas/${n.slug}/app#config`} className="chip">
              {n.badge} {n.nome}
            </Link>
          ))}
        </div>
        <p className="muted small">Todos podem usar a mesma planilha: as abas são compartilhadas, então dá para ter a agenda e o PDV na mesma planilha.</p>
      </section>

      <section className="tool-info">
        <h2>No dia a dia, quando precisar</h2>
        <div className="sx-recursos">
          <div className="sx-recurso">
            <strong>Dar acesso a um funcionário</strong>
            <p>
              No sistema, abra <b>Usuários → Novo usuário</b>, coloque o e-mail e o papel: <b>gerente</b> (tudo, menos virar dono) ou <b>operador</b> (vende e atende, sem ver financeiro, relatórios e
              configurações). A pessoa entra com o mesmo link e recebe o código no e-mail dela. Para tirar o acesso, desmarque “Ativo”.
            </p>
          </div>
          <div className="sx-recurso">
            <strong>Usar em outro aparelho</strong>
            <p>Abra o sistema no aparelho novo, vá em Configurações e conecte com o mesmo link e e-mail. Tudo é baixado da planilha.</p>
          </div>
          <div className="sx-recurso">
            <strong>Mudar quem recebe os e-mails</strong>
            <p>
              Configurações → Dados do negócio → <b>E-mails que recebem cada venda</b>. Separe vários por vírgula. Marque “Mandar comprovante ao cliente” para o cliente receber também.
            </p>
          </div>
          <div className="sx-recurso">
            <strong>Receber um resumo todo dia</strong>
            <p>
              No Apps Script, clique no relógio <b>⏰ Acionadores</b> → <b>Adicionar acionador</b>. Função: <b>resumoDoDia</b>; origem: <b>Baseado no tempo</b>; tipo: <b>Contador de dias</b>; horário: 22h às
              23h. Salvar.
            </p>
          </div>
          <div className="sx-recurso">
            <strong>Atualizar o código (versão nova)</strong>
            <p>
              Copie o código novo nesta página e cole no lugar do antigo. Depois: <b>Implantar → Gerenciar implantações → ✏️ editar</b> → em Versão escolha <b>Nova versão</b> → <b>Implantar</b>. O link
              continua o mesmo, não precisa mudar nada no sistema.
            </p>
          </div>
          <div className="sx-recurso">
            <strong>Desconectar todos os aparelhos</strong>
            <p>
              Se perdeu um celular ou alguém saiu da equipe: no Apps Script, escolha a função <b>sairDeTodos</b> e clique em Executar. Todos precisam entrar de novo com o código do e-mail.
            </p>
          </div>
          <div className="sx-recurso">
            <strong>Voltar para a demonstração</strong>
            <p>
              Configurações → <b>Desconectar e voltar à demonstração</b>. A planilha continua intacta; é só conectar de novo quando quiser.
            </p>
          </div>
          <div className="sx-recurso">
            <strong>Fazer backup</strong>
            <p>
              A planilha já é o backup: <b>Arquivo → Fazer uma cópia</b> ou <b>Arquivo → Fazer download</b>. No sistema também tem <b>Configurações → Baixar backup (JSON)</b>.
            </p>
          </div>
        </div>
      </section>

      <section className="tool-info">
        <h2>O que fica em cada aba</h2>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {[
                ['config', 'Configurações do negócio, uma por linha (nome, Pix, horário…)'],
                ['usuarios', 'Quem pode entrar e com qual papel'],
                ['clientes, produtos, categorias, fornecedores', 'Cadastros usados por todos os sistemas'],
                ['vendas', 'Vendas, pedidos do cardápio, mesas e orçamentos'],
                ['caixas, caixa_mov', 'Abertura e fechamento de caixa, sangrias e suprimentos'],
                ['estoque_mov', 'Entradas e saídas de estoque (o saldo é a soma)'],
                ['lancamentos', 'Contas a pagar e a receber: fiado, mensalidades, despesas'],
                ['agendamentos, profissionais', 'Agenda e quem atende'],
                ['ordens', 'Ordens de serviço'],
                ['planos, matriculas, presencas', 'Academia e escola'],
                ['pets, vacinas', 'Pet shop'],
                ['leads, atividades', 'CRM e funil de vendas'],
              ].map(([aba, texto]) => (
                <tr key={aba}>
                  <th>
                    <code>{aba}</code>
                  </th>
                  <td className="sx-quebra">{texto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          As colunas <code>id</code>, <code>criado_em</code>, <code>atualizado_em</code>, <code>_rev</code> e <code>excluido</code> são de controle: não apague nem edite. Pode criar abas suas, fórmulas e gráficos à
          vontade em outras abas.
        </p>
      </section>

      <section className="tool-info">
        <h2>Deu algum erro?</h2>
        <div className="faq">
          {problemas.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tool-info prose">
        <h2>Limites do plano grátis do Google</h2>
        <p>
          Uma conta Gmail comum manda cerca de 100 e-mails por dia pelo Apps Script (contas do Google Workspace, 1.500). Passando disso, as vendas continuam sendo gravadas, só o aviso por e-mail para até o dia
          seguinte. A planilha aguenta com folga o movimento de um pequeno negócio (dezenas de milhares de linhas). Se um dia ficar lenta, guarde uma cópia do arquivo e comece uma planilha nova seguindo este mesmo guia.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </main>
  )
}
