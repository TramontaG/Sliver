import type {
  GameEvent,
  KeyPressedEvent,
  MouseButtonPressedEvent,
  MouseButtonReleasedEvent,
  MouseMovedEvent,
  MouseWheelScrolledEvent,
} from ".";
import type { GameObject } from "../GameObject";
import { Vector } from "../Lib/Vector";

type HandleEventMethod<TObj extends GameObject> = (
  this: TObj,
  event: GameEvent,
  ...args: unknown[]
) => unknown;

type MethodDec<T> = (
  target: Object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void;

type KeyTickHandler<TObj extends GameObject = GameObject> = (
  gameObject: TObj
) => void;

const KEY_TICK_HANDLERS = Symbol.for("sliver-engine.keyTickHandlers");

function registerKeyTickHandler<TObj extends GameObject>(
  target: Object,
  handler: KeyTickHandler<TObj>
) {
  const record = target as unknown as Record<symbol, KeyTickHandler<TObj>[]>;
  const existing = record[KEY_TICK_HANDLERS];

  if (existing) {
    existing.push(handler);
  } else {
    record[KEY_TICK_HANDLERS] = [handler];
  }
}

const matchesKeyState = (gameObject: GameObject, keys: string[]): boolean => {
  const context = gameObject.getContext?.();
  if (!context) return false;
  return keys.every((key) => context.isKeyPressed(key));
};

export const composeMethodDecorators = <T>(
  ...decorators: Array<MethodDec<T>>
): MethodDec<T> => {
  return (target, propertyKey, descriptor) => {
    return decorators.reduceRight((desc, dec) => {
      const out = dec(target, propertyKey, desc);
      return (out ?? desc) as TypedPropertyDescriptor<T>;
    }, descriptor);
  };
};

type BeforeColisionMethod<TObj extends GameObject = GameObject> = (
  this: TObj,
  other: GameObject
) => boolean;

/**
 * Decorator for controlling whether a GameObject should handle collisions with another.
 * If `predicate(self, other)` returns `false`, the decorated method returns `false`.
 *
 * Intended usage:
 * - Apply to `GameObject.beforeColision(other)`
 */
export const solidTo = <TObj extends GameObject = GameObject>(
  predicate: (self: TObj, other: GameObject) => boolean
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<BeforeColisionMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (this: TObj, other: GameObject) {
      if (!predicate(this, other)) {
        return false;
      }
      return original.call(this, other);
    };

    return descriptor;
  };
};

/**
 * Decorator for handling mouse clicks on hitboxes.
 */
export const onClick = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: MouseButtonPressedEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseButtonPressed") {
        const hitboxes = this.getHitboxes();
        if (
          hitboxes.some((hitbox) =>
            hitbox.intersectsWithPoint(new Vector(event.x, event.y))
          )
        ) {
          handler(this, event);
        }
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator for handling mouse clicks anywhere on the canvas.
 */
export const onClickAnywhere = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: MouseButtonPressedEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseButtonPressed") {
        handler(this, event);
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator for handling mouse clicks on hitboxes.
 */
export const onMouseRelease = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: MouseButtonReleasedEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseButtonReleased") {
        const hitboxes = this.getHitboxes();
        if (
          hitboxes.some((hitbox) =>
            hitbox.intersectsWithPoint(new Vector(event.x, event.y))
          )
        ) {
          handler(this, event);
        }
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator for handling mouse wheel scrolling anywhere on the canvas.
 */
export const onMouseWheel = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: MouseWheelScrolledEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseWheelScrolled") {
        handler(this, event);
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator for making the GameObject grabbable by the mouse
 * it will check colision with all of its hitboxes and if ANY
 * of them has the mouse inside, the gameObject will follow the
 * mouse.
 */
