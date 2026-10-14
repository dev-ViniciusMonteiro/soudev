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
  'regra-de-tres': dynamic(() => import('./tools/RegraDeTres'), { loading }),
  'calculadora-datas': dynamic(() => import('./tools/Datas'), { loading }),
  'contador-caracteres': dynamic(() => import('./tools/ContadorCaracteres'), { loading }),
  'gerador-senha': dynamic(() => import('./tools/GeradorSenha'), { loading }),
  'gerador-qr-code': dynamic(() => import('./tools/QrCode'), { loading }),
  'gerador-recibo': dynamic(() => import('./tools/Recibo'), { loading }),
  'gerador-cpf': dynamic(() => import('./tools/GeradorCpf'), { loading }),
  'gerador-cnpj': dynamic(() => import('./tools/GeradorCnpj'), { loading }),
}

export default function ToolRenderer({ slug }) {
  const Tool = components[slug]
  return Tool ? <Tool /> : null
}
