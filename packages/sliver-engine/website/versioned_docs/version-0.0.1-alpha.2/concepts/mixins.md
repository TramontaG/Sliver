---
title: Mixins
sidebar_position: 9
---

Sliver includes small **method mixins** that let you compose behavior without subclassing. They are plain TypeScript method decorators you can apply to any class method, not just `GameObject` methods.

## Enable decorators in TypeScript

Mixins are decorators, so you must enable them in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Important: decorator syntax and formatters

Because decorators must be a **single expression**, `mixin.before<T>()` needs to be wrapped in parentheses. Some formatters consider those parentheses “unnecessary” and will remove them, which breaks the decorator.

The recommended, formatter-safe pattern is to **create a reusable decorator factory** once, then specialize it where you use it:

```ts
import { mixin } from "sliver-engine";
import type { GameObject } from "sliver-engine";

const before = mixin.before<GameObject>();
```

Then apply it like this:

```ts
import { GameObject } from "sliver-engine";

class Door extends GameObject {
  locked = true;

  @before<Door>((obj) => {
    if (obj.locked) {
      obj.sendMessage("sfx:locked", null);
      return true; // cancel original method
    }
  })
  open() {
    this.locked = false;
  }
}
```

## Available mixins

- `mixin.before<T>()((obj, ...args) => boolean | void)` runs before; return `true` to cancel the original method.
- `mixin.after<T>()((obj, result, ...args) => newResult | void)` runs after; return a value to replace the original result.
- `mixin.replace<T>()((obj, ...args) => result)` bypasses the original method entirely.

## Example: apply mixins to a Scene

Mixins work with any class method, including `Scene` methods:

```ts
import { Scene, mixin } from "sliver-engine";

const before = mixin.before<Scene>();

class PauseScene extends Scene {
  paused = false;

  @before<PauseScene>((scene) => {
    if (!scene.paused) return true; // skip custom logic until paused
  })
  showOverlay() {
    // draw pause UI or trigger a transition
  }
}
```

## Example: same GameObject, different behavior

You can reuse the same class and “swap” behavior per instance by applying mixins to different methods.

```ts
import { GameObject, mixin } from "sliver-engine";

const after = mixin.after<GameObject>();

class Enemy extends GameObject {
  hp = 3;

  @after<Enemy>((obj, result) => {
    if (obj.hp <= 0) {
      obj.sendMessage("enemy:dead", obj.name);
    }
  })
  takeHit(damage: number) {
    this.hp -= damage;
  }
}

class BurningEnemy extends Enemy {
  @after<BurningEnemy>((obj) => {
    obj.sendMessage("enemy:burning", obj.name);
  })
  override takeHit(damage: number) {
    super.takeHit(damage + 1);
  }
}

const grunt = new Enemy("grunt");
const burner = new BurningEnemy("burner");
```

This lets you keep a shared base while layering extra behavior using mixins on specific subclasses.
