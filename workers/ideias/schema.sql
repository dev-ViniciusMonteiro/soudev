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
