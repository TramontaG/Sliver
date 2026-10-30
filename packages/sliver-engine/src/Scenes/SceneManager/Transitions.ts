import type { Scene } from "..";
import { Vector } from "../../Lib/Vector";

type TransitionScenes = {
  from: Scene | null;
  to: Scene;
};

export type SceneTransitionFunction = (
  progress: number,
  scenes: TransitionScenes
) => void;

export type SceneTransition = {
  duration: number;
  easing?: (t: number) => number;
  /**
   * If false, keep the outgoing scene on top during the transition.
   * Useful for pop-like transitions where the previous scene should slide away
   * while revealing the target beneath it.
   */
  incomingOnTop?: boolean;
  setup?: SceneTransitionFunction;
  step: SceneTransitionFunction;
  cleanup?: SceneTransitionFunction;
};

const linearEasing = (t: number) => t;
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const createSceneTransition = (
  step: SceneTransitionFunction,
  options?: {
    duration?: number;
    easing?: (t: number) => number;
    incomingOnTop?: boolean;
    setup?: SceneTransitionFunction;
    cleanup?: SceneTransitionFunction;
  }
): SceneTransition => ({
  duration: options?.duration ?? 500,
  easing: options?.easing,
  incomingOnTop: options?.incomingOnTop,
  setup: options?.setup,
  step,
  cleanup: options?.cleanup,
});

const fadeTransition = (duration: number = 450): SceneTransition =>
  createSceneTransition(
    (progress, { from, to }) => {
      if (from) {
        from.setOpacity(1 - progress);
      }
      to.setOpacity(progress);
    },
    {
      duration,
      setup: (_, { to }) => {
        to.setOpacity(0);
      },
      cleanup: (_, { from, to }) => {
        if (from) {
          from.setOpacity(1);
        }
        to.setOpacity(1);
      },
    }
  );

type SlideDirection = "left" | "right" | "up" | "down";

const defaultSlideDistance = 400;

const resolveSlideDistance = (
  direction: SlideDirection,
  scenes: TransitionScenes,
  distance?: number
): number => {
  if (typeof distance === "number") {
    return distance;
  }

  const canvas = scenes.to.getContext()?.getCanvas().getCanvas();

  if (!canvas) {
    return defaultSlideDistance;
  }

  const isHorizontal = direction === "left" || direction === "right";
  return isHorizontal ? canvas.width : canvas.height;
};

const slideReplace = (
  direction: SlideDirection,
  distance?: number,
  duration: number = 500
): SceneTransition => {
  let offsetVector = Vector.zero();

  return createSceneTransition(
    (progress, { from, to }) => {
      const incomingOffset = offsetVector.toMultiplied(1 - progress);
      to.setRenderOffset(incomingOffset);

      if (from) {
        const outgoingOffset = offsetVector.toMultiplied(-progress);
        from.setRenderOffset(outgoingOffset);
      }
    },
    {
      duration,
      easing: easeInOut,
      setup: (_, scenes) => {
        const resolvedDistance = resolveSlideDistance(
          direction,
          scenes,
          distance
        );
        const directionVectorMap: Record<SlideDirection, Vector> = {
          left: new Vector(-resolvedDistance, 0),
          right: new Vector(resolvedDistance, 0),
          up: new Vector(0, -resolvedDistance),
          down: new Vector(0, resolvedDistance),
        };
        offsetVector = directionVectorMap[direction];

        const { to } = scenes;
        to.setRenderOffset(offsetVector);
        to.setOpacity(1);
      },
      cleanup: (_, { from, to }) => {
        to.setRenderOffset(Vector.zero());
        if (from) {
          from.setRenderOffset(Vector.zero());
        }
      },
    }
  );
};

const slidePush = (
  direction: SlideDirection,
  distance?: number,
  duration: number = 500
): SceneTransition => {
  let offsetVector = Vector.zero();

  return createSceneTransition(
    (progress, { from, to }) => {
      const incomingOffset = offsetVector.toMultiplied(1 - progress);
      to.setRenderOffset(incomingOffset);
    },
    {
      duration,
      easing: easeInOut,
      setup: (_, scenes) => {
        const resolvedDistance = resolveSlideDistance(
          direction,
          scenes,
          distance
        );
        const directionVectorMap: Record<SlideDirection, Vector> = {
          left: new Vector(-resolvedDistance, 0),
          right: new Vector(resolvedDistance, 0),
          up: new Vector(0, -resolvedDistance),
          down: new Vector(0, resolvedDistance),
        };
        offsetVector = directionVectorMap[direction];

        const { to } = scenes;
        to.setRenderOffset(offsetVector);
        to.setOpacity(1);
      },
      cleanup: (_, { from, to }) => {
        to.setRenderOffset(Vector.zero());
      },
    }
  );
};

const slidePop = (
  direction: SlideDirection,
  distance?: number,
  duration: number = 500
): SceneTransition => {
  let offsetVector = Vector.zero();

  return createSceneTransition(
    (progress, { from, to }) => {
      if (from) {
        const outgoingOffset = offsetVector.toMultiplied(-progress);
        from.setRenderOffset(outgoingOffset);
      }
    },
    {
      duration,
      easing: easeInOut,
      incomingOnTop: false,
      setup: (_, scenes) => {
        const resolvedDistance = resolveSlideDistance(
          direction,
          scenes,
          distance
        );
        const directionVectorMap: Record<SlideDirection, Vector> = {
          left: new Vector(-resolvedDistance, 0),
          right: new Vector(resolvedDistance, 0),
          up: new Vector(0, -resolvedDistance),
          down: new Vector(0, resolvedDistance),
        };
        offsetVector = directionVectorMap[direction];

        const { from } = scenes;
        from?.setOpacity(1);
      },
      cleanup: (_, { from, to }) => {
        if (from) {
          from.setRenderOffset(Vector.zero());
        }
      },
    }
  );
};

const colorFlash = (
  color: string = "white",
  duration: number = 750
): SceneTransition =>
  createSceneTransition(
    (progress, { from, to }) => {
      const flashAlpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      if (progress < 0.5) {
        to.setOpacity(0);
        from?.setOpacity(1);
      } else {
        to.setOpacity(1);
        from?.setOpacity(0);
      }

      to.setOverlay(color, flashAlpha);
      if (from) {
        from.setOverlay(color, flashAlpha);
      }
    },
    {
      duration,
      easing: easeInOut,
      setup: (_, { from, to }) => {
        to.setOpacity(0);
        from?.setOpacity(1);
        to.setOverlay(color, 0);
        if (from) {
          from.setOverlay(color, 0);
        }
      },
      cleanup: (_, { from, to }) => {
        to.setOpacity(1);
        from?.setOpacity(1);
        to.setOverlay(null, 0);
        if (from) {
          from.setOverlay(null, 0);
        }
      },
    }
  );

export {
  createSceneTransition,
  fadeTransition,
  slideReplace,
  slidePush,
  slidePop,
  colorFlash,
  easeInOut,
  linearEasing,
};
export type { TransitionScenes, SlideDirection };
