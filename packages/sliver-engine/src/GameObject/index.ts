import { CanvasController } from "../CanvasController";
import type { GameEvent } from "../Events";
import type { Scene } from "../Scenes";
import { Vector } from "../Lib/Vector";
import { CircleHitbox, SquareHitbox } from "./Hitboxes";
import type { GameContext, MessageHandler } from "../Context";
import {
  KEY_TICK_HANDLERS,
  onHover,
  onStopHovering,
} from "../Events/decorators";
import type { SceneTransition } from "../Scenes/SceneManager/Transitions";
import type { Walker } from "./Walker";

type GameObjectPhisicsDescriptor = {
  immovable?: boolean;
  restitution?: number;
  affectedByGravity?: boolean;
  friction?: number;
  staticFriction?: number;
  dynamicFriction?: number;
  mass?: number;
  inertiaScale?: number;
};

class GameObject {
  private renderFn = (obj: GameObject, canvas: CanvasController) => {};
  private tickFn = (obj: GameObject) => {};
  private context: GameContext | null = null;
  private didNotifyAddedToScene: boolean = false;
  public hovering?: boolean = false;
  private motherShip: GameObject | null = null;
  public walker: Walker | null = null;
  public speed: Vector = Vector.zero();
  public rotation: number = 0;
  public angularVelocity: number = 0;
  public showOriginDebug: boolean = false;
  public zIndex: number = 0;
  private opacity: number = 1;
  private lastDominantDirection: "up" | "down" | "left" | "right" | null =
    "down";
  private positionRelativeToMotherShip: boolean = false;
  public beingGrabbed: boolean = false;

  public phisics: GameObjectPhisicsDescriptor = {
    immovable: true,
    restitution: 1,
    affectedByGravity: false,
    friction: 0,
    mass: 1,
    inertiaScale: 1,
  };

  public id: string = Math.floor(Math.random() * 0xffffffff).toString(16);

  constructor(
    public name: string,
    private position: Vector,
    public visible: boolean = true,
    public active: boolean = true,
    public hitboxes: (CircleHitbox | SquareHitbox)[] = [],
    public scene: Scene | null = null,
    public children: GameObject[] = [],
    showOriginDebug: boolean = false
  ) {
    this.showOriginDebug = showOriginDebug;
  }

  tick() {
    if (this.active) {
      this.runKeyTickHandlers();
      this.tickFn(this);

      this.walker?.tick();

      for (const child of this.children) {
        child.tick();
      }

      // Using this way messes up with the 'this' keyword
      // this.children.forEach((child) => child.tick());
    }
  }

  onAddedToScene(_scene: Scene, _context: GameContext): void {}

  onRemovedFromScene(_scene: Scene): void {}

  notifyAddedToScene(scene: Scene, context: GameContext | null): void {
    if (this.didNotifyAddedToScene || !context) {
      return;
    }
    this.didNotifyAddedToScene = true;
    this.onAddedToScene(scene, context);
  }

  notifyRemovedFromScene(scene: Scene): void {
    if (!this.didNotifyAddedToScene) {
      return;
    }
    this.didNotifyAddedToScene = false;
    this.onRemovedFromScene(scene);
  }

  /**
   * Runs when an overlap is detected, before resolution/impulses are applied.
   * Return `false` to ignore collision handling with `otherGO`.
   */
  beforeColision(otherGO: GameObject): boolean {
    return true;
  }

  onColision(otherGO: GameObject, penetration: Vector) {}

  destroy() {
    this.active = false;
    this.visible = false;
    // Remove from scene graph and parent to stop rendering/ticking.
    this.motherShip?.removeChild(this);
    this.motherShip = null;
    // Destroy children so they don't linger in the scene.
    this.children.forEach((child) => child.destroy());
    this.scene?.removeGameObject(this);
  }

  setWalker(walker: Walker | null) {
    this.walker = walker;
  }

