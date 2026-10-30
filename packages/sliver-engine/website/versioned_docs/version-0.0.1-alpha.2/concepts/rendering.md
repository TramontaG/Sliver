---
title: Rendering
sidebar_position: 9
---

Rendering in Sliver is based on a `CanvasController`, which owns a real HTML `<canvas>` + its 2D rendering context, plus a few helpers:

- `ShapeDrawer`: drawing primitives, text, clipping/rotation helpers, and simple sprite drawing.
- `SpriteLibrary`: loads sprites and sprite sheets, and draws individual frames.

The engine clears the canvas and renders active scenes every frame (see [`Game loop`](./game-loop.md)).

## CanvasController (the canvas + 2D context)

Create a canvas:

```ts
import { CanvasController } from "sliver-engine";

const canvas = new CanvasController(800, 600);
```

By default, Sliver appends the `<canvas>` to `#canvas-container` if present, otherwise to `document.body`.

Useful APIs:

- `canvas.getCanvas()`: the underlying `HTMLCanvasElement`
- `canvas.getContext()`: the underlying `CanvasRenderingContext2D`
- `canvas.clearCanvas()`: clears the entire canvas
- `canvas.reset()`: resets the transform matrix (`setTransform(1,0,0,1,0,0)`)
- `canvas.getShapeDrawer()`: access `ShapeDrawer` helpers
- `canvas.getSpriteLibrary()`: access `SpriteLibrary` asset loading + frame drawing

## ShapeDrawer (primitives, text, transforms)

Get it from the canvas:

```ts
const draw = canvas.getShapeDrawer();
```

Common drawing calls:

```ts
import { Vector } from "sliver-engine";

draw.drawBackground("#0b0a18");
draw.drawRectangle(10, 10, 100, 50, "red", true);
draw.drawCircle(200, 120, 16, "cyan", true);
draw.drawLine(new Vector(0, 0), new Vector(100, 100), 4, "white");
draw.drawText("Hello", 400, 40, "white", "16px");
```

### Clipping, rotation, and opacity

These helpers wrap `ctx.save()` / `ctx.restore()` for you:

```ts
draw.withClippingRect(50, 50, 200, 100, () => {
  draw.drawText("Only visible inside", 150, 100, "white");
});

draw.withRotation(400, 300, Math.PI / 8, () => {
  draw.drawRectangle(360, 280, 80, 40, "orange", true);
});

draw.withOpacity(0.5, () => {
  draw.drawCircle(100, 100, 30, "hotpink", true);
});
```

### Font loading

`ShapeDrawer.loadFont(fontName, url)` loads and registers a font so it can be used by `drawText`.

```ts
await canvas
  .getShapeDrawer()
  .loadFont("Roboto", "https://fonts.googleapis.com/css2?family=Roboto");

canvas.getShapeDrawer().setDefaultFont("Roboto");
```

## Sprites and sprite sheets

See [`Working With Sprites`](./working-with-sprites.md) for sprite loading, rendering, definitions, manifests, and animation setup.
