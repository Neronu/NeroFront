# NeroFront

PWA do Neronu (React + Vite): tela de mesa, painel das entidades e páginas públicas.
Consome a API e os pacotes `@neronu/*` publicados pelo [NeroBack](https://github.com/Neronu/NeroBack).

## Desenvolvimento

Requer Node 22+, pnpm 10 e um token do GitHub com **`read:packages`** para instalar `@neronu/*`.

```bash
# uma vez: credencial no ~/.npmrc do usuário (o pnpm ignora a do .npmrc do projeto)
echo '//npm.pkg.github.com/:_authToken=${NPM_TOKEN}' >> ~/.npmrc
pnpm install
cp .env.example .env              # VITE_API_URL apontando para a API
pnpm dev                          # http://localhost:5173
pnpm test
```

## Marco 1: mesa

Fluxo: **Equipes** (cadastro rápido) → **Nova partida** → relacionados e titulares → **mesa**
(`/partidas/:id/mesa`) → **conferência** e fechamento com PDF.

- Login com e-mail verificado; o token fica no aparelho (30 dias), e a mesa abre do cache sem rede.
- Cada toque é aplicado na hora com o módulo de basquete e entra numa fila guardada no aparelho;
  a fila é enviada em ordem e reenviada sozinha quando a conexão volta (o id do evento é a chave
  de idempotência). A partida também abre do cache sem conexão.
- Abra a mesa alguns minutos antes do jogo: o indicador no topo mostra se está sincronizado.

## Marco 2: entidade e campeonato

Painel da entidade (troca no topo): equipes, atletas (e-mail e RGA opcionais), regras do basquete
(formulário gerado pelo `rulesSchema` do módulo) e campeonatos. Sem membros nem papéis: quem entra
com o e-mail da atlética é a atlética; os demais são atletas.
No campeonato: convites por link (`/convites/:token`), inscrições e aprovação, elencos com número
de camisa, equipe convidada sem conta, geração da tabela, jogos, classificação, chave e rankings.

## Esportes

Basquete (5x5, `@neronu/sport-basketball`) e Basquete 3x3 (`@neronu/sport-basketball-3x3`, regras
FIBA 3x3: cestas de 1 e 2, fim aos 21, prorrogação até 2 pontos, faltas coletivas 7/10,
classificação por vitórias e média de pontos). A partida e o campeonato escolhem o esporte; as
regras da entidade têm uma aba por esporte.

Um esporte novo entra em três lugares: o módulo em `src/lib/sports.ts`, o adaptador da mesa em
`src/lib/match/sport-table.ts` (botões, topo, ações, descrição dos lances, retificação) e, se a
tabela mudar, as colunas em `StandingsTab`.

## Pacotes do NeroBack

- As versões de `@neronu/*` são fixadas (sem `^`). Para atualizar: `pnpm add -E @neronu/sport-basketball@x.y.z`.
- Só abra o PR de bump depois que a versão estiver publicada pelo NeroBack.
- Para testar uma mudança do pacote antes de publicar:
  `pnpm link ../neroBack/packages/sport-basketball`. Nunca faça commit do link: o CI recusa.
- A página inicial compara a versão do módulo de basquete da API (`GET /health`) com a do app
  e avisa se o major divergir.

## Deploy

Vercel: produção na `main` e prévia por PR. O `installCommand` do `vercel.json` grava a credencial a partir de `NPM_TOKEN`. Variáveis: `NPM_TOKEN` (instalação) e `VITE_API_URL`
(API de produção na Production; API de dev nas Previews).
