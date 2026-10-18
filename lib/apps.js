// Apps completos que rodam no navegador (/apps). Cada um tem página de apresentação e o app em /apps/<slug>/app.
export const apps = [
  {
    slug: 'treino',
    nome: 'Treino',
    titulo: 'Treino: diário de academia com progressão automática',
    curto: 'Rotinas, séries, descanso, recordes, progressão automática e evolução do corpo. Funciona offline.',
    icone: '🏋️',
    cor: '#4ade80',
    descricao:
      'App de treino de musculação grátis: monte rotinas ou use planos prontos (PPL, Superior/Inferior, Corpo inteiro, 5×5), registre séries com cronômetro de descanso, bata recordes e veja a evolução. Funciona offline.',
    recursos: [
      ['Rotinas do seu jeito', 'Dias fixos da semana ou rotação A/B/C. Planos prontos: Push/Pull/Legs, Superior/Inferior, Corpo inteiro e 5×5.'],
      ['876 exercícios', 'Biblioteca pública com fotos de cada movimento, filtro por músculo no mapa do corpo, equipamento e nível. Crie os seus com foto ou vídeo.'],
      ['Treino guiado', 'Cargas já preenchidas, descanso com som, vibração e tela piscando, recorde na hora, cronômetro para prancha e tela sempre acesa.'],
      ['Séries de todo tipo', 'Aquecimento, drop set, rest-pause, até a falha, pirâmide e supersérie. Unilateral (esquerda/direita) e peso do corpo com cinto.'],
      ['Progressão automática', 'Linear, Greyskull, dupla e tripla progressão ou por tempo, com explicação de cada sugestão e deload quando estagnar.'],
      ['Evolução', 'Curva de 1RM, equilíbrio entre levantamentos, mapa de calor do ano, mapa muscular de volume e recuperação, peso e fotos antes e depois.'],
      ['Calculadora de anilhas', 'Diz quais anilhas pôr em cada lado da barra, respeitando as que a sua academia tem.'],
      ['Seus dados são seus', 'Tudo fica no aparelho. Importa do Strong, Hevy, FitNotes e Apple Saúde; exporta backup e planilha.'],
    ],
    faq: [
      ['Precisa criar conta?', 'Não. Os dados ficam no seu navegador (IndexedDB). Para trocar de aparelho, baixe o backup em Ajustes e importe no outro.'],
      ['Funciona sem internet?', 'Sim. Depois de abrir uma vez com internet, dá para instalar na tela inicial e usar na academia sem sinal.'],
      ['Como a carga é sugerida?', 'Pela regra de progressão de cada exercício e pelo que você fez no último treino. A sugestão vem com o motivo, e você pode mudar à vontade.'],
      ['De onde vêm os exercícios?', 'Do Free Exercise DB, uma base pública (domínio público) com mais de 800 exercícios e fotos. Os nomes mais comuns foram traduzidos.'],
    ],
  },
  {
    slug: 'editor-de-video',
    nome: 'Editor de vídeo',
    titulo: 'Editor de vídeo online grátis, sem marca d’água',
    curto: 'Linha do tempo com várias trilhas, cortes, textos, máscaras, keyframes e exportação em MP4.',
    icone: '🎬',
    cor: '#a78bfa',
    descricao:
      'Editor de vídeo online grátis e sem marca d’água: linha do tempo com várias trilhas, cortar e dividir, textos com mais de mil fontes, figurinhas, máscaras, animação por keyframes, velocidade e exportação em MP4. Tudo no navegador, sem enviar o vídeo.',
    recursos: [
      ['Linha do tempo de verdade', 'Trilhas de vídeo, imagem, áudio, texto e figurinhas. Mova entre trilhas, apare pelas bordas, divida (S), corte antes ou depois da agulha (Q/W), com ímã e modo ripple.'],
      ['Seleção e atalhos', 'Ctrl+clique, seleção por caixa, Ctrl+A, copiar, colar e duplicar, desfazer e refazer ilimitado, e os atalhos J/K/L, setas por quadro e Shift+setas.'],
      ['Prévia interativa', 'Arraste, gire e redimensione direto na imagem, com zoom e navegação na prévia. Quadro em 16:9, 9:16, 1:1, 4:5 ou tamanho livre, e fundo de cor, degradê ou vídeo desfocado.'],
      ['Animação com keyframes', 'Posição, escala, rotação, opacidade, desfoque e volume, com curvas de aceleração e editor bezier. Copie e cole keyframes entre clipes.'],
      ['Textos e figurinhas', 'Qualquer fonte do Google Fonts, contorno, fundo, sombra e espaçamento. Emojis, bandeiras e formas, e legendas importadas de arquivos SRT ou VTT.'],
      ['Máscaras e efeitos', 'Retângulo, elipse, estrela, coração, losango, divisão e barras de cinema, com borda suave, contorno e inversão. Desfoque, brilho, contraste, saturação e 16 modos de mesclagem.'],
      ['Velocidade e som', 'De 0,1× a 8×, mantendo o tom da voz, volume animado, forma de onda na linha do tempo e trilhas silenciáveis.'],
      ['MP4 sem marca d’água', 'Exporta em H.264 + AAC até 4K, quadro a quadro com o codificador do próprio navegador. Projetos e vídeos ficam guardados no seu aparelho.'],
    ],
    faq: [
      ['Meu vídeo é enviado para algum servidor?', 'Não. A edição e a exportação acontecem no seu navegador, e os projetos ficam guardados nele (IndexedDB). Por isso funciona até com vídeos pessoais ou de trabalho.'],
      ['Tem marca d’água ou limite de tempo?', 'Não tem marca d’água nem limite. O limite prático é o espaço e a memória do seu aparelho.'],
      ['Em quais navegadores exporta MP4?', 'Chrome, Edge, Opera e Safari recentes exportam MP4 rápido (WebCodecs). Nos outros, o vídeo é gravado em tempo real em WebM.'],
      ['Dá para usar no celular?', 'Dá para montar e exportar vídeos curtos, mas a experiência completa (atalhos, linha do tempo larga) é melhor no computador.'],
    ],
  },
  {
    slug: 'globo',
    nome: 'Globo ao vivo',
    titulo: 'Globo ao vivo: aviões, satélites, terremotos e clima em 3D',
    curto: 'Globo 3D com voos em tempo real, satélites, terremotos, incêndios, radar de chuva e filtros de visão noturna e térmica.',
    icone: '🌍',
    cor: '#60a5fa',
    descricao:
      'Globo 3D grátis com dados abertos ao vivo: aviões em tempo real (inclusive militares e em emergência), satélites e a ISS, terremotos, incêndios, vulcões, radar de chuva, nuvens, vento e furacões, com filtros de visão noturna, térmica e CRT.',
    recursos: [
      ['Aviões em tempo real', 'Voos perto de onde você olha, aviões militares do mundo todo e alertas de emergência (squawk 7500, 7600 e 7700), com rastro, cor por altitude e dados do voo.'],
      ['Satélites e a ISS', 'Posição calculada a cada segundo (SGP4) para estações, GPS, Starlink e mais, com a órbita desenhada e a previsão de quando o satélite passa sobre você.'],
      ['Terra e clima', 'Terremotos do USGS, incêndios, vulcões e tempestades da NASA, radar de chuva com linha do tempo, nuvens, vento agora e furacões.'],
      ['Modos de visão', 'Normal, CRT, visão noturna, FLIR, térmico, noir e chuvisco (teclas 1 a 7), HUD com coordenadas e caixas de detecção sobre aviões e satélites.'],
      ['Seguir e cabine', 'Clique para seguir um avião ou satélite, ou entre na visão da cabine e voe junto.'],
      ['Ferramentas', 'Busca por lugar ou coordenadas, marcar pontos, medir distância e área, rota de carro, tours guiados, link da vista e comandos de voz.'],
      ['Cidades', 'Rádios ao vivo do mundo todo, bicicletas compartilhadas com vagas por estação e câmeras e radares mapeados no OpenStreetMap.'],
      ['Mapas', 'Satélite, satélite com nomes, OpenStreetMap, escuro, Blue Marble e luzes da noite da NASA, dia e noite com o sol real, e cidades em 3D do Google com a sua chave.'],
    ],
    faq: [
      ['Os dados são em tempo real?', 'Sim, dentro do que cada fonte aberta oferece: aviões atualizam a cada 10 segundos, satélites a cada segundo, terremotos a cada 2 minutos e o radar a cada 10 minutos.'],
      ['Preciso de conta ou chave?', 'Não. Todas as camadas usam fontes abertas sem chave. Só as cidades em 3D do Google pedem a sua própria chave da API, que fica guardada no seu navegador.'],
      ['Por que não aparecem aviões no meio do oceano?', 'Os dados vêm de receptores ADS-B voluntários em terra. Longe da costa a cobertura é pequena.'],
      ['Funciona no celular?', 'Funciona, mas o globo 3D usa bastante a placa de vídeo. Em aparelhos simples, deixe poucas camadas ligadas.'],
    ],
  },
]

export const getApp = (slug) => apps.find((a) => a.slug === slug)
