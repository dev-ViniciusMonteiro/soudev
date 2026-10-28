'use client'

import dynamic from 'next/dynamic'

const loading = () => (
  <p className="muted tool-loading">
    <span className="spinner" aria-hidden="true" /> Carregando ferramenta…
  </p>
)

const components = {
  'pdf-para-word': dynamic(() => import('./tools/PdfWord'), { loading }),
  'juntar-pdf': dynamic(() => import('./tools/JuntarPdf'), { loading }),
  'jpg-para-pdf': dynamic(() => import('./tools/JpgPdf'), { loading }),
  'comprimir-pdf': dynamic(() => import('./tools/ComprimirPdf'), { loading }),
  'remover-fundo': dynamic(() => import('./tools/RemoverFundo'), { loading }),
  'calculadora-rescisao': dynamic(() => import('./tools/Rescisao'), { loading }),
  'calculadora-salario-liquido': dynamic(() => import('./tools/SalarioLiquido'), { loading }),
  'calculadora-ferias-13': dynamic(() => import('./tools/Ferias13'), { loading }),
  'juros-compostos': dynamic(() => import('./tools/JurosCompostos'), { loading }),
  'calculadora-porcentagem': dynamic(() => import('./tools/Porcentagem'), { loading }),
  'calculadora-imc': dynamic(() => import('./tools/Imc'), { loading }),
  'correcao-exercicios-camera': dynamic(() => import('./tools/CorrecaoTreino'), { loading }),
  'regra-de-tres': dynamic(() => import('./tools/RegraDeTres'), { loading }),
  'calculadora-datas': dynamic(() => import('./tools/Datas'), { loading }),
  'contador-caracteres': dynamic(() => import('./tools/ContadorCaracteres'), { loading }),
  'gerador-senha': dynamic(() => import('./tools/GeradorSenha'), { loading }),
  'gerador-qr-code': dynamic(() => import('./tools/QrCode'), { loading }),
  'gerador-recibo': dynamic(() => import('./tools/Recibo'), { loading }),
  'gerador-cpf': dynamic(() => import('./tools/GeradorCpf'), { loading }),
  'gerador-cnpj': dynamic(() => import('./tools/GeradorCnpj'), { loading }),
  'dividir-pdf': dynamic(() => import('./tools/DividirPdf'), { loading }),
  'assinar-pdf': dynamic(() => import('./tools/AssinarPdf'), { loading }),
  'heic-para-jpg': dynamic(() => import('./tools/HeicJpg'), { loading }),
  'calculadora-horas-extras': dynamic(() => import('./tools/HorasExtras'), { loading }),
  'calculadora-seguro-desemprego': dynamic(() => import('./tools/SeguroDesemprego'), { loading }),
  'simulador-financiamento': dynamic(() => import('./tools/Financiamento'), { loading }),
  'consulta-cep': dynamic(() => import('./tools/ConsultaCep'), { loading }),
  sorteador: dynamic(() => import('./tools/Sorteador'), { loading }),
  'verificar-site-confiavel': dynamic(() => import('./tools/VerificarSite'), { loading }),
  'conferir-boleto': dynamic(() => import('./tools/ConferirBoleto'), { loading }),
  'verificar-arquivo-virus': dynamic(() => import('./tools/VerificarArquivo'), { loading }),
  'consulta-ddd': dynamic(() => import('./tools/ConsultaDdd'), { loading }),
  'consulta-cnpj': dynamic(() => import('./tools/ConsultaCnpj'), { loading }),
  'socorro-perto-de-mim': dynamic(() => import('./tools/SocorroPerto'), { loading }),
  'alerta-clima': dynamic(() => import('./tools/AlertaClima'), { loading }),
  'tabela-fipe': dynamic(() => import('./tools/TabelaFipe'), { loading }),
  'comparador-investimentos': dynamic(() => import('./tools/OndeInvestir'), { loading }),
  'conversor-moedas': dynamic(() => import('./tools/ConversorMoedas'), { loading }),
  'calculadora-dias-uteis': dynamic(() => import('./tools/DiasUteis'), { loading }),
  feriados: dynamic(() => import('./tools/Feriados'), { loading }),
  'consulta-isbn': dynamic(() => import('./tools/ConsultaIsbn'), { loading }),
  'simulador-urna-eletronica': dynamic(() => import('./tools/UrnaSimulada'), { loading }),
  'gerador-de-curriculo': dynamic(() => import('./tools/GeradorCurriculo'), { loading }),
  'buscar-filmes-e-series': dynamic(() => import('./tools/BuscadorMidia'), { loading }),
  'gerador-de-convite': dynamic(() => import('./tools/GeradorConvite'), { loading }),
  'medir-objeto-na-foto': dynamic(() => import('./tools/MedidorTamanho'), { loading }),
  'restaurantes-perto-de-mim': dynamic(() => import('./tools/RestaurantesPerto'), { loading }),
  'cronometro-de-poker': dynamic(() => import('./tools/PokerTimer'), { loading }),
  'tarefas-do-dia': dynamic(() => import('./tools/TarefasDia'), { loading }),
  'controle-financeiro-mensal': dynamic(() => import('./tools/Financas'), { loading }),
}

export default function ToolRenderer({ slug }) {
  const Tool = components[slug]
  return Tool ? <Tool /> : null
}
