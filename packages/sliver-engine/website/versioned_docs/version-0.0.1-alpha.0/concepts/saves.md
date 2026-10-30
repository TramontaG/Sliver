---
title: Saves
---

Saves are base64-encoded and stored in `localStorage`.

Common operations:
- Create: `game.saves.create(state, { label })`
- List: `game.saves.list()`
- Read: `game.saves.read(id)`
- Load hook during setup: `game.onLoadSaveFile((save) => { ... })`

