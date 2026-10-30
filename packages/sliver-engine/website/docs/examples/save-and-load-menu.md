---
title: Save & load menu
sidebar_position: 7
---
import sandpack1IndexTs from "../sandpack/examples/save-and-load-menu/interactive-example/index.ts?raw";
import sandpack1SaveButtonsTs from "../sandpack/examples/save-and-load-menu/interactive-example/SaveButtons.ts?raw";
import sandpack1PlayerStateTs from "../sandpack/examples/save-and-load-menu/interactive-example/PlayerState.ts?raw";
import sandpack1SaveHudTs from "../sandpack/examples/save-and-load-menu/interactive-example/SaveHud.ts?raw";
import sandpack1TypesTs from "../sandpack/examples/save-and-load-menu/interactive-example/types.ts?raw";
import sandpack1MainTs from "../sandpack/examples/save-and-load-menu/interactive-example/main.ts?raw";

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

## Interactive example

This sandbox includes a tiny save/load panel:

- **Save** stores current level/hp
- **Load latest** restores the newest entry
- **Clear saves** removes all entries in this demo namespace

Edit `SaveButtons.ts` to tweak save/load behavior.

<SandpackExample
	files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/SaveButtons.ts": sandpack1SaveButtonsTs,
		"/PlayerState.ts": {
			code: sandpack1PlayerStateTs,
			readOnly: true,
		},
		"/SaveHud.ts": {
			code: sandpack1SaveHudTs,
			readOnly: true,
		},
		"/types.ts": {
			code: sandpack1TypesTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
	visibleFiles={["/SaveButtons.ts"]}
	activeFile="/SaveButtons.ts"
	editorHeight={320}
	showRunButton
	hiddenFiles={[
		"/index.html",
		"/styles.css",
		"/package.json",
		"/index.ts",
		"/main.ts",
		"/PlayerState.ts",
		"/SaveHud.ts",
		"/types.ts",
	]}
	options={{
		autoReload: false,
		showNavigator: true,
		showRefreshButton: true,
		showTabs: true,
		showLineNumbers: true,
		wrapContent: false,
	}}
	customSetup={{
		dependencies: {
			"sliver-engine": "0.0.1-alpha-5",
		},
	}}
/>
