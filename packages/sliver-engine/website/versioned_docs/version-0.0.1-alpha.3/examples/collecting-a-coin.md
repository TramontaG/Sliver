---
title: Collecting a coin
sidebar_position: 1
---

This example shows a “coin pickup” with:

- a preloaded SFX (`SoundManager.loadSound`)
- a preloaded sprite sheet (`SpriteLibrary.loadSpriteSheet`)
- coin rendering + player rendering (via render decorators)
- a trigger hitbox (`solid: false`) and `onColision`
- a HUD listening to `score:coin_collected`

## 1) Preload the sound + sprites

Load assets during your game setup (or scene setup):

```ts
const ctx = game.getContext();

// Audio
await ctx
  .getSoundManager()
  .loadSound("coin_pickup", new URL("/audio/coin.wav", window.location.href), [
    "sfx",
  ]);

// Sprites (fixed-grid sprite sheet)
const sprites = ctx.getCanvas().getSpriteLibrary();
await sprites.loadSpriteSheet(
  "items",
  new URL("/sprites/items.png", window.location.href),
  16, // frameWidth
  16 // frameHeight
);

// Recommended: unlock audio on first user gesture.
window.addEventListener(
  "pointerdown",
  () => {
    ctx.getSoundManager().unlock();
  },
  { once: true }
);
```

Tip: define constants for frame indexes so you don’t spread magic numbers:

```ts
export const ITEMS = {
  Coin: 0,
  Player: 1,
} as const;
```

## 2) Coin object (trigger + render + sound)

```ts
import { GameObject, SquareHitbox, Vector, renderTile } from "sliver-engine";
import type { CanvasController, Scene } from "sliver-engine";

const ITEMS = {
  Coin: 0,
  Player: 1,
} as const;

class Coin extends GameObject {
  constructor(position: Vector) {
    super("coin", position);

    // Trigger: overlap detection without collision resolution.
    this.addHitbox(
      new SquareHitbox(Vector.zero(), new Vector(16, 16), this, {
        solid: false,
      })
    );
  }

  override onColision(other: GameObject): void {
    // Play SFX from the SoundManager, then destroy the coin.
    this.getContext()?.getSoundManager().playSound("coin_pickup");
    this.destroy();

    // Notify whoever tracks score.
    this.sendMessage("score:coin_collected", { amount: 1 });
  }

  @renderTile("items", ITEMS.Coin, { scale: 4 })
  override render(_canvas: CanvasController, _scene: Scene): void {
    // Render is handled by the decorator.
  }
}
```

## 3) Player (hitbox + sprite rendering)

```ts
import { GameObject, SquareHitbox, Vector, renderTile } from "sliver-engine";
import type { CanvasController, Scene } from "sliver-engine";

const ITEMS = {
  Coin: 0,
  Player: 1,
} as const;

class Player extends GameObject {
  constructor(position: Vector) {
    super("player", position);

    this.addHitbox(new SquareHitbox(Vector.zero(), new Vector(16, 16), this));
    this.setPhisics({ immovable: false });
  }

  @renderTile("items", ITEMS.Player, { scale: 4 })
  override render(_canvas: CanvasController, _scene: Scene): void {
    // Render is handled by the decorator.
  }
}
```

## 4) HUD listens to `score:coin_collected`

This HUD object keeps a counter and renders it as text:

```ts
import { GameObject, Vector } from "sliver-engine";
import type { CanvasController, Scene } from "sliver-engine";

class CoinCounter extends GameObject {
  private coins = 0;

  constructor() {
    super("hud:coins", new Vector(0, 0));
  }

  override tick(): void {
    if (this.getContext()) {
      this.onMessage<{ amount: number }>(
        "score:coin_collected",
        ({ amount }) => {
          this.coins += amount;
        }
      );
    }
    super.tick();
  }

  override render(canvas: CanvasController, _scene: Scene): void {
    canvas
      .getShapeDrawer()
      .drawText(`Coins: ${this.coins}`, 16, 24, "white", "16px", "left");
  }
}
```
