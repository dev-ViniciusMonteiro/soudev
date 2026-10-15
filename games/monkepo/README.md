# MonKePo

Jogo de monstrinhos com as mecânicas da 3ª geração (tipos, naturezas, IVs/EVs, curvas de experiência,
fórmula de atributos) e criaturas próprias. A sala multiplayer roda no PC de quem hospeda (WebRTC); a planilha
guarda só os monstros de cada jogador.

## O que fica onde

| Dado | Onde |
|---|---|
| Monstros de cada jogador (time + caixa) | Planilha, aba `jogadores`, coluna `monstros` |
| Mochila, dinheiro, posição, NPCs, batalhas em andamento | Sala do anfitrião (memória + IndexedDB do PC dele). Cada sala nova começa com o kit inicial |
| Ranking (melhor monstro de cada um) | Planilha, colunas `poder` e `melhor` (calculadas pelo servidor) |

Formato de um monstro (cerca de 40 a 60 caracteres):
`uid.espécie.nível.xp.personalidade.ivs.evs.golpes[.apelido]` (números em base 36), separados por vírgula.
Natureza, gênero, habilidade e brilhante saem da personalidade, como no jogo original. PS/PP/status não são
salvos: ao carregar, o time volta curado.

## Instalar o servidor (Google Apps Script + Planilha)

1. Crie uma planilha nova no Google Sheets (ex.: "MonKePo - servidor"). **Não compartilhe** a planilha.
2. Menu **Extensões > Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole todo o arquivo [`apps-script/Code.gs`](apps-script/Code.gs).
4. Em **Configurações do projeto**, marque "Mostrar o arquivo de manifesto appsscript.json" e cole
   [`apps-script/appsscript.json`](apps-script/appsscript.json).
5. No editor, escolha a função `configurar` e clique em **Executar** (autorize o acesso à planilha).
   Ela cria as abas `jogadores` e `log` e gera as chaves secretas (`SEGREDO` e `PIMENTA`, em Propriedades do script).
6. **Implantar > Nova implantação > App da Web**: executar como **Eu**, acesso **Qualquer pessoa**.
7. Copie a URL que termina em `/exec` e coloque na Vercel como variável `VITE_MONKEPO_API`.

Para atualizar o servidor: `npm run build:monkepo-script`, cole o novo `Code.gs` e faça
**Implantar > Gerenciar implantações > Editar > Nova versão** (a URL continua a mesma).

## Rotas

Todas por POST com corpo JSON (`Content-Type: text/plain`). O Apps Script não lê cabeçalhos, por isso o
`Bearer` vai no campo `authorization` do corpo.

| acao | authorization | Corpo extra | Resposta |
|---|---|---|---|
| `entrar` | `Bearer base64url(usuario:sha256(senha))` | | `token`, `novo`, `rev`, `monstros` (cria a conta se não existir) |
| `carregar` | `Bearer <token>` | | `rev`, `monstros` |
| `salvar` | `Bearer <token>` | `rev`, `monstros` | novo `rev` (ou `conflito` com o save atual) |
| `ranking` | | | top 20 |
| `sair` | `Bearer <token>` | | encerra todas as sessões do usuário |

## Segurança

- A senha nunca sai do navegador: vai só `SHA-256("monkepo:v1:" + usuario + ":" + senha)`, por HTTPS.
- A planilha guarda um hash desse valor com sal por usuário + pimenta secreta, em 200 rodadas de HMAC-SHA256.
- Token de sessão assinado com HMAC (chave `SEGREDO`), vale 7 dias e é renovado sozinho; `sair` invalida todos.
- Cada jogador só lê e grava a própria linha (o id vem do token, nunca do corpo).
- Bloqueio de 15 minutos após 5 senhas erradas; até 60 cadastros novos por hora; até 6 saves por minuto.
- Saves conferidos antes de gravar: formato, espécie, nível x experiência, IVs/EVs, golpes que a espécie aprende,
  1º monstro = inicial no nível 5, nada de mudar espécie (só evoluir), perder nível ou alterar dados fixos,
  e ganho de níveis/monstros limitado pelo tempo desde o último save. Recusas vão para a aba `log`.
- Para bloquear alguém, mude a coluna `liberado` para `NÃO`.

Limite: o jogo roda no navegador, então alguém experiente ainda consegue mexer no **próprio** save dentro dos
limites acima. Ninguém consegue alterar o save de outra pessoa.
