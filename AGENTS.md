# Sliver workspace

- Este é um monorepo Git com dois pacotes e versões independentes.
- Engine: `packages/sliver-engine/`; jogo: `games/ramen-empire/`.
- Leia também o `AGENTS.md` do pacote antes de editá-lo.
- O desenvolvimento da engine deve responder às necessidades concretas do RamenEmpire.
- Mantenha regras de restaurante no jogo e capacidades reutilizáveis na engine.
- Use Bun na raiz e preserve `workspace:*` na dependência `sliver-engine` do jogo.
- O Vite e o Vitest consomem `packages/sliver-engine/src/index.ts` pela configuração
  compartilhada do jogo; não os redirecione para npm ou para `dist`.
- `bun run dev` observa as fontes e atualiza as declarações TypeScript da engine.
- As saídas de publicação da engine continuam em `dist`; não publique a raiz ou o jogo.
- Use versões e tags independentes: `sliver-engine@<versão>` e `ramen-empire@<versão>`.
- Não atualize a versão de um pacote só porque o outro mudou.
- Há um único lockfile para os dois pacotes na raiz; o site de documentação tem
  instalação e lockfile próprios em `packages/sliver-engine/website/`.
- Preserve os assets privados em `games/ramen-empire/src/Game/Assets/Paid/`, ignorados
  pelo Git. Não invente substitutos nem os inclua em commits.
- Consulte o README para comandos, origem dos históricos e limitações herdadas.
