---
title: Working With Sprites
sidebar_position: 10
---

Sprite definitions let you name a selection of tiles from a sprite sheet and draw them later by name. They work with rectangle selections and tile grids (for reusing tiles across a larger object).

## Example: 4x3 walk cycle sheet

<img
src="/img/human.png"
alt="Human sprite sheet"
width={640}
style={{ imageRendering: "pixelated" }}
/>

This sheet is **4x3 frames**. Each frame is **16x32**, but we load the sheet as **16x16 tiles** so each frame becomes a 2-tile-tall sprite definition.

To address the tiles by IDs, we do it like this (4 columns total):
_Check these numbers for the tile-id array examples below_

| Col 0 | Col 1 | Col 2 | Col 3 | Description |
| ----- | ----- | ----- | ----- | ----------- |
| 0     | 1     | 2     | 3     | down (head) |
| 4     | 5     | 6     | 7     | down (body) |
| 8     | 9     | 10    | 11    | up (head)   |
| 12    | 13    | 14    | 15    | up (body)   |
| 16    | 17    | 18    | 19    | left (head) |
| 20    | 21    | 22    | 23    | left (body) |

_Right is the same as left row mirrored horizontally._

Another way to read the tiles is by their grid position `[col, row]`:
_Check these coordinates for the rect examples below_

| Col 0 | Col 1 | Col 2 | Col 3 | Description |
| ----- | ----- | ----- | ----- | ----------- |
| [0,0] | [1,0] | [2,0] | [3,0] | down (head) |
| [0,1] | [1,1] | [2,1] | [3,1] | down (body) |
| [0,2] | [1,2] | [2,2] | [3,2] | up (head)   |
| [0,3] | [1,3] | [2,3] | [3,3] | up (body)   |
| [0,4] | [1,4] | [2,4] | [3,4] | left (head) |
| [0,5] | [1,5] | [2,5] | [3,5] | left (body) |

Both approaches are valid and supported by Sliver.

## Defining sprites in code

Use `SpriteLibrary` to define by rectangle (grid coordinates) or by index grid. Rects are **top-left to bottom-right**, inclusive. Tile ids count **left-to-right, top-to-bottom** across the sheet, as shown above.

```ts
import { GameObject, Vector, renderSpriteAnimation } from "sliver-engine";

await sprites.loadSpriteSheet(
  "human", // name of the spritesheet
  new URL("/img/human.png", window.location.href),
  16,
  16
);

// Defining a sprite as a rect in the spritesheet
sprites.defineSpriteFromSheet(
  "human_down_0", // sprite name
  "human", // spritesheet name
  new Vector(0, 0), // [col, row] top-left
  new Vector(0, 1) // [col, row] bottom-right (2 tiles tall)
);

// Defining a sprite as a 2D array of tile ids
sprites.defineSpriteFromSheetIndexes("human_down_1", "human", [
  [1], // head
  [5], // body
]);

// Another definition by tile ids
sprites.defineSpriteFromSheetIndexes("human_down_2", "human", [[2], [6]]);

sprites.defineSpriteFromSheet(
  "human_down_3",
  "human",
  new Vector(3, 0), // head
  new Vector(3, 1) // body
);

const WALK_DOWN = [
  "human_down_0",
  "human_down_1",
  "human_down_2",
  "human_down_3",
];

class Hero extends GameObject {
  @renderSpriteAnimation(WALK_DOWN, { ticksPerFrame: 6, scale: 2 })
  override render(): void {}
}
```

To walk right, reuse the left animation and mirror horizontally:

```ts
// define all the frames like you did with walking down

class Hero extends GameObject {
  @renderSpriteAnimation(WALK_LEFT, {
    ticksPerFrame: 6,
    scale: 2,
    mirroring: "horizontal",
  })
  override render(): void {}
}
```

## JSON manifest (hybrid addressing)

You can define sprites in JSON and load them in bulk. Each sprite chooses how tiles are addressed:

- `mode: "grid"` uses `[col, row]` points.
- `mode: "id"` uses flat tile ids (left-to-right, top-to-bottom).

```json
{
  "sprites": {
    "human_down_0": {
      "sheet": "human",
      "rect": { "mode": "grid", "from": [0, 0], "to": [0, 1] }
    },
    "human_down_1": {
      "sheet": "human",
      "rect": { "mode": "id", "from": 1, "to": 5 }
    },
    "human_up_0": {
      "sheet": "human",
      "rect": { "mode": "grid", "from": [0, 2], "to": [0, 3] }
    },
    "human_left_0": {
      "sheet": "human",
      "rect": { "mode": "grid", "from": [0, 4], "to": [0, 5] }
    },
    "human_down_2": {
      "sheet": "human",
      "grid": {
        "mode": "id",
        "tiles": [[2], [6]]
      }
    }
  }
}
```

Load it at startup:

```ts
import spriteManifest from "./Assets/human.json";

const sprites = canvas.getSpriteLibrary();
sprites.loadSpriteDefinitions(spriteManifest);
```

## Rendering definitions

Use the decorator (preferred) or call `drawSpriteDefinition` directly (discoraged)

```ts
import { GameObject, renderSprite } from "sliver-engine";

class Hero extends GameObject {
  @renderSprite("human_down_0", { scale: 2 })
  override render(): void {}
}
```

```ts
sprites.drawSpriteDefinition(
  canvas.getContext(),
  "human_down_0",
  new Vector(120, 80),
  2
);
```

## Animation definitions

`@renderSpriteAnimation` accepts an array of sprite definition names:

```ts
@renderSpriteAnimation(["human_down_0", "human_down_1"], {
  ticksPerFrame: 6,
  scale: 4,
})
override render(): void {}
```

## Pre-baking behavior

Multi-tile index definitions are pre-baked into a bitmap the first time they are used. Single-tile definitions render directly.

## Validation and errors

The manifest loader validates structure and throws with clear messages if:

- a sprite name is reused,
- the manifest is missing required fields,
- `rect`/`grid` are invalid or both defined,
- a referenced spritesheet is missing (for grid-based conversions).
