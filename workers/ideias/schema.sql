-- Tabela única de ideias. Rode uma vez com:
--   wrangler d1 execute soudev-ideias --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS ideias (
  id          TEXT PRIMARY KEY,
  mensagem    TEXT NOT NULL,
  nome        TEXT,                        -- opcional (anônimo por padrão)
  pagina      TEXT,                        -- de qual página do site veio
  ip_hash     TEXT,                        -- hash do IP (anti-spam/rate-limit), nunca o IP real
  user_agent  TEXT,
  status      TEXT NOT NULL DEFAULT 'nova', -- nova | lida | arquivada
  criado_em   INTEGER NOT NULL             -- epoch em milissegundos
);

CREATE INDEX IF NOT EXISTS idx_ideias_criado ON ideias (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ideias_status ON ideias (status);
CREATE INDEX IF NOT EXISTS idx_ideias_ip ON ideias (ip_hash, criado_em);

-- Comentários públicos (aparecem no próprio site, não dependem do admin).
CREATE TABLE IF NOT EXISTS comentarios (
  id          TEXT PRIMARY KEY,
  nome        TEXT,
  mensagem    TEXT NOT NULL,
  pagina      TEXT,                          -- em qual página foi deixado (ex.: home, curriculo)
  ip_hash     TEXT,
  status      TEXT NOT NULL DEFAULT 'publicado', -- publicado | oculto
  criado_em   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coment_criado ON comentarios (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_coment_pagina ON comentarios (pagina, criado_em);
CREATE INDEX IF NOT EXISTS idx_coment_ip ON comentarios (ip_hash, criado_em);

-- ===== Vinicut (rede social simples, estilo Orkut, só texto) =====
CREATE TABLE IF NOT EXISTS vc_usuarios (
  id            TEXT PRIMARY KEY,
  usuario       TEXT NOT NULL UNIQUE,     -- login, minúsculo, sem espaço
  senha_hash    TEXT NOT NULL,            -- pbkdf2$...
  nome          TEXT NOT NULL,
  status        TEXT,                     -- recadinho do topo
  quem_sou      TEXT,
  idade         TEXT,
  cidade        TEXT,
  relacionamento TEXT,
  criado_em     INTEGER NOT NULL,
  visto_em      INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vc_sessoes (
  token      TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  criado_em  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS vc_sessoes_user ON vc_sessoes (usuario_id);

CREATE TABLE IF NOT EXISTS vc_recados (
  id         TEXT PRIMARY KEY,
  para_id    TEXT NOT NULL,
  de_id      TEXT NOT NULL,
  de_usuario TEXT NOT NULL,
  de_nome    TEXT NOT NULL,
  texto      TEXT NOT NULL,
  criado_em  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS vc_recados_para ON vc_recados (para_id, criado_em);

CREATE TABLE IF NOT EXISTS vc_depoimentos (
  id         TEXT PRIMARY KEY,
  para_id    TEXT NOT NULL,
  de_id      TEXT NOT NULL,
  de_usuario TEXT NOT NULL,
  de_nome    TEXT NOT NULL,
  texto      TEXT NOT NULL,
  criado_em  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS vc_depo_para ON vc_depoimentos (para_id, criado_em);

-- Amizade guardada nas duas direções (a vê b e b vê a).
CREATE TABLE IF NOT EXISTS vc_amizades (
  a_id      TEXT NOT NULL,
  b_id      TEXT NOT NULL,
  criado_em INTEGER NOT NULL,
  PRIMARY KEY (a_id, b_id)
);

CREATE TABLE IF NOT EXISTS vc_comunidades (
  id        TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  descricao TEXT,
  dono_id   TEXT NOT NULL,
  criado_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vc_membros (
  comunidade_id TEXT NOT NULL,
  usuario_id    TEXT NOT NULL,
  criado_em     INTEGER NOT NULL,
  PRIMARY KEY (comunidade_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS vc_membros_user ON vc_membros (usuario_id);

CREATE TABLE IF NOT EXISTS vc_topicos (
  id            TEXT PRIMARY KEY,
  comunidade_id TEXT NOT NULL,
  autor_id      TEXT NOT NULL,
  autor_usuario TEXT NOT NULL,
  autor_nome    TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  criado_em     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS vc_topicos_com ON vc_topicos (comunidade_id, criado_em);

CREATE TABLE IF NOT EXISTS vc_respostas (
  id            TEXT PRIMARY KEY,
  topico_id     TEXT NOT NULL,
  autor_id      TEXT NOT NULL,
  autor_usuario TEXT NOT NULL,
  autor_nome    TEXT NOT NULL,
  texto         TEXT NOT NULL,
  criado_em     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS vc_respostas_top ON vc_respostas (topico_id, criado_em);

-- ================== Catálogo digital (tabelas ct_*) ==================
-- Lojista entra com o link da loja (slug) + senha. A página pública fica em soudev/c/<slug>.

CREATE TABLE IF NOT EXISTS ct_lojas (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  nome          TEXT NOT NULL,
  whatsapp      TEXT NOT NULL DEFAULT '',
  config        TEXT NOT NULL DEFAULT '{}',   -- JSON: tema, blocos da página, logo, capa, contatos
  visitas       INTEGER NOT NULL DEFAULT 0,
  pedidos       INTEGER NOT NULL DEFAULT 0,   -- cliques em "pedir pelo WhatsApp"
  criado_em     INTEGER NOT NULL,
  atualizado_em INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ct_sessoes (
  token     TEXT PRIMARY KEY,
  loja_id   TEXT NOT NULL,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ct_sessoes_loja ON ct_sessoes (loja_id);

CREATE TABLE IF NOT EXISTS ct_produtos (
  id         TEXT PRIMARY KEY,
  loja_id    TEXT NOT NULL,
  nome       TEXT NOT NULL,
  descricao  TEXT NOT NULL DEFAULT '',
  categoria  TEXT NOT NULL DEFAULT '',
  preco      INTEGER NOT NULL DEFAULT 0,      -- centavos
  preco_de   INTEGER NOT NULL DEFAULT 0,      -- preço antigo (promoção), 0 = sem
  imagem     TEXT,                            -- id em ct_imagens
  destaque   INTEGER NOT NULL DEFAULT 0,
  estado     TEXT NOT NULL DEFAULT 'ativo',   -- ativo | esgotado | oculto
  ordem      INTEGER NOT NULL DEFAULT 0,
  criado_em  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ct_produtos_loja ON ct_produtos (loja_id, ordem);

-- Imagens (já comprimidas no navegador). Se o Worker tiver R2 (binding FOTOS), os bytes vão
-- para o R2 e "dados" fica NULL; senão ficam aqui mesmo no D1.
CREATE TABLE IF NOT EXISTS ct_imagens (
  id        TEXT PRIMARY KEY,
  loja_id   TEXT NOT NULL,
  tipo      TEXT NOT NULL,
  tamanho   INTEGER NOT NULL,
  dados     BLOB,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ct_imagens_loja ON ct_imagens (loja_id);

-- Tentativas de login erradas (rate-limit por IP com hash).
CREATE TABLE IF NOT EXISTS ct_falhas (
  ip_hash   TEXT NOT NULL,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ct_falhas_ip ON ct_falhas (ip_hash, criado_em);

-- ================== Webhook Inspector (seção 4dev, tabelas wh_*) ==================
-- URLs temporárias (24 h) que guardam as requisições recebidas. Tudo é apagado ao vencer.
CREATE TABLE IF NOT EXISTS wh_bins (
  id        TEXT PRIMARY KEY,
  chave     TEXT NOT NULL,
  ip_hash   TEXT NOT NULL,
  status    INTEGER NOT NULL DEFAULT 200,
  ctype     TEXT NOT NULL DEFAULT 'application/json',
  corpo     TEXT NOT NULL DEFAULT '',
  criado_em INTEGER NOT NULL,
  expira_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS wh_bins_ip ON wh_bins (ip_hash, criado_em);
CREATE INDEX IF NOT EXISTS wh_bins_exp ON wh_bins (expira_em);

CREATE TABLE IF NOT EXISTS wh_reqs (
  id        TEXT PRIMARY KEY,
  bin_id    TEXT NOT NULL,
  metodo    TEXT NOT NULL,
  caminho   TEXT NOT NULL,
  query     TEXT NOT NULL DEFAULT '',
  headers   TEXT NOT NULL DEFAULT '[]',
  corpo     TEXT,
  binario   INTEGER NOT NULL DEFAULT 0,
  tamanho   INTEGER NOT NULL DEFAULT 0,
  truncado  INTEGER NOT NULL DEFAULT 0,
  ip        TEXT,
  pais      TEXT,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS wh_reqs_bin ON wh_reqs (bin_id, criado_em);

-- ================== Salas compartilhadas por link (tabela gp_salas) ==================
-- Decida por Nós (votação), Lista de Presentes e Divisão de Tarefas. Sem cadastro: quem cria guarda a chave.
CREATE TABLE IF NOT EXISTS gp_salas (
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL,
  dados         TEXT NOT NULL,
  chave         TEXT NOT NULL,
  versao        INTEGER NOT NULL DEFAULT 0,
  ip_hash       TEXT NOT NULL,
  criado_em     INTEGER NOT NULL,
  atualizado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gp_salas_ip ON gp_salas (ip_hash, criado_em);

-- ================== Meu Jornal (tabelas jn_*) ==================
-- O editor entra com o link do jornal (slug) + senha. A capa pública fica em soudev/j/<slug>.

CREATE TABLE IF NOT EXISTS jn_jornais (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  nome          TEXT NOT NULL,
  config        TEXT NOT NULL DEFAULT '{}',   -- JSON: lema, cidade, preço, papel, letreiro, fotos P&B
  visitas       INTEGER NOT NULL DEFAULT 0,
  criado_em     INTEGER NOT NULL,
  atualizado_em INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jn_sessoes (
  token     TEXT PRIMARY KEY,
  jornal_id TEXT NOT NULL,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS jn_sessoes_jornal ON jn_sessoes (jornal_id);

CREATE TABLE IF NOT EXISTS jn_materias (
  id            TEXT PRIMARY KEY,
  jornal_id     TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  linha_fina    TEXT NOT NULL DEFAULT '',
  secao         TEXT NOT NULL DEFAULT '',
  autor         TEXT NOT NULL DEFAULT '',
  texto         TEXT NOT NULL DEFAULT '',
  foto          TEXT,                          -- id em jn_imagens
  legenda       TEXT NOT NULL DEFAULT '',
  peso          TEXT NOT NULL DEFAULT 'normal', -- manchete | destaque | normal | curta
  estado        TEXT NOT NULL DEFAULT 'rascunho', -- publicada | rascunho
  ordem         INTEGER NOT NULL DEFAULT 0,
  criado_em     INTEGER NOT NULL,
  atualizado_em INTEGER NOT NULL,
  publicado_em  INTEGER
);
CREATE INDEX IF NOT EXISTS jn_materias_jornal ON jn_materias (jornal_id, ordem);

CREATE TABLE IF NOT EXISTS jn_imagens (
  id        TEXT PRIMARY KEY,
  jornal_id TEXT NOT NULL,
  tipo      TEXT NOT NULL,
  tamanho   INTEGER NOT NULL,
  dados     BLOB,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS jn_imagens_jornal ON jn_imagens (jornal_id);

CREATE TABLE IF NOT EXISTS jn_falhas (
  ip_hash   TEXT NOT NULL,
  criado_em INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS jn_falhas_ip ON jn_falhas (ip_hash, criado_em);
