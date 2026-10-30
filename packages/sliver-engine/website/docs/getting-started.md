---
title: Getting started
sidebar_position: 2
---

## Install

```bash
npm install sliver-engine
```

## Minimal example

```ts
import {
  CanvasController,
  Game,
  Scene,
  SceneManager,
  SoundManager,
} from "sliver-engine";

const canvas = new CanvasController(800, 600);

const mainScene = new Scene("main", "#0b0a18");
const scenes = new SceneManager({ main: mainScene }, mainScene);

const game = new Game({
  canvas,
  scenes,
  soundManager: new SoundManager(),
  ticksPerSecond: 60,
});

game.start();
```

Sliver Engine appends the `<canvas>` to `#canvas-container` if present, otherwise to `document.body`.

## Decorators

To use event decorators (like `@onClick`), enable `experimentalDecorators: true` in your `tsconfig.json`.
This is the intended way to use Sliver Engine. Directly calling the decorators is not officially supported.
