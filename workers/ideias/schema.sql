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
