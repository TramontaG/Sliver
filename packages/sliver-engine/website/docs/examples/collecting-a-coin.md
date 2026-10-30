---
title: Collecting a coin
sidebar_position: 1
---
import sandpack1IndexTs from "../sandpack/examples/collecting-a-coin/interactive-example/index.ts?raw";
import sandpack1CoinTs from "../sandpack/examples/collecting-a-coin/interactive-example/Coin.ts?raw";
import sandpack1WalkerPlayerTs from "../sandpack/examples/collecting-a-coin/interactive-example/WalkerPlayer.ts?raw";
import sandpack1HudTs from "../sandpack/examples/collecting-a-coin/interactive-example/Hud.ts?raw";
import sandpack1CoinSoundTs from "../sandpack/examples/collecting-a-coin/interactive-example/coinSound.ts?raw";
import sandpack1CoinSpawnerTs from "../sandpack/examples/collecting-a-coin/interactive-example/CoinSpawner.ts?raw";
import sandpack1MainTs from "../sandpack/examples/collecting-a-coin/interactive-example/main.ts?raw";

This example focuses on the core pickup loop:

- `Coin` is a non-solid trigger hitbox.
- On overlap with the player, coin plays SFX, sends a score message, and destroys itself.
- `CoinCounter` listens to the score message and updates HUD text.
- `WalkerPlayer` moves with `W/A/S/D` inside fixed bounds.

## 1) Coin trigger (the important part)

The coin does not block movement (`solid: false`), it only reacts to overlap:

```ts
class Coin extends GameObject {
  constructor(position: Vector) {
    super("coin", position.clone());
    this.addHitbox(
      new SquareHitbox(Vector.zero(), new Vector(16, 16), this, {
        solid: false,
      }),
    );
  }

  override onColision(other: GameObject): void {
    if (other.name !== "player") return;

    this.getContext()?.getSoundManager().playSound("coin_pickup");
    this.sendMessage("score:coin_collected", { amount: 1 });
    this.destroy();
  }
}
```

## 2) Message-based HUD update

The HUD does not need to know where the coin is. It only listens to a channel:

```ts
class CoinCounter extends GameObject {
  private coins = 0;

  override onAddedToScene(): void {
    this.onMessage<{ amount: number }>("score:coin_collected", ({ amount }) => {
      this.coins += amount;
    });
  }
}
```

## 3) Player movement

The player resets velocity each tick, lets the held keys write the current movement direction, and clamps position to the play area in `tick()`:

```ts
override tick(): void {
  this.speed = Vector.zero();
  super.tick();
}

@onKeyHold<WalkerPlayer>("w", (obj) => obj.speed = new Vector(0, -PLAYER_SPEED))
@onKeyHold<WalkerPlayer>("a", (obj) => obj.speed = new Vector(-PLAYER_SPEED, 0))
@onKeyHold<WalkerPlayer>("s", (obj) => obj.speed = new Vector(0, PLAYER_SPEED))
@onKeyHold<WalkerPlayer>("d", (obj) => obj.speed = new Vector(PLAYER_SPEED, 0))
override handleEvent(event: GameEvent): void {
  super.handleEvent(event);
}
```

## 4) Scene wiring + sound preload

We preload the sound before starting the game and unlock audio on first user input:

```ts
const boot = async (): Promise<void> => {
  const ctx = game.getContext();

  await ctx.getSoundManager().loadSound("coin_pickup", coinAudioUrl, ["sfx"]);

  const unlockAudio = () => void ctx.getSoundManager().unlock();
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  game.start();
};
```

## Interactive example

This sandbox demonstrates trigger pickups and score messages.

- Edit `Coin.ts` to change pickup behavior.
- Edit `WalkerPlayer.ts`, `Hud.ts`, and `main.ts` to tweak movement, HUD, and scene setup.
- Press **Run** to apply changes.

<SandpackExample
files={{
		"/index.ts": {
			code: sandpack1IndexTs,
			readOnly: true,
		},
		"/Coin.ts": sandpack1CoinTs,
		"/WalkerPlayer.ts": sandpack1WalkerPlayerTs,
		"/Hud.ts": sandpack1HudTs,
		"/coinSound.ts": {
			code: sandpack1CoinSoundTs,
			readOnly: true,
		},
		"/CoinSpawner.ts": {
			code: sandpack1CoinSpawnerTs,
			readOnly: true,
		},
		"/main.ts": {
			code: sandpack1MainTs,
			readOnly: true,
		},
	}}
visibleFiles={["/Coin.ts", "/WalkerPlayer.ts", "/Hud.ts", "/main.ts"]}
activeFile="/Coin.ts"
layout="editor-first"
previewHeight={380}
editorHeight={260}
showRunButton
hiddenFiles={[
"/index.html",
"/styles.css",
"/package.json",
"/index.ts",
"/CoinSpawner.ts",
"/coinSound.ts",
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
