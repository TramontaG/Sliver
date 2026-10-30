import type { GameObject } from "..";
import type { CanvasController } from "../../CanvasController";
import type { Scene } from "../../Scenes";
import type { Vector } from "../../Lib/Vector";

type MirroringMode = "horizontal" | "vertical" | "both" | null;

type AnimationDefinition<TObj extends GameObject> =
  | string[]
  | ((obj: TObj) => string[]);

type OptionValue<TObj extends GameObject, TValue> =
  | TValue
  | ((obj: TObj) => TValue);

type RenderOptions<TObj extends GameObject> = {
  when?: OptionValue<TObj, boolean>;
  scale?: OptionValue<TObj, number>;
  mirroring?: OptionValue<TObj, MirroringMode>;
  overridePosition?: OptionValue<TObj, Vector>;
};

type TileAnimationOptions<TObj extends GameObject> = RenderOptions<TObj> & {
  ticksPerFrame: OptionValue<TObj, number>;
};

const resolveOption = <TObj extends GameObject, TValue>(
  value: OptionValue<TObj, TValue> | undefined,
  fallback: TValue,
  obj: TObj
): TValue => {
  if (typeof value === "function") {
    return (value as (target: TObj) => TValue)(obj);
  }
  return value ?? fallback;
};

export const onColision = <TObj extends GameObject = GameObject>(
  predicate: (self: TObj, other: GameObject) => boolean,
  handler: (self: TObj, other: GameObject) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<
      (this: TObj, other: GameObject, penetration: Vector) => unknown
    >
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      other: GameObject,
      penetration: Vector
    ) {
      if (predicate(this, other)) {
        handler(this, other);
      }

      return original.call(this, other, penetration);
    };

    return descriptor;
  };
};

/**
 * Render a sprite definition by name.
 *
 * @param spriteDefinitionName - Sprite definition name (or a function returning one).
 * @param options - Optional render settings.
 * @param options.when - Render guard; defaults to true.
 * @param options.scale - Scale multiplier; defaults to 1.
 * @param options.mirroring - Mirror mode: horizontal, vertical, both, or null.
 * @param options.overridePosition - Override draw position (defaults to object position).
 *
 * @example
 * @renderSprite("human_down_0", { scale: 2 })
 * @renderSprite((obj) => obj.spriteName, { mirroring: "horizontal" })
 */
export const renderSprite = <TObj extends GameObject = GameObject>(
  spriteDefinitionName: OptionValue<TObj, string>,
  options: RenderOptions<TObj> = {}
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      canvas: CanvasController,
      scene: Scene
    ) {
      const shouldRender = resolveOption(options.when, true, this);
      if (!shouldRender) {
        return original.call(this, canvas, scene);
      }
      const spriteLib = canvas.getSpriteLibrary();
      const context = canvas.getContext();
      const definitionName =
        typeof spriteDefinitionName === "function"
          ? spriteDefinitionName(this)
          : spriteDefinitionName;
      const position = resolveOption(
        options.overridePosition,
        this.getPosition(),
        this
      );
      const resolvedScale = resolveOption(options.scale, 1, this);
      const mirroring = resolveOption(options.mirroring, null, this);
      const mirrorHorizontal =
        mirroring === "horizontal" || mirroring === "both";
      const mirrorVertical = mirroring === "vertical" || mirroring === "both";

      spriteLib.drawSpriteDefinition(
        context,
        definitionName,
        position,
        resolvedScale,
        mirrorHorizontal,
        mirrorVertical
      );

      return original.call(this, canvas, scene);
    };

    return descriptor;
  };
};

/**
 * Render a single tile from a sprite sheet by index.
 *
 * @param spriteSheetName - Sprite sheet name (or a function returning one).
 * @param index - Frame index (or a function returning one).
 * @param options - Optional render settings.
 * @param options.when - Render guard; defaults to true.
 * @param options.scale - Scale multiplier; defaults to 1.
 * @param options.mirroring - Mirror mode: horizontal, vertical, both, or null.
 * @param options.overridePosition - Override draw position (defaults to object position).
 *
 * @example
 * @renderTile("items", 0, { scale: 4 })
 * @renderTile("hero", (obj) => obj.frame, { when: (obj) => obj.visible })
 */
export const renderTile = <TObj extends GameObject = GameObject>(
  spriteSheetName: OptionValue<TObj, string>,
  index: OptionValue<TObj, number>,
  options: RenderOptions<TObj> = {}
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      canvas: CanvasController,
      scene: Scene
    ) {
      const shouldRender = resolveOption(options.when, true, this);
      if (!shouldRender) {
        return original.call(this, canvas, scene);
      }
      const spriteLib = canvas.getSpriteLibrary();
      const context = canvas.getContext();
      const position = resolveOption(
        options.overridePosition,
        this.getPosition(),
        this
      );
      const resolvedIndex = resolveOption(index, 0, this);
      const resolvedScale = resolveOption(options.scale, 1, this);
      const mirroring = resolveOption(options.mirroring, null, this);

      spriteLib.drawSpriteFrame(
        context,
        resolveOption(spriteSheetName, "", this),
        resolvedIndex,
        position,
        resolvedScale,
        mirroring === "horizontal" || mirroring === "both",
        mirroring === "vertical" || mirroring === "both"
      );

      return original.call(this, canvas, scene);
    };

    return descriptor;
  };
};

