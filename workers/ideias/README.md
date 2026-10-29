# soudev-ideias (Cloudflare Worker + D1)

Backend do balão de ideias do soudev. Recebe as sugestões (`POST /ideias`) e guarda no banco
D1. O painel admin seguro fica em `/admin` (servido pelo próprio Worker).

Nada aqui depende da Vercel: o site (Vercel) só faz um `fetch` para a URL deste Worker.

## Pré-requisitos (uma vez)

```bash
npm install -g wrangler   # ou use: npx wrangler ...
wrangler login            # abre o navegador e conecta sua conta Cloudflare (grátis)
cd workers/ideias
npm install
```

## Passo a passo

### 1. Criar o banco D1
```bash
wrangler d1 create soudev-ideias
```
Copie o `database_id` que aparecer e cole em `wrangler.jsonc` (campo `database_id`).

### 2. Criar as tabelas
```bash
wrangler d1 execute soudev-ideias --remote --file=schema.sql
```

### 3. Gerar o hash da senha (a senha fica só no seu PC)
```bash
node scripts/hash-senha.mjs
```
Digite a senha (não aparece na tela) e copie a linha gerada.

### 4. Guardar os segredos (nunca vão para o git)
```bash
wrangler secret put ADMIN_PASS_HASH     # cole o hash do passo 3
wrangler secret put SESSAO_SECRET        # cole uma frase longa e aleatória qualquer
```
> Dica para o `SESSAO_SECRET`: rode `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e use a saída.

O usuário fica em `wrangler.jsonc` (`ADMIN_USER`, hoje `vinivn`) — mude ali se quiser.

### 5. Publicar
```bash
wrangler deploy
```
Vai aparecer a URL, algo como `https://soudev-ideias.SEU-SUBDOMINIO.workers.dev`.

- Painel: abra essa URL + `/admin` e faça login.
- Essa mesma URL (sem `/admin`) é o que o site do soudev precisa saber — veja abaixo.

### 6. Ligar no soudev
No projeto soudev, defina a variável pública com a URL do Worker:

- **Local:** adicione em `.env.local`:
  ```
  NEXT_PUBLIC_IDEIAS_API=https://soudev-ideias.SEU-SUBDOMINIO.workers.dev
  ```
- **Produção (Vercel):** Settings → Environment Variables → `NEXT_PUBLIC_IDEIAS_API` = mesma URL → novo deploy.

Pronto. O balão passa a enviar as ideias para o Worker, e você as lê em `/admin`.

## Desenvolvimento local
```bash
wrangler dev          # roda o Worker local em http://localhost:8787
```
Para testar o admin local, crie um arquivo `.dev.vars` (ignorado pelo git) com:
```
ADMIN_PASS_HASH=pbkdf2$...   (saída do hash-senha.mjs)
SESSAO_SECRET=qualquer-coisa-longa
```

## Trocar a senha depois
Rode de novo o passo 3 e o `wrangler secret put ADMIN_PASS_HASH`. Pronto — sem deploy.