  setPhisics(phisics: Partial<GameObjectPhisicsDescriptor>) {
    this.phisics = { ...this.phisics, ...phisics };
  }

  setPosition(position: Vector) {
    this.position = position;
  }

  translate(delta: Vector): void {
    this.position.add(delta);
  }

  setMotherShip<Class extends GameObject | null = GameObject>(
    motherShip: Class
  ): void {
    this.motherShip = motherShip;
  }

  getMotherShip<Class extends GameObject = GameObject>(): Class | undefined {
    return this.motherShip as Class | undefined;
  }

  addHitbox(hitbox: CircleHitbox | SquareHitbox): void {
    if (this.hitboxes.length >= 5) {
      console.warn(
        `GameObject ${this.name} has too many hitboxes.` +
          `This may cause performance issues.`
      );
    }
    this.hitboxes.push(hitbox);
  }

  getHitboxes(): (CircleHitbox | SquareHitbox)[] {
    return this.hitboxes;
  }

  getRotationCenter(): Vector {
    if (this.hitboxes.length === 0) {
      return this.getPosition();
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const hitbox of this.hitboxes) {
      if (hitbox instanceof CircleHitbox) {
        const center = hitbox.getAbsolutePosition();
        minX = Math.min(minX, center.x - hitbox.radius);
        maxX = Math.max(maxX, center.x + hitbox.radius);
        minY = Math.min(minY, center.y - hitbox.radius);
        maxY = Math.max(maxY, center.y + hitbox.radius);
        continue;
      }

      const topLeft = hitbox.getAbsolutePosition();
      minX = Math.min(minX, topLeft.x);
      maxX = Math.max(maxX, topLeft.x + hitbox.size.x);
      minY = Math.min(minY, topLeft.y);
      maxY = Math.max(maxY, topLeft.y + hitbox.size.y);
    }

    return new Vector((minX + maxX) / 2, (minY + maxY) / 2);
  }

  render(canvas: CanvasController, scene: Scene): void {
    if (!this.visible) return;

    const renderSelfAndChildren = () => {
      this.walker?.renderDebug(canvas);
      this.renderFn(this, canvas);
      this.children.forEach((child) => child.render(canvas, scene));
    };

    const renderDebug = () => {
      this.hitboxes.forEach((hitbox) => {
        hitbox.renderDebug(canvas);
      });

      if (this.showOriginDebug) {
        const origin = this.getPosition();
        canvas
          .getShapeDrawer()
          .drawCircle(origin.x, origin.y, 8, "red", true, true, "white", 4);
      }
    };

    const renderAll = () => {
      if (this.rotation !== 0) {
        const center = this.getRotationCenter();
        canvas
          .getShapeDrawer()
          .withRotation(center.x, center.y, this.rotation, () => {
            renderSelfAndChildren();
            renderDebug();
          });
        return;
      }

      renderSelfAndChildren();
      renderDebug();
    };

    if (this.opacity < 1) {
      canvas.getShapeDrawer().withOpacity(this.opacity, renderAll);
      return;
    }

    renderAll();
  }

  setOriginDebug(show: boolean): void {
    this.showOriginDebug = show;
  }

  addChild(child: GameObject): void {
    child.setMotherShip(this);
    child.scene = this.scene;
    child.setContext(this.context);
    this.children.push(child);
    if (this.scene) {
      child.notifyAddedToScene(this.scene, this.context);
    }
  }

  removeChild(gameObject: GameObject): void {
    if (this.scene) {
      gameObject.notifyRemovedFromScene(this.scene);
    }
    this.children = this.children.filter((child) => child !== gameObject);
  }

