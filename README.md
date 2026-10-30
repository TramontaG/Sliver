# Sliver + RamenEmpire

Monorepo do Sliver Engine e do RamenEmpire. O jogo orienta o desenvolvimento da
engine; capacidades reutilizáveis ficam na engine e as regras do restaurante no jogo.

```text
packages/sliver-engine/          engine e seu site de documentação
games/ramen-empire/              jogo
package.json                    comandos do workspace
bun.lock                        dependências dos dois pacotes
```

## Desenvolvimento

Use Bun 1.3.11 e Node.js 22.12+ (ou 20.19+), compatível com Vite 7.

```sh
cd ~/Projects/sliver
bun install --frozen-lockfile
bun run dev
```

Abra o endereço mostrado pelo Vite (normalmente `http://localhost:5173`). O comando
inicia o jogo e a observação das declarações TypeScript da engine. Para acesso
remoto, encaminhe a porta pelo editor/SSH.

O jogo mantém `import { ... } from "sliver-engine"`. A dependência é `workspace:*`,
resolvida por symlink para `packages/sliver-engine`, sem baixar a engine do npm.
O alias em `games/ramen-empire/vite.config.ts` aponta diretamente para
`packages/sliver-engine/src/index.ts`. Vite observa as alterações e recarrega o
jogo; não é necessário publicar, mudar a versão ou compilar JavaScript da engine
para experimentar uma alteração. A configuração do Vitest compartilha esse alias.

As declarações geradas em `dist` servem ao TypeScript/editor. `bun run dev`
atualiza essas declarações ao salvar; `typecheck` e `build` também as geram
automaticamente. Os builds do jogo usam as fontes locais da engine.

| Comando na raiz | Ação |
| --- | --- |
| `bun run dev` | Jogo com recarga e observação dos tipos da engine |
| `bun run build` | Build da engine e do jogo |
| `bun run build:engine` | Pacote distribuível da engine em `packages/sliver-engine/dist` |
| `bun run build:game` | Jogo em `games/ramen-empire/dist` |
| `bun run typecheck` | Checagem das fontes da engine e do jogo |
| `bun run test` | Suítes unitárias dos dois, reportando falhas de ambos |
| `bun run test:engine` | Testes da engine |
| `bun run test:game` | Testes unitários do jogo usando a engine local |
| `bun run test:browser` | Playwright do jogo; requer Chromium e assets |
| `bun run preview` | Prévia do build do jogo |

Para instalar o navegador dos testes:

```sh
bun run --cwd games/ramen-empire test:browser:install
```

O site Docusaurus permanece em `packages/sliver-engine/website/`, com instalação
e lockfile próprios. Os comandos `docs:*` continuam disponíveis no pacote da engine;
ele não é necessário para desenvolver ou compilar o jogo.

## Versões independentes

Há um único histórico Git a partir da migração, com versões de produto separadas:

- Engine: `packages/sliver-engine/package.json`, inicialmente `0.0.1-alpha-9`.
- Jogo: `games/ramen-empire/package.json`, inicialmente `0.0.0` e `private: true`.

Uma mudança não exige aumentar a versão do outro pacote. A dependência
`workspace:*` continua apontando à engine local, independentemente do número da
versão. Ao preparar uma entrega, altere apenas o `version` do pacote correspondente,
atualize o lockfile com `bun install` e registre o commit. Use tags com o nome do
produto, por exemplo `sliver-engine@0.0.1-alpha-10` e `ramen-empire@0.1.0`.
Uma tag identifica um commit do monorepo, mas representa a entrega de um só pacote.

É possível consultar alterações por área:

```sh
git log -- packages/sliver-engine
git log -- games/ramen-empire
```

Publicar a engine é opcional e só atende consumidores externos. Seus campos
`main`, `types`, `exports` e `files` preservam a distribuição por `dist`. O script
histórico `release` da engine ainda publica no npm: não o use para desenvolvimento
local. O jogo e a raiz do workspace são privados.

## Migração e históricos

Importado em 2026-10-30, sem reescrever ou condensar os históricos originais:

| Origem | Commit importado | Remote local de referência |
| --- | --- | --- |
| [CanvasGE](https://github.com/TramontaG/CanvasGE) | `76631ca6c174d32b3bfae6e96181786a079c60c4` | `engine-upstream` |
| [RamenEmpire](https://github.com/TramontaG/RamenEmpire) | `e6aaca60832fe9dcbaf34957e2d1233f2fcd5bf5` | `game-upstream` |

A engine foi movida com Git e o jogo incorporado por merge dos históricos, sem
submódulos ou repositórios Git aninhados. Os remotes antigos são referências;
não são destinos para publicar o monorepo. O novo repositório ainda não tem
`origin` no GitHub. Criar/configurar esse destino é uma etapa separada.

## Arquivos externos e pendências herdadas

- Os assets pagos não estavam no GitHub. Restaure os diretórios `People`, `UI`,
  `Interiors` e `Sounds` em `games/ramen-empire/src/Game/Assets/Paid/`. A pasta
  permanece ignorada pelo Git. Compilar não comprova que o jogo está visualmente
  completo; os testes de gameplay no navegador dependem desses arquivos.
- `packages/sliver-engine/tests/physics/integration/DebugStressScene.test.ts`
  referencia `src/DebugGame/DebugStressScene`, que não foi versionado no repositório
  original. A suíte completa da engine mantém esse erro explícito; não foi
  excluída nem marcada como aprovada.
- A checagem normal da engine usa o escopo de seu pacote distribuível. A checagem
  histórica que também inclui testes e exemplos do site permanece acessível com
  `bun run --cwd packages/sliver-engine typecheck:all`; ela possui pendências e
  depende da instalação separada das dependências do site.

## Validação da migração (2026-10-30)

- Instalação reproduzível: `bun install --frozen-lockfile` passou.
- Build dos dois pacotes e checagem de tipos das fontes passaram.
- Jogo: 13 testes unitários passaram, incluindo a identidade das classes entre
  o import público `sliver-engine`, a fonte local e um personagem do jogo.
- Engine: 177 testes passaram; a suíte completa falha pela demonstração ausente
  descrita acima.
- Com `bun run dev`, uma alteração temporária na fonte de `Vector` foi servida
  pelo Vite, emitiu a notificação de recarga e atualizou as declarações do editor.
  A alteração foi restaurada ao final. Não foi necessária publicação no npm.
- A validação visual completa e os testes de gameplay no navegador aguardam os assets.