export const grabbable = <TObj extends GameObject = GameObject>() => {
  type GrabState = {
    offset: Vector;
    samples: Vector[];
    lastTickPosition: Vector | null;
    stationaryTicks: number;
    throwSpeed: Vector;
    lastMouseMoveTimeMs: number | null;
  };

  const STATE = Symbol.for("sliver-engine.grabbableState");
  const getState = (obj: GameObject): GrabState => {
    const record = obj as unknown as Record<symbol, GrabState | undefined>;
    let state = record[STATE];
    if (!state) {
      state = {
        offset: Vector.zero(),
        samples: [],
        lastTickPosition: null,
        stationaryTicks: 0,
        throwSpeed: Vector.zero(),
        lastMouseMoveTimeMs: null,
      };
      record[STATE] = state;
    }
    return state;
  };

  const maxSamples = 10;
  const maxThrowSpeed = 30;
  const stationaryEpsilonSq = 1e-6;
  const stationaryTicksToZero = 2;

  return function (
    target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    registerKeyTickHandler<TObj>(target, (obj) => {
      if (!obj.beingGrabbed) return;

      const state = getState(obj);
      const current = obj.getScenePosition();

      if (!state.lastTickPosition) {
        state.lastTickPosition = current.clone();
        state.samples = [];
        state.stationaryTicks = 0;
        state.throwSpeed = Vector.zero();
        return;
      }

      const delta = current.toSubtracted(state.lastTickPosition);
      state.lastTickPosition = current.clone();

      if (delta.squaredMagnitude() <= stationaryEpsilonSq) {
        state.stationaryTicks++;
        if (state.stationaryTicks >= stationaryTicksToZero) {
          state.samples = [];
          state.throwSpeed = Vector.zero();
        }
        return;
      }

      state.stationaryTicks = 0;
      state.samples.unshift(delta);
      state.samples.length = maxSamples;

      const avg = state.samples.reduce((acc, v) => acc.add(v), Vector.zero());
      if (state.samples.length > 0) {
        avg.multiply(1 / state.samples.length);
      }

      if (avg.magnitude() > maxThrowSpeed) {
        avg.normalize().multiply(maxThrowSpeed);
      }

      state.throwSpeed = avg;
    });

    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      const state = getState(this);

      const sceneOffset = this.scene?.getVisualOffset() ?? Vector.zero();
      const mouseToScene = (x: number, y: number): Vector =>
        new Vector(x, y).toSubtracted(sceneOffset);

      const pointerInside = (x: number, y: number): boolean => {
        const hitboxes = this.getHitboxes();
        return hitboxes.some((hitbox) =>
          hitbox.intersectsWithPoint(new Vector(x, y))
        );
      };

      if (event.type === "mouseButtonPressed") {
        if (pointerInside(event.x, event.y)) {
          this.beingGrabbed = true;
          this.speed = Vector.zero();
          this.angularVelocity = 0;

          const mouseScenePos = mouseToScene(event.x, event.y);
          state.offset = this.getScenePosition().toSubtracted(mouseScenePos);
          state.samples = [];
          state.lastTickPosition = this.getScenePosition();
          state.stationaryTicks = 0;
          state.throwSpeed = Vector.zero();
          state.lastMouseMoveTimeMs = performance.now();

          event.stopPropagation = true;
        }
      }

      if (event.type === "mouseMoved") {
        if (this.beingGrabbed) {
          state.lastMouseMoveTimeMs = performance.now();
          const mouseScenePos = mouseToScene(event.x, event.y);
          this.setPosition(mouseScenePos.toAdded(state.offset));
          this.speed = Vector.zero();
          event.stopPropagation = true;
        } else if (pointerInside(event.x, event.y)) {
          this.hovering = true;
        } else {
          this.hovering = false;
        }
      }

      if (event.type === "mouseButtonReleased") {
        if (this.beingGrabbed) {
          this.beingGrabbed = false;
          const tickRate = this.getContext()?.getTickRate() ?? 60;
          const tickIntervalMs = 1000 / tickRate;
          const now = performance.now();
          const timeSinceMove =
            state.lastMouseMoveTimeMs === null
              ? Number.POSITIVE_INFINITY
              : now - state.lastMouseMoveTimeMs;

          // If the pointer has been still for at least ~1 tick before release,
          // drop the throw velocity to avoid "stale" inertia.
          // state.throwSpeed stores recent drag displacement per tick, so
          // convert it into velocity units before handing it to physics.
          this.speed =
            timeSinceMove >= tickIntervalMs
              ? Vector.zero()
              : state.throwSpeed.clone().multiply(tickRate);
          event.stopPropagation = true;
        }
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator for handling mouse moving over the GameObject
 */
export const onMouseMoved = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: MouseMovedEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseMoved") {
        const hitboxes = this.getHitboxes();
        if (
          hitboxes.some((hitbox) =>
            hitbox.intersectsWithPoint(new Vector(event.x, event.y))
          )
        ) {
          handler(this, event);
        }
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator for handling mouse wheel scrolling over hitboxes.
 */
export const onMouseWheelOverHitbox = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: MouseWheelScrolledEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseWheelScrolled") {
        const hitboxes = this.getHitboxes();
        if (
          hitboxes.some((hitbox) =>
            hitbox.intersectsWithPoint(new Vector(event.x, event.y))
          )
        ) {
          handler(this, event);
        }
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator that runs the handler once when the key becomes pressed.
 */
export function onKeyPressed<TObj extends GameObject = GameObject>(
  key: string,
  handler: (gameObject: TObj, event: KeyPressedEvent) => void
) {
  return onKeyComboPressed([key], handler);
}

/**
 * Decorator that runs the handler every tick while the key is held.
 */
export function onKeyHold<TObj extends GameObject = GameObject>(
  key: string,
  handler: (gameObject: TObj, event: KeyPressedEvent) => void
) {
  return onKeyComboHold([key], handler);
}

/**
 * Decorator that runs the handler once when all keys in the combo become pressed.
 */
export function onKeyComboPressed<TObj extends GameObject = GameObject>(
  keys: string[],
  handler: (gameObject: TObj, event: KeyPressedEvent) => void
) {
  const wasPressedMap = new WeakMap<GameObject, boolean>();

  return function (
    target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    // Register tick handler
    registerKeyTickHandler<TObj>(target, (gameObj) => {
      const pressed = matchesKeyState(gameObj, keys);
      const wasPressed = wasPressedMap.get(gameObj) ?? false;

      if (pressed && !wasPressed) {
        const lastKey = keys[keys.length - 1] ?? "";
        handler(gameObj as TObj, { type: "keyPressed", key: lastKey });
      }

      wasPressedMap.set(gameObj, pressed);
    });

    // Wrap handleEvent so it still receives keyPressed while the tick handler handles the held state
    const original = descriptor.value;
    if (original) {
      descriptor.value = function (
        this: TObj,
        event: GameEvent,
        ...args: unknown[]
      ) {
        return original.call(this, event, ...args);
      };
    }

    return descriptor;
  };
}

/**
 * Decorator that runs the handler every tick while all keys in the combo are held.
 */
export function onKeyComboHold<TObj extends GameObject = GameObject>(
  keys: string[],
  handler: (gameObject: TObj, event: KeyPressedEvent) => void
) {
  return function (
    target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    // Register tick handler
    registerKeyTickHandler<TObj>(target, (gameObj) => {
      if (matchesKeyState(gameObj, keys)) {
        const lastKey = keys[keys.length - 1] ?? "";
        handler(gameObj as TObj, { type: "keyPressed", key: lastKey });
      }
    });

    // Wrap handleEvent so it still receives keyPressed while the tick handler handles the held state
    const original = descriptor.value;
    if (original) {
      descriptor.value = function (
        this: TObj,
        event: GameEvent,
        ...args: unknown[]
      ) {
        return original.call(this, event, ...args);
      };
    }

    return descriptor;
  };
}

export function onChildrenEvents<TObj extends GameObject = GameObject>() {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (this: TObj, event: GameEvent) {
      const result = original.call(this, event);

      if (this.children) {
        for (const child of this.children) {
          if (typeof child.handleEvent === "function") {
            child.handleEvent(event);
          }
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator for handling hover events on hitboxes.
 */
export const onHover = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: GameEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseMoved") {
        const hitboxes = this.getHitboxes();
        const isHovering = hitboxes.some((hitbox) =>
          hitbox.intersectsWithPoint(new Vector(event.x, event.y))
        );
        const gameObject = this;
        const objectWasHovering = !!gameObject.hovering;

        if (isHovering && !objectWasHovering) {
          gameObject.hovering = true;
          handler(this, event);
        }
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

/**
 * Decorator for handling stop hovering events on hitboxes.
 */
export const onStopHovering = <TObj extends GameObject = GameObject>(
  handler: (gameObject: TObj, event: GameEvent) => void
) => {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<HandleEventMethod<TObj>>
  ) {
    const original = descriptor.value;
    if (!original) return descriptor;

    descriptor.value = function (
      this: TObj,
      event: GameEvent,
      ...args: unknown[]
    ) {
      if (event.type === "mouseMoved") {
        const hitboxes = this.getHitboxes();

        const isHovering = hitboxes.some((hitbox) =>
          hitbox.intersectsWithPoint(new Vector(event.x, event.y))
        );

        const gameObject = this as unknown as GameObject;
        const objectWasHovering = !!gameObject.hovering;

        if (!isHovering && objectWasHovering) {
          gameObject.hovering = false;
          handler(this, event);
        }
      }

      return original.call(this, event, ...args);
    };

    return descriptor;
  };
};

export { KEY_TICK_HANDLERS, type KeyTickHandler };