  getDominantDirection(): "up" | "down" | "left" | "right" | null {
    if (this.speed.isZero()) return this.lastDominantDirection;

    const movement = this.speed.toNormalized();

    const directions: Array<{
      dir: "up" | "down" | "left" | "right";
      vec: Vector;
    }> = [
      { dir: "down", vec: new Vector(0, 1) },
      { dir: "up", vec: new Vector(0, -1) },
      { dir: "left", vec: new Vector(-1, 0) },
      { dir: "right", vec: new Vector(1, 0) },
    ];

    const initial = directions[0]!;
    const best = directions.slice(1).reduce(
      (current, candidate) => {
        const candidateScore = movement.dotProduct(candidate.vec);
        return candidateScore > current.score
          ? { dir: candidate.dir, score: candidateScore }
          : current;
      },
      {
        dir: initial.dir,
        score: movement.dotProduct(initial.vec),
      }
    );

    this.lastDominantDirection = best.dir;
    return this.lastDominantDirection;
  }

  getChildren(): GameObject[] {
    return this.children;
  }

  getChildByName(name: string): GameObject | null {
    return this.children.find((child) => child.name === name) || null;
  }

  getPosition(): Vector {
    const sceneOffset = this.scene ? this.scene.getVisualOffset() : Vector.zero();
    const absolute = this.getAbsolutePosition();
    return absolute.toAdded(sceneOffset);
  }

  /**
   * Position in scene/world space (not camera/canvas space).
   * This does not include the Scene's offset.
   */
  getScenePosition(): Vector {
    return this.getAbsolutePosition();
  }

  protected getAbsolutePosition(): Vector {
    if (this.positionRelativeToMotherShip && this.motherShip) {
      return this.motherShip.getAbsolutePosition().toAdded(this.position);
    }
    return this.position.clone();
  }

  setPositionRelativeToMotherShip(useRelative: boolean): void {
    this.positionRelativeToMotherShip = useRelative;
  }

  isPositionRelativeToMotherShip(): boolean {
    return this.positionRelativeToMotherShip;
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }

  getOpacity(): number {
    return this.opacity;
  }

  isVisible(): boolean {
    return this.visible;
  }

  isActive(): boolean {
    return this.active;
  }

  setRenderFunction(
    fn: (obj: GameObject, canvas: CanvasController) => void
  ): void {
    this.renderFn = fn;
  }

  setTickFunction(fn: (obj: GameObject) => void): void {
    this.tickFn = fn;
  }

  @onHover<GameObject>((obj, event) => {
    obj.hovering = true;
  })
  @onStopHovering<GameObject>((obj, event) => {
    obj.hovering = false;
  })
  handleEvent(event: GameEvent): void {}

  setContext(context: GameContext | null): void {
    this.context = context;
    this.children.forEach((child) => {
      child.setContext(context);
      if (this.scene) {
        child.notifyAddedToScene(this.scene, context);
      }
    });
  }

  getContext(): GameContext | null {
    return this.context;
  }

  onMessage<TPayload>(
    channel: string,
    handler: MessageHandler<TPayload>
  ): () => void {
    if (!this.context) {
      return () => {};
    }

    return this.context.subscribeToMessage(channel, handler);
  }

  onceOnMessage<TPayload>(
    channel: string,
    handler: MessageHandler<TPayload>
  ): () => void {
    let unsubscribe: () => void = () => {};

    unsubscribe = this.onMessage(channel, (payload: any, sender) => {
      unsubscribe();
      handler(payload, sender);
    });

    return unsubscribe;
  }

  sendMessage<TPayload>(channel: string, payload: TPayload): void {
    this.context?.sendMessage(channel, payload, this);
  }

  private runKeyTickHandlers(): void {
    const handlers: Array<(obj: GameObject) => void> = [];

    let proto = Object.getPrototypeOf(this);

    // acumulate handlers from the prototype chain
    // this includes this class and all its superclasses
    // neat JS trick!
    while (proto) {
      const protoHandlers = (proto as Record<symbol, unknown>)[
        KEY_TICK_HANDLERS
      ] as Array<(obj: GameObject) => void> | undefined;
      if (protoHandlers) {
        handlers.push(...protoHandlers);
      }
      proto = Object.getPrototypeOf(proto);
    }

    handlers.forEach((handler) => handler(this));
  }

}

export { GameObject };
