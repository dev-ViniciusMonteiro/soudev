// Conteúdo dos banners gerados (jogos, apps e sistemas): título, chamada, selos e a cena da direita.
// A cena é HTML/SVG desenhado (jogos) ou a tela real do produto num monitor (apps e sistemas, campo "tela").
// Praça e Corte Neon têm banners feitos à mão (public/banners/jogos) e não estão aqui.

const em = (e, tam, x, y, extra = '') => `<span class="em" style="font-size:${tam}px;left:${x}px;top:${y}px;${extra}">${e}</span>`;

export const banners = [
  /* ---------- Jogos ---------- */
  {
    tipo: 'jogos',
    slug: 'monkepo',
    tag: 'JOGO ONLINE · RPG',
    titulo: 'MonKePo',
    chamada: ['Capture monstros e', '*dispute o ranking!*'],
    cores: ['#22c55e', '#facc15'],
    selos: [['🎯', 'Capture monstros'], ['⚔️', 'Batalhas por turno'], ['🌐', 'Online com amigos'], ['🏆', 'Ranking geral']],
    cena: `
      <div class="grama"></div>
      <div class="orbe" style="left:430px;top:250px"></div>
      ${em('🐉', 230, 520, 120, 'transform:rotate(-8deg)')}
      ${em('🦊', 170, 200, 330)}
      ${em('🐢', 150, 760, 380)}
      ${em('✨', 70, 380, 120)}${em('✨', 50, 820, 200)}`,
  },
  {
    tipo: 'jogos',
    slug: 'cidade-neon',
    tag: 'JOGO 3D · MUNDO ABERTO',
    titulo: 'Cidade Neon',
    chamada: ['Entregas, corridas e', '*fuga da polícia!*'],
    cores: ['#ec4899', '#22d3ee'],
    selos: [['🗺️', 'Mundo aberto'], ['🏁', 'Corridas'], ['🔥', 'Nitro'], ['🚓', 'Fuja da polícia']],
    cena: `
      <svg class="cidade" viewBox="0 0 1000 768" preserveAspectRatio="none">
        <defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e0b3a"/><stop offset="1" stop-color="#3b0a45"/></linearGradient></defs>
        ${[[40, 220, 110], [170, 140, 90], [280, 260, 120], [420, 120, 100], [540, 200, 130], [690, 160, 95], [800, 240, 120], [930, 180, 80]]
          .map(([x, h, w], i) => `<rect x="${x}" y="${560 - h - 200}" width="${w}" height="${h + 200}" fill="#120a24" stroke="${i % 2 ? '#22d3ee' : '#ec4899'}" stroke-width="3"/>` + Array.from({ length: 8 }, (_, k) => `<rect x="${x + 14 + (k % 3) * 30}" y="${560 - h - 170 + Math.floor(k / 3) * 46}" width="14" height="20" fill="${(k + i) % 3 ? '#fde047' : '#22d3ee'}" opacity="0.8"/>`).join(''))
          .join('')}
        <polygon points="0,768 380,560 620,560 1000,768" fill="#0b0618"/>
        <line x1="500" y1="560" x2="500" y2="768" stroke="#fde047" stroke-width="8" stroke-dasharray="30 26"/>
        <line x1="380" y1="560" x2="0" y2="768" stroke="#ec4899" stroke-width="6"/><line x1="620" y1="560" x2="1000" y2="768" stroke="#22d3ee" stroke-width="6"/>
      </svg>
      ${em('🏎️', 220, 390, 470, 'transform:scaleX(-1)')}
      ${em('🚓', 120, 120, 560)}
      <div class="luz" style="left:150px;top:520px;background:#ef4444"></div><div class="luz" style="left:230px;top:520px;background:#3b82f6"></div>`,
  },
  {
    tipo: 'jogos',
    slug: 'pesca-no-gelo',
    tag: 'JOGO CASUAL',
    titulo: 'Pesca no Gelo',
    chamada: ['Fisgue peixes', '*pelo buraco no gelo!*'],
    cores: ['#38bdf8', '#a5f3fc'],
    selos: [['🎣', 'Desça a linha'], ['🐟', '60 peixes'], ['🦈', 'Fuja dos tubarões'], ['🏆', 'Garoupa gigante']],
    cena: `
      <div class="gelo"></div>
      <div class="buraco"></div>
      <div class="linha" style="left:500px;top:40px;height:420px"></div>
      ${em('🎣', 170, 470, 10)}
      ${em('🐟', 120, 300, 520)}${em('🐠', 100, 640, 600)}${em('🦈', 150, 700, 430)}${em('🐡', 90, 180, 640)}
      ${em('❄️', 60, 120, 120)}${em('❄️', 44, 860, 90)}${em('🐧', 130, 800, 220)}`,
  },
  {
    tipo: 'jogos',
    slug: 'escritorio-ia',
    tag: 'SIMULAÇÃO COM IA',
    titulo: 'Escritório IA',
    chamada: ['Contrate agentes de IA', '*e dê as tarefas!*'],
    cores: ['#a78bfa', '#38bdf8'],
    selos: [['🤖', 'Até 6 agentes'], ['📋', 'Dê tarefas'], ['👔', 'Líder revisa'], ['✅', 'Aprove o trabalho']],
    tela: 'jogo-escritorio-ia',
    recorte: { esquerda: 0, topo: 60, largura: 1090, altura: 840 },
  },
  {
    tipo: 'jogos',
    slug: 'vinte-e-um',
    tag: 'JOGO ONLINE · CARTAS',
    titulo: '21 contra a Banca',
    chamada: ['Some 21 e', '*vença a banca!*'],
    cores: ['#22c55e', '#facc15'],
    selos: [['🃏', 'Blackjack 3D'], ['👥', 'Até 3 jogadores'], ['🌐', 'Local ou online'], ['🪙', 'Fichas e apostas']],
    cena: `
      <div class="mesa"></div>
      <div class="carta" style="left:330px;top:150px;transform:rotate(-14deg)"><b>A</b><i>♠</i></div>
      <div class="carta vermelha" style="left:520px;top:130px;transform:rotate(10deg)"><b>K</b><i>♥</i></div>
      <div class="ficha" style="left:180px;top:520px;background:#dc2626"></div><div class="ficha" style="left:230px;top:500px;background:#2563eb"></div><div class="ficha" style="left:780px;top:540px;background:#16a34a"></div>
      <div class="numero">21</div>`,
  },
  {
    tipo: 'jogos',
    slug: 'corta-fruta',
    tag: 'JOGO DE CÂMERA',
    titulo: 'Corta Fruta',
    chamada: ['Corte as frutas', '*com as suas mãos!*'],
    cores: ['#f97316', '#84cc16'],
    selos: [['📷', 'Jogue pela câmera'], ['🖐️', 'Use as mãos'], ['🍉', 'Corte as frutas'], ['💣', 'Fuja das bombas']],
    cena: `
      <div class="corte" style="left:150px;top:400px;width:760px;transform:rotate(-24deg)"></div>
      ${em('🍉', 230, 300, 170, 'transform:rotate(-15deg)')}${em('🍍', 160, 660, 80)}${em('🍓', 130, 140, 470)}${em('🍊', 150, 720, 430)}${em('🥝', 110, 540, 520)}${em('💣', 110, 870, 250)}
      <div class="respingo" style="left:420px;top:320px;background:#ef4444"></div><div class="respingo" style="left:610px;top:270px;background:#f59e0b;width:60px;height:60px"></div>`,
  },
  {
    tipo: 'jogos',
    slug: 'pedra-papel-tesoura',
    tag: 'JOGO DE CÂMERA · IA',
    titulo: 'Pedra, Papel e Tesoura',
    chamada: ['Mostre a mão', '*e vença a máquina!*'],
    cores: ['#facc15', '#ec4899'],
    selos: [['📷', 'Jogue pela câmera'], ['✊', 'Mostre a mão'], ['🧠', 'A IA aprende'], ['🏆', 'Melhor de 5']],
    cena: `
      ${em('✊', 210, 140, 230, 'transform:rotate(-12deg)')}${em('✋', 210, 430, 110)}${em('✌️', 210, 690, 250, 'transform:rotate(12deg)')}
      <div class="vs">VS</div>
      ${em('🤖', 170, 420, 470)}`,
  },
  {
    tipo: 'jogos',
    slug: 'muro-de-poses',
    tag: 'JOGO DE CÂMERA',
    titulo: 'Muro de Poses',
    chamada: ['Faça a pose', '*antes do muro chegar!*'],
    cores: ['#22d3ee', '#a855f7'],
    selos: [['📷', 'Jogue pela câmera'], ['🕺', 'Imite a pose'], ['🧱', 'Passe pelo muro'], ['🎉', 'Diversão em grupo']],
    cena: `
      <svg class="muro" viewBox="0 0 700 640">
        <defs><mask id="buraco"><rect width="700" height="640" fill="white"/>
          <g fill="black"><circle cx="350" cy="140" r="52"/><path d="M300 200 h100 l120 -110 l40 40 l-120 130 v140 l60 180 h-60 l-40 -150 h-0 l-40 150 h-60 l60 -180 v-140 l-120 -130 l40 -40 z"/></g></mask></defs>
        <rect width="700" height="640" rx="24" fill="#1e1b4b" mask="url(#buraco)" stroke="#22d3ee" stroke-width="6"/>
        ${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${(i + 1) * 92}" x2="700" y2="${(i + 1) * 92}" stroke="#312e81" stroke-width="4" mask="url(#buraco)"/>`).join('')}
      </svg>`,
  },
  {
    tipo: 'jogos',
    slug: 'boca-gulosa',
    tag: 'JOGO DE CÂMERA',
    titulo: 'Boca Gulosa',
    chamada: ['Abra a boca', '*e coma tudo!*'],
    cores: ['#f43f5e', '#facc15'],
    selos: [['📷', 'Jogue pela câmera'], ['😮', 'Abra a boca'], ['🍔', 'Coma o que cai'], ['🌶️', 'Fuja da pimenta']],
    cena: `
      ${em('😮', 330, 330, 330)}
      ${em('🍔', 120, 260, 60)}${em('🍩', 110, 520, 20)}${em('🍕', 120, 720, 110)}${em('🍦', 100, 140, 250)}${em('🌶️', 110, 820, 330)}
      <div class="proibido" style="left:810px;top:320px"></div>`,
  },
  {
    tipo: 'jogos',
    slug: 'fuga-no-morro',
    tag: 'JOGO DE CÂMERA · CORRIDA',
    titulo: 'Fuga no Morro',
    chamada: ['Corra pela favela', '*com o seu corpo!*'],
    cores: ['#f59e0b', '#ef4444'],
    selos: [['📷', 'Jogue pela câmera'], ['🦘', 'Pule e abaixe'], ['↔️', 'Troque de pista'], ['🚓', 'Fuja da viatura']],
    cena: `
      <svg class="morro" viewBox="0 0 1000 768" preserveAspectRatio="none">
        ${[[0, 300, '#f97316'], [130, 250, '#22c55e'], [250, 330, '#eab308'], [380, 220, '#3b82f6'], [520, 300, '#ef4444'], [660, 240, '#a855f7'], [790, 320, '#14b8a6'], [900, 260, '#f97316'],
          [60, 420, '#3b82f6'], [200, 400, '#ef4444'], [340, 440, '#a855f7'], [480, 410, '#22c55e'], [620, 430, '#eab308'], [760, 400, '#f97316'], [880, 440, '#ef4444']]
          .map(([x, y, c]) => `<rect x="${x}" y="${y}" width="120" height="110" fill="${c}" opacity="0.85"/><rect x="${x + 20}" y="${y + 30}" width="28" height="28" fill="#0b0618"/><rect x="${x + 70}" y="${y + 30}" width="28" height="28" fill="#fde047" opacity="0.7"/>`)
          .join('')}
        <polygon points="0,768 420,560 580,560 1000,768" fill="#3f2a1d"/>
      </svg>
      ${em('🏃', 230, 400, 370, 'transform:scaleX(-1)')}
      ${em('🚓', 130, 760, 560)}
      <div class="luz" style="left:780px;top:520px;background:#ef4444"></div><div class="luz" style="left:860px;top:520px;background:#3b82f6"></div>`,
  },
  {
    tipo: 'jogos',
    slug: 'nocaute',
    tag: 'JOGO DE CÂMERA · LUTA',
    titulo: 'Nocaute',
    chamada: ['Lute boxe', '*com o seu corpo!*'],
    cores: ['#ef4444', '#facc15'],
    selos: [['📷', 'Jogue pela câmera'], ['🥊', 'Socos de verdade'], ['🛡️', 'Guarda e esquiva'], ['👥', 'Contra um amigo']],
    cena: `
      <div class="impacto"></div>
      ${em('🥊', 280, 200, 230, 'transform:rotate(-20deg)')}${em('🥊', 280, 560, 200, 'transform:scaleX(-1) rotate(-20deg)')}
      <div class="ko">K.O.!</div>`,
  },
  {
    tipo: 'jogos',
    slug: 'cubo-no-ritmo',
    tag: 'JOGO DE RITMO',
    titulo: 'Cubo no Ritmo',
    chamada: ['Pule no ritmo', '*da música!*'],
    cores: ['#22d3ee', '#84cc16'],
    selos: [['🎵', 'No ritmo da música'], ['🟦', '8 modos de jogo'], ['🛠️', 'Editor de fases'], ['⭐', 'Fases da comunidade']],
    cena: `
      <svg class="cubo" viewBox="0 0 1000 768">
        <rect x="0" y="560" width="1000" height="208" fill="#0b2530" stroke="#22d3ee" stroke-width="5"/>
        ${[220, 520, 760].map((x) => `<polygon points="${x},560 ${x + 50},470 ${x + 100},560" fill="#0f172a" stroke="#84cc16" stroke-width="6"/>`).join('')}
        <rect x="620" y="380" width="160" height="40" fill="#0f172a" stroke="#22d3ee" stroke-width="5"/>
        <g transform="translate(400 300) rotate(25)"><rect x="-70" y="-70" width="140" height="140" rx="10" fill="#22d3ee" stroke="#ecfeff" stroke-width="6"/><rect x="-30" y="-30" width="60" height="60" fill="#0e7490"/></g>
        <path d="M120 470 Q 260 230 340 280" stroke="#22d3ee" stroke-width="6" fill="none" stroke-dasharray="14 14" opacity="0.7"/>
      </svg>
      ${em('🎵', 90, 760, 120)}${em('🎶', 80, 120, 140)}`,
  },

  /* ---------- Apps ---------- */
  { tipo: 'apps', slug: 'treino', tag: 'APP GRÁTIS', titulo: 'Treino', chamada: ['Seu diário de academia', '*com progressão automática*'], cores: ['#4ade80', '#22d3ee'], selos: [['🏋️', 'Rotinas e planos'], ['⏱️', 'Descanso com alarme'], ['📈', 'Progressão automática'], ['📴', 'Funciona offline']], tela: 'app-treino' },
  { tipo: 'apps', slug: 'editor-de-video', tag: 'APP GRÁTIS', titulo: 'Editor de Vídeo', chamada: ['Edite vídeos', '*direto no navegador*'], cores: ['#f43f5e', '#a78bfa'], selos: [['🎬', 'Várias trilhas'], ['✂️', 'Cortes e textos'], ['🎭', 'Máscaras e keyframes'], ['💾', 'Exporta em MP4']], tela: 'app-editor-de-video' },
  { tipo: 'apps', slug: 'globo', tag: 'APP AO VIVO', titulo: 'Globo ao Vivo', chamada: ['O planeta em', '*tempo real*'], cores: ['#38bdf8', '#22c55e'], selos: [['✈️', 'Voos ao vivo'], ['🛰️', 'Satélites'], ['🌋', 'Terremotos e incêndios'], ['🌧️', 'Radar de chuva']], tela: 'app-globo' },
  { tipo: 'apps', slug: 'documentador', tag: 'APP COM IA', titulo: 'Documentador', chamada: ['Suas anotações viram', '*documentação pronta*'], cores: ['#a78bfa', '#f472b6'], selos: [['📝', 'Cole as anotações'], ['🤖', 'Agentes de IA'], ['📄', 'GMUD e técnica'], ['🎯', 'No seu padrão']], tela: 'app-documentador' },
  { tipo: 'apps', slug: 'imoveis', tag: 'APP GRÁTIS', titulo: 'Radar de Imóveis', chamada: ['Imóveis perto de você', '*com dados públicos*'], cores: ['#f59e0b', '#22c55e'], selos: [['📍', 'Pela localização'], ['🏠', 'Ficha do imóvel'], ['📊', 'Dados públicos'], ['🔎', 'Ache o proprietário']], tela: 'app-imoveis' },
  { tipo: 'apps', slug: 'ppfd', tag: 'APP GRÁTIS', titulo: 'Medidor PPFD', chamada: ['Meça a luz do cultivo', '*pelo celular*'], cores: ['#a3e635', '#f472b6'], selos: [['📷', 'Pela câmera'], ['💡', 'LED de cultivo'], ['🌱', 'PPFD e DLI'], ['🌈', 'Pelo espectro']], tela: 'app-ppfd' },

  /* ---------- Sistemas ---------- */
  { tipo: 'sistemas', slug: 'mei-na-mao', tag: 'SISTEMA GRÁTIS', titulo: 'MEI na Mão', chamada: ['Controle o seu MEI', '*falando com o celular*'], cores: ['#22c55e', '#facc15'], selos: [['🎤', 'Comandos por voz'], ['💰', 'Vendas e gastos'], ['📄', 'DAS e limite'], ['📊', 'Relatórios']], tela: 'sis-mei-na-mao' },
  { tipo: 'sistemas', slug: 'restaurante-delivery', tag: 'SISTEMA GRÁTIS', titulo: 'Restaurante e Delivery', chamada: ['Cardápio online', '*e pedidos na hora*'], cores: ['#f97316', '#facc15'], selos: [['🍔', 'Cardápio online'], ['🛵', 'Delivery'], ['🍽️', 'Mesas e comandas'], ['💳', 'Caixa e PDV']], tela: 'sis-restaurante-delivery' },
  { tipo: 'sistemas', slug: 'mercadinho-pdv', tag: 'SISTEMA GRÁTIS', titulo: 'Mercadinho e PDV', chamada: ['Venda rápido', '*e controle o estoque*'], cores: ['#22c55e', '#38bdf8'], selos: [['🛒', 'PDV rápido'], ['📦', 'Estoque'], ['💵', 'Caixa'], ['📈', 'Relatórios']], tela: 'sis-mercadinho-pdv' },
  { tipo: 'sistemas', slug: 'barbearia-salao', tag: 'SISTEMA GRÁTIS', titulo: 'Barbearia e Salão', chamada: ['Agenda cheia', '*com agendamento online*'], cores: ['#a78bfa', '#f472b6'], selos: [['📅', 'Agenda online'], ['💈', 'Por profissional'], ['💰', 'Comissões'], ['💬', 'Lembrete no WhatsApp']], tela: 'sis-barbearia-salao' },
  { tipo: 'sistemas', slug: 'assistencia-tecnica', tag: 'SISTEMA GRÁTIS', titulo: 'Assistência Técnica', chamada: ['Ordens de serviço', '*do orçamento à entrega*'], cores: ['#38bdf8', '#facc15'], selos: [['🔧', 'Ordem de serviço'], ['📝', 'Orçamento'], ['🔎', 'Cliente acompanha'], ['🧾', 'Garantia e laudo']], tela: 'sis-assistencia-tecnica' },
  { tipo: 'sistemas', slug: 'academia-studio', tag: 'SISTEMA GRÁTIS', titulo: 'Academia e Studio', chamada: ['Alunos, planos', '*e mensalidades*'], cores: ['#f472b6', '#22d3ee'], selos: [['🏋️', 'Alunos e planos'], ['💳', 'Mensalidades'], ['✅', 'Check-in'], ['📊', 'Inadimplência']], tela: 'sis-academia-studio' },
  { tipo: 'sistemas', slug: 'petshop', tag: 'SISTEMA GRÁTIS', titulo: 'Pet Shop', chamada: ['Banho, tosa', '*e vacinas em dia*'], cores: ['#f59e0b', '#22c55e'], selos: [['🐶', 'Pets e tutores'], ['🛁', 'Banho e tosa'], ['💉', 'Vacinas'], ['🛒', 'Loja e PDV']], tela: 'sis-petshop' },
  { tipo: 'sistemas', slug: 'crm-vendas', tag: 'SISTEMA GRÁTIS', titulo: 'CRM e Vendas', chamada: ['Clientes e propostas', '*no funil certo*'], cores: ['#22d3ee', '#a78bfa'], selos: [['🎯', 'Funil de vendas'], ['🤝', 'Clientes'], ['📄', 'Propostas'], ['🔔', 'Lembretes']], tela: 'sis-crm-vendas' },
];