/**
 * Render a sprite sheet animation by index list.
 *
 * @param spriteSheetName - Sprite sheet name (or a function returning one).
 * @param indexes - Frame index list (or a function returning one).
 * @param options - Animation + render settings.
 * @param options.when - Render guard; defaults to true.
 * @param options.ticksPerFrame - Ticks per frame; required.
 * @param options.scale - Scale multiplier; defaults to 1.
 * @param options.mirroring - Mirror mode: horizontal, vertical, both, or null.
 * @param options.overridePosition - Override draw position (defaults to object position).
 *
 * @example
 * @renderTileAnimation("hero", [0, 1, 2, 3], { ticksPerFrame: 6, scale: 2 })
 * @renderTileAnimation("hero", (obj) => obj.frames, { ticksPerFrame: 4 })
 */
export const renderTileAnimation = <TObj extends GameObject = GameObject>(
  spriteSheetName: OptionValue<TObj, string>,
  indexes: OptionValue<TObj, number[]>,
  options: TileAnimationOptions<TObj>
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;
    descriptor.value = function (
      this: TObj,
      canvas: CanvasController,
      scene: Scene
    ) {
      const shouldRender = resolveOption(options.when, true, this);
      if (!shouldRender) {
        return original.call(this, canvas, scene);
      }

      const spriteLib = canvas.getSpriteLibrary();
      const context = canvas.getContext();
      const gameContext = this.getContext()!;
      const mirroring = resolveOption(options.mirroring, null, this);
      const ticksPerFrame = resolveOption(options.ticksPerFrame, 1, this);
      const position = resolveOption(
        options.overridePosition,
        this.getPosition(),
        this
      );
      const resolvedScale = resolveOption(options.scale, 1, this);

      const resolvedIndexes = resolveOption(indexes, [], this);
      const frameIndex =
        Math.floor(gameContext.getTickCount() / ticksPerFrame) %
        resolvedIndexes.length;
      const spriteIndex = resolvedIndexes[frameIndex]!;

      spriteLib.drawSpriteFrame(
        context,
        resolveOption(spriteSheetName, "", this),
        spriteIndex,
        position,
        resolvedScale,
        mirroring === "horizontal" || mirroring === "both",
        mirroring === "vertical" || mirroring === "both"
      );
      return original.call(this, canvas, scene);
    };
    return descriptor;
  };
};

/**
 * Render a sprite definition animation by name list.
 *
 * @param definitions - Sprite definition names (or a function returning them).
 * @param options - Animation + render settings.
 * @param options.when - Render guard; defaults to true.
 * @param options.ticksPerFrame - Ticks per frame; required.
 * @param options.scale - Scale multiplier; defaults to 1.
 * @param options.mirroring - Mirror mode: horizontal, vertical, both, or null.
 * @param options.overridePosition - Override draw position (defaults to object position).
 *
 * @example
 * @renderSpriteAnimation(["human_down_0", "human_down_1"], { ticksPerFrame: 6 })
 * @renderSpriteAnimation((obj) => obj.frames, { ticksPerFrame: 4, scale: 2 })
 */
export const renderSpriteAnimation = <TObj extends GameObject = GameObject>(
  definitions: AnimationDefinition<TObj>,
  options: TileAnimationOptions<TObj>
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;
    descriptor.value = function (
      this: TObj,
      canvas: CanvasController,
      scene: Scene
    ) {
      const shouldRender = resolveOption(options.when, true, this);
      if (!shouldRender) {
        return original.call(this, canvas, scene);
      }

      const spriteLib = canvas.getSpriteLibrary();
      const context = canvas.getContext();
      const gameContext = this.getContext()!;
      const mirroring = resolveOption(options.mirroring, null, this);
      const ticksPerFrame = resolveOption(options.ticksPerFrame, 1, this);
      const position = resolveOption(
        options.overridePosition,
        this.getPosition(),
        this
      );
      const resolvedScale = resolveOption(options.scale, 1, this);

      const resolvedDefinitions =
        typeof definitions === "function" ? definitions(this) : definitions;
      const frameIndex =
        Math.floor(gameContext.getTickCount() / ticksPerFrame) %
        resolvedDefinitions.length;
      const definitionName = resolvedDefinitions[frameIndex]!;

      spriteLib.drawSpriteDefinition(
        context,
        definitionName,
        position,
        resolvedScale,
        mirroring === "horizontal" || mirroring === "both",
        mirroring === "vertical" || mirroring === "both"
      );
      return original.call(this, canvas, scene);
    };
    return descriptor;
  };
};
