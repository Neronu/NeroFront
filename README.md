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
