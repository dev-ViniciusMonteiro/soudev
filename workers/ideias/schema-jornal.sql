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
