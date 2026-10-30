---
title: Save & load menu
sidebar_position: 7
---

This example shows a tiny save/load UI:

- save current game state into `localStorage`
- list saves
- load a save by id

It uses `Button` for UI and `game.saves` for persistence.

## Define a save payload

```ts
type GameState = {
  schemaVersion: 1;
  level: number;
  hp: number;
};
```

## Save button

```ts
import { Button, Vector } from "sliver-engine";

const saveButton = new Button(
  "save",
  new Vector(40, 40),
  new Vector(160, 50),
  "Save",
  "#2da44e",
  "white",
  () => {
    const state: GameState = { schemaVersion: 1, level: 2, hp: 10 };
    const id = game.saves.create(state, { label: `L${state.level}` });
    console.log("Saved:", id);
  }
);
```

## Load menu (list + load)

This is intentionally simple: it logs entries and loads the most recent one.

```ts
const entries = game.saves.list();
console.log("Saves:", entries);

const mostRecent = entries[0];
if (mostRecent) {
  const save = game.saves.read<GameState>(mostRecent.id);
  if (save) {
    console.log("Loaded data:", save.data);
    // Apply it to your game (player stats, current level, etc.)
  }
}
```

Tip: for a real menu, render one `Button` per save entry and call `read(entry.id)` in its click handler.

