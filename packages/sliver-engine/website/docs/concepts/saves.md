---
title: Saves
sidebar_position: 8
---

Sliver provides a small save system built on top of `localStorage`. It’s designed for quick, ergonomic “snapshot” saves:

- Save payloads are JSON-serialized and base64-encoded.
- Each save has an `id`, timestamps, and an optional `label`.
- The engine loads saves during `Game.setup()` (before `onSetup()`), so you can restore state early.

## Accessing saves

Your `Game` instance exposes `game.saves`:

```ts
const saves = game.saves;
```

Optionally, give saves a namespace so multiple games don’t collide in `localStorage`:

```ts
const game = new Game({
  canvas,
  scenes,
  soundManager,
  saveNamespace: "my-game",
});
```

## Save types

### Index entry (metadata only)

`list()` returns `SaveIndexEntry[]`:

- `id: string`
- `createdAt: number` (ms timestamp)
- `updatedAt: number` (ms timestamp)
- `label?: string`

### Full save file

`read()` / `loadAll()` return a `SaveFile<T>`:

```ts
type SaveFile<T> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  label?: string;
  data: T;
};
```

## Creating a save

Use `create(data, options?)`:

```ts
type GameState = { level: number; hp: number };

const id = game.saves.create<GameState>(
  { level: 3, hp: 10 },
  { label: "Checkpoint" }
);
```

- If you don’t provide an `id`, Sliver generates one (`crypto.randomUUID()` when available).
- `create` always writes (it’s “create if missing” by default).

## Updating an existing save

Use `write(id, data, options?)`:

```ts
game.saves.write(id, { level: 4, hp: 7 }, { label: "After boss" });
```

If you want “write only if it already exists”, pass `createIfMissing: false`:

```ts
game.saves.write(id, state, { createIfMissing: false });
```

## Listing saves (for a load menu)

```ts
const entries = game.saves.list();
// entries are sorted by updatedAt (most recent first)
```

## Reading a save

```ts
const save = game.saves.read<GameState>(id);
if (!save) return;

console.log(save.label, save.data.level);
```

If the data is missing or can’t be decoded/parsed, `read()` returns `null`.

## Loading saves on startup

The engine calls `game.saves.loadAll()` during `game.setup()`. To react to each loaded save, register a callback:

```ts
game.onLoadSaveFile((save) => {
  console.log("Loaded save:", save.id, save.label);
});
```

Notes:
- The callback runs once per save file during setup.
- `loadAll()` continues even if one save is corrupted; corrupted entries are skipped.

## Deleting and clearing

Delete a single save by id:

```ts
game.saves.delete(id);
```

Clear all saves for the current namespace:

```ts
game.saves.clear();
```

## Best practices

- **Keep save payloads small**: `localStorage` is limited and synchronous.
- **Version your data**: include a `schemaVersion` in your saved `data`, so you can migrate later.
- **Treat `read()` as nullable**: users can clear storage, or old saves might be invalid JSON.
- **Use labels for UX**: labels are stored in the index and are cheap to display in menus.
