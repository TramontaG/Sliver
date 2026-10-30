import type { CanvasController } from "../CanvasController";
import type { GameEvent } from "../Events";
import type { GameObject } from "../GameObject";
import type { GameContext } from "../Context";
import { Vector } from "../Lib/Vector";
import {
	ScenePhysicsWorld,
	resolveSceneTimeStep,
	type GameplayCollisionStepResult,
} from "../Physics";

class Scene {
  private gameObjects: GameObject[] = [];
  private context: GameContext | null = null;
  private offset: Vector = new Vector(0, 0);
  private renderOffset: Vector = Vector.zero();
  private gravity: Vector = Vector.zero();
  private opacity: number = 1;
  private overlayColor: string | null = null;
  private overlayAlpha: number = 0;
  private didSetup: boolean = false;
  private isActive: boolean = false;
  private pendingEnter: boolean = false;
  private physicsWorld: ScenePhysicsWorld = new ScenePhysicsWorld();

  constructor(
    private name: string,
    private backgroundColor?: string,
  ) {}

  setup() {
    console.log(`Setting up scene: ${this.name}`);
  }

  onEnter(): void {}

  onExit(): void {}

  tick(dt?: number) {
    this.gameObjects.forEach((obj) => {
      obj.tick();
    });

    this.physicsWorld.step(
      this.gameObjects,
      this.gravity,
      dt ?? resolveSceneTimeStep(this.context?.getTickRate())
    );
  }

  getGameObjects() {
    return this.gameObjects;
  }

  removeGameObject(gameObject: GameObject) {
    gameObject.notifyRemovedFromScene(this);
    this.gameObjects = this.gameObjects.filter((go) => go !== gameObject);
  }

  getLastPhysicsStepResult(): GameplayCollisionStepResult {
    return this.physicsWorld.getLastStepResult();
  }

  render(canvas: CanvasController) {
    const ctx = this.context?.getCanvas().getContext();
    if (!ctx) {
      return;
    }

    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * this.opacity;

    if (this.backgroundColor) {
      ctx.save();
      ctx.translate(this.renderOffset.x, this.renderOffset.y);
      this.context
        ?.getCanvas()
        .getShapeDrawer()
        .drawBackground(this.backgroundColor);
      ctx.restore();
    }

    const sortedObjects = this.gameObjects
      .map((obj, index) => ({ obj, index }))
      .sort((a, b) => {
        if (a.obj.zIndex !== b.obj.zIndex) {
          return a.obj.zIndex - b.obj.zIndex;
        }
        return a.index - b.index;
      })
      .map(({ obj }) => obj);

    sortedObjects.forEach((obj) => {
      obj.render(canvas, this);
    });

    if (this.overlayColor && this.overlayAlpha > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = previousAlpha * this.overlayAlpha;
      ctx.fillStyle = this.overlayColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    ctx.globalAlpha = previousAlpha;
    this.context?.getCanvas().reset();
  }

  addGameObject(_objects: GameObject | GameObject[]): void {
    const gameObjects = Array.isArray(_objects) ? _objects : [_objects];

    gameObjects.forEach((go) => {
      go.scene = this;
      go.setContext(this.context);
      this.gameObjects.push(go);
      go.notifyAddedToScene(this, this.context);
    });
  }

  handleEvent(event: GameEvent): void {
    this.gameObjects.toReversed().forEach((obj) => {
      if (event.stopPropagation) return;
      obj.handleEvent(event);
    });
  }

  setContext(context: GameContext | null): void {
    this.context = context;
    this.gameObjects.forEach((obj) => {
      obj.setContext(context);
      obj.notifyAddedToScene(this, context);
    });

    if (context && this.pendingEnter) {
      this.pendingEnter = false;
      this.runSetupIfNeeded();
      if (this.isActive) {
        this.onEnter();
      }
    }
  }

  getContext(): GameContext | null {
    return this.context;
  }

  getOffset(): Vector {
    return this.offset;
  }

  setOffset(offset: Vector): void {
    this.offset = offset;
  }

  getRenderOffset(): Vector {
    return this.renderOffset;
  }

  setRenderOffset(offset: Vector): void {
    this.renderOffset = offset;
  }

  getVisualOffset(): Vector {
    return this.offset.toAdded(this.renderOffset);
  }

  getGravity(): Vector {
    return this.gravity;
  }

  setGravity(gravity: Vector): void {
    this.gravity = gravity;
  }

  getOpacity(): number {
    return this.opacity;
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
  }

  setOverlay(color: string | null, alpha: number): void {
    this.overlayColor = color;
    this.overlayAlpha = alpha;
  }

  activate(): void {
    if (this.isActive) {
      if (this.pendingEnter && this.context) {
        this.pendingEnter = false;
        this.runSetupIfNeeded();
        this.onEnter();
      }
      return;
    }

    this.isActive = true;

    if (!this.context) {
      this.pendingEnter = true;
      return;
    }

    this.runSetupIfNeeded();
    this.onEnter();
  }

  deactivate(): void {
    if (!this.isActive) {
      return;
    }
    this.isActive = false;
    this.pendingEnter = false;
    this.onExit();
  }

  private runSetupIfNeeded(): void {
    if (this.didSetup) {
      return;
    }
    this.didSetup = true;
    this.setup();
  }
}

export { Scene };
