import type { GameObject } from ".";
import type { CanvasController } from "../CanvasController";
import { MinHeap } from "../Lib/MinHeap";
import { PathfindingProxy } from "../Lib/PathfindingProxy";
import { Vector } from "../Lib/Vector";
import { resolveSceneTimeStep } from "../Physics/ScenePhysicsWorld";
import { CircleHitbox, SquareHitbox } from "./Hitboxes";

type WalkerPathRecalculationContext = {
  walker: Walker;
  gameObject: GameObject;
  scene: GameObject["scene"];
  sceneObjects: GameObject[];
  tick: number;
  start: Vector;
  goal: Vector;
  currentPath: ReadonlyArray<Vector>;
  currentPathIndex: number;
};

type WalkerPathNotFoundBehavior = "throw" | "stop" | "snap" | "continue";

type WalkerPathNotFoundResolution =
  | WalkerPathNotFoundBehavior
  | { behavior: Exclude<WalkerPathNotFoundBehavior, "snap"> }
  | { behavior: "snap"; goal?: Vector };

type WalkerPathNotFoundContext = {
  walker: Walker;
  gameObject: GameObject;
  scene: GameObject["scene"];
  start: Vector;
  goal: Vector;
  obstacleHitboxes: ReadonlyArray<SquareHitbox | CircleHitbox>;
};

type WalkerPathfindingOptions = {
  avoidObstacles?: boolean;
  gridCellSize?: number;
  recalculateEveryTicks?: number;
  shouldRecalculatePath?: (ctx: WalkerPathRecalculationContext) => boolean;
  maxExpandedNodes?: number;
  maxSearchRadiusTiles?: number;
  pathNotFoundBehavior?: WalkerPathNotFoundBehavior;
  snapTargetToEdgeDistance?: number;
  onPathNotFound?: (
    ctx: WalkerPathNotFoundContext
  ) => WalkerPathNotFoundResolution | void;
};

type ResolvedWalkerPathfindingOptions = Required<WalkerPathfindingOptions>;

type Tile = { x: number; y: number };

type WalkerSnapCandidate = {
  point: Vector;
  goalDistanceSquared: number;
};

const WALKER_DEBUG_STROKE_WIDTH = 2;
const WALKER_REACHED_DISTANCE_SQUARED = 0.5;

const normalizePathfindingOptions = (
  options?: WalkerPathfindingOptions
): ResolvedWalkerPathfindingOptions => {
  const gridCellSize = Math.max(1, Math.floor(options?.gridCellSize ?? 16));
  const recalculateEveryTicks =
    options?.recalculateEveryTicks == null
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Math.floor(options.recalculateEveryTicks));

  const maxExpandedNodes =
    options?.maxExpandedNodes == null
      ? 20_000
      : Math.max(1, Math.floor(options.maxExpandedNodes));

  const maxSearchRadiusTiles =
    options?.maxSearchRadiusTiles == null
      ? 256
      : Math.max(1, Math.floor(options.maxSearchRadiusTiles));

  const snapTargetToEdgeDistance = Math.max(
    0,
    options?.snapTargetToEdgeDistance ?? gridCellSize
  );

  return {
    avoidObstacles: options?.avoidObstacles ?? false,
    gridCellSize,
    recalculateEveryTicks,
    shouldRecalculatePath: options?.shouldRecalculatePath ?? (() => false),
    maxExpandedNodes,
    maxSearchRadiusTiles,
    pathNotFoundBehavior: options?.pathNotFoundBehavior ?? "throw",
    snapTargetToEdgeDistance,
    onPathNotFound: options?.onPathNotFound ?? (() => undefined),
  };
};

class Walker {
  private waypointIndex: number = 0;
  private active: boolean = false;
  private ciclic: boolean;
  private onComplete?: () => void;
  private pathfindingOptions: ResolvedWalkerPathfindingOptions =
    normalizePathfindingOptions();
  private currentPath: Vector[] = [];
  private currentPathIndex: number = 0;
  private recalcRequested: boolean = true;
  private tickCounter: number = 0;
  private adjustedWaypoint: Vector | null = null;
  private pathfindingPaused: boolean = false;
  private pathfindingProxy: {
    proxy: PathfindingProxy;
    signature: string;
  } | null = null;

  constructor(
    private gameObject: GameObject,
    private waypoints: Vector[] = [],
    private speed: number,
    private debug = false,
    ciclic = true,
    pathfindingOptions?: WalkerPathfindingOptions
  ) {
    this.ciclic = ciclic;
    if (pathfindingOptions) {
      this.pathfindingOptions = normalizePathfindingOptions(pathfindingOptions);
    }
  }

  public getTargetedWaypoint() {
    if (this.waypoints.length === 0) return null;

    if (this.ciclic) {
      return this.waypoints[this.waypointIndex % this.waypoints.length]!;
    }

    const clampedIndex = Math.min(
      this.waypointIndex,
      this.waypoints.length - 1
    );
    return this.waypoints[clampedIndex]!;
  }

  private nextWaypoint(): Vector {
    if (!this.ciclic && this.waypointIndex >= this.waypoints.length - 1) {
      return this.waypoints[this.waypoints.length - 1]!;
    }

    this.waypointIndex = this.ciclic
      ? (this.waypointIndex + 1) % this.waypoints.length
      : this.waypointIndex + 1;
    this.adjustedWaypoint = null;
    return this.getTargetedWaypoint()!;
  }

  public setWaypoints(waypoints: Vector[], ciclic: boolean = false): void {
    this.waypoints = waypoints;
    this.ciclic = ciclic;
    this.waypointIndex = 0;
    this.active = false;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.recalcRequested = true;
    this.adjustedWaypoint = null;
    this.gameObject.speed = Vector.zero();
  }

  public isActive(): boolean {
    return this.active;
  }

  public setOnComplete(callback: () => void) {
    this.onComplete = callback;
    return this;
  }

  public toggle() {
    this.active = !this.active;
    if (!this.active) {
      this.gameObject.speed = Vector.zero(); //stop moving
      return;
    }
    this.recalcRequested = true;
  }

  public start() {
    this.active = true;
    this.recalcRequested = true;
    return this;
  }

  public reset() {
    this.waypointIndex = 0;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.recalcRequested = true;
    this.adjustedWaypoint = null;
  }

  public hardReset() {
    this.waypointIndex = 0;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.recalcRequested = true;
    this.adjustedWaypoint = null;
    if (!this.waypoints[0]) {
      return console.warn(
        `${this.gameObject.name} has no waypoints, impossible to hard reset it's walker!`
      );
    }
    this.gameObject.setPosition(this.waypoints[0]);
  }

  public setPathfindingOptions(options: WalkerPathfindingOptions): this {
    this.pathfindingOptions = normalizePathfindingOptions(options);
    this.requestPathRecalculation();
    return this;
  }

  public requestPathRecalculation(): void {
    this.recalcRequested = true;
  }

  public isPathfindingPaused(): boolean {
    return this.pathfindingPaused;
  }

  public pausePathfinding(): this {
    this.pathfindingPaused = true;
    return this;
  }

  public resumePathfinding(): this {
    this.pathfindingPaused = false;
    this.requestPathRecalculation();
    return this;
  }

  public abortPathfinding(): this {
    this.pathfindingPaused = true;
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.adjustedWaypoint = null;
    this.recalcRequested = false;
    this.gameObject.speed = Vector.zero();
    return this;
  }

  public getCurrentPath(): Vector[] {
    return this.currentPath.slice(this.currentPathIndex).map((p) => p.clone());
  }

  private getTickDt(): number {
    return resolveSceneTimeStep(this.gameObject.getContext()?.getTickRate());
  }

  private hasReachedTarget(currentPosition: Vector, target: Vector): boolean {
    return (
      target.toSubtracted(currentPosition).squaredMagnitude() <=
      WALKER_REACHED_DISTANCE_SQUARED
    );
  }

  private compactCurrentPathIfNeeded(): void {
    if (this.currentPathIndex < 64) return;
    if (this.currentPathIndex < Math.floor(this.currentPath.length / 2)) return;
    this.currentPath = this.currentPath.slice(this.currentPathIndex);
    this.currentPathIndex = 0;
  }

  private getSolidHitboxes(
    obj: GameObject
  ): Array<SquareHitbox | CircleHitbox> {
    return obj.getHitboxes().filter((hitbox) => hitbox.solid);
  }

  private getObstacleHitboxes(
    scene: GameObject["scene"]
  ): Array<SquareHitbox | CircleHitbox> {
    if (!scene) return [];
    const obstacleHitboxes: Array<SquareHitbox | CircleHitbox> = [];
    for (const obj of scene.getGameObjects()) {
      if (obj === this.gameObject) continue;
      if (!obj.isActive()) continue;
      const solid = this.getSolidHitboxes(obj);
      if (solid.length === 0) continue;
      obstacleHitboxes.push(...solid);
    }
    return obstacleHitboxes;
  }

  private ensurePathfindingProxy(): PathfindingProxy | null {
    const solid = this.getSolidHitboxes(this.gameObject);
    if (solid.length === 0) {
      return null;
    }

    const signature = solid
      .map((hitbox) => {
        if (hitbox instanceof CircleHitbox) {
          return `c:${hitbox.offset.x},${hitbox.offset.y},${hitbox.radius}`;
        }
        return `s:${hitbox.offset.x},${hitbox.offset.y},${hitbox.size.x},${hitbox.size.y}`;
      })
      .join("|");

    if (this.pathfindingProxy?.signature === signature) {
      return this.pathfindingProxy.proxy;
    }

    const proxy = new PathfindingProxy(this.gameObject.getPosition().clone());
    proxy.rotation = this.gameObject.rotation ?? 0;
    proxy.angularVelocity = 0;

    proxy.hitboxes = solid.map((hitbox) => {
      if (hitbox instanceof CircleHitbox) {
        return new CircleHitbox(
          hitbox.offset.clone(),
          hitbox.radius,
          proxy as unknown as GameObject,
          { debug: false, solid: true }
        );
      }
      return new SquareHitbox(
        hitbox.offset.clone(),
        hitbox.size.clone(),
        proxy as unknown as GameObject,
        { debug: false, solid: true }
      );
    });

    this.pathfindingProxy = { proxy, signature };
    return proxy;
  }

  private tileKey(tile: Tile): string {
    return `${tile.x},${tile.y}`;
  }

  private worldToTile(position: Vector, cellSize: number): Tile {
    return {
      x: Math.floor(position.x / cellSize),
      y: Math.floor(position.y / cellSize),
    };
  }

  private tileToWorldCenter(tile: Tile, cellSize: number): Vector {
    return new Vector((tile.x + 0.5) * cellSize, (tile.y + 0.5) * cellSize);
  }

  private isProxyPositionFree(
    proxy: PathfindingProxy,
    proxyScenePosition: Vector,
    obstacleHitboxes: Array<SquareHitbox | CircleHitbox>
  ): boolean {
    proxy.rotation = this.gameObject.rotation ?? 0;
    proxy.speed = Vector.zero();

    const sceneOffset = this.gameObject.scene?.getVisualOffset() ?? Vector.zero();
    proxy.setPosition(proxyScenePosition.toAdded(sceneOffset));

    for (const selfHitbox of proxy.hitboxes) {
      for (const obstacleHitbox of obstacleHitboxes) {
        if (selfHitbox.intersects(obstacleHitbox)) {
          return false;
        }
      }
    }

    return true;
  }

  private isProxyEdgeFree(
    proxy: PathfindingProxy,
    fromScenePosition: Vector,
    toScenePosition: Vector,
    obstacleHitboxes: Array<SquareHitbox | CircleHitbox>
  ): boolean {
    const edge = toScenePosition.toSubtracted(fromScenePosition);
    const distance = edge.magnitude();
    const sampleSpacing = Math.max(1, this.pathfindingOptions.gridCellSize * 0.5);
    const sampleCount = Math.max(1, Math.ceil(distance / sampleSpacing));

    for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex++) {
      const progress = sampleIndex / sampleCount;
      const samplePosition = fromScenePosition.toAdded(
        edge.toMultiplied(progress)
      );
      if (!this.isProxyPositionFree(proxy, samplePosition, obstacleHitboxes)) {
        return false;
      }
    }

    return true;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getSnappedGoals(
    goalScenePosition: Vector,
    obstacleHitboxes: Array<SquareHitbox | CircleHitbox>,
    proxy: PathfindingProxy
  ): Vector[] {
    const snapDistance = this.pathfindingOptions.snapTargetToEdgeDistance;
    if (snapDistance <= 0) return [];
    const snapStep = Math.max(
      1,
      Math.min(4, Math.floor(this.pathfindingOptions.gridCellSize * 0.25) || 1)
    );
    const seenCandidates = new Set<string>();
    const candidates: WalkerSnapCandidate[] = [];

    const registerCandidate = (candidateScenePosition: Vector): void => {
      const goalDistanceSquared = candidateScenePosition
        .toSubtracted(goalScenePosition)
        .squaredMagnitude();

      if (goalDistanceSquared > snapDistance * snapDistance) {
        return;
      }

      const candidateKey = `${candidateScenePosition.x.toFixed(3)},${candidateScenePosition.y.toFixed(3)}`;

      if (seenCandidates.has(candidateKey)) {
        return;
      }

      if (
        !this.isProxyPositionFree(
          proxy,
          candidateScenePosition,
          obstacleHitboxes
        )
      ) {
        return;
      }

      seenCandidates.add(candidateKey);
      candidates.push({
        point: candidateScenePosition,
        goalDistanceSquared,
      });
    };

    registerCandidate(goalScenePosition.clone());

    const maxRadius = Math.ceil(snapDistance / snapStep) * snapStep;
    for (let radius = snapStep; radius <= maxRadius; radius += snapStep) {
      for (let dx = -radius; dx <= radius; dx += snapStep) {
        registerCandidate(goalScenePosition.toAdded(new Vector(dx, -radius)));
        registerCandidate(goalScenePosition.toAdded(new Vector(dx, radius)));
      }

      for (let dy = -radius + snapStep; dy <= radius - snapStep; dy += snapStep) {
        registerCandidate(goalScenePosition.toAdded(new Vector(-radius, dy)));
        registerCandidate(goalScenePosition.toAdded(new Vector(radius, dy)));
      }
    }

    candidates.sort((a, b) => {
      return a.goalDistanceSquared - b.goalDistanceSquared;
    });

    return candidates.map((candidate) => candidate.point.clone());
  }

  private resolvePathNotFound(
    startScenePosition: Vector,
    goalScenePosition: Vector,
    obstacleHitboxes: Array<SquareHitbox | CircleHitbox>,
    proxy: PathfindingProxy
  ): { stop: boolean } {
    const context: WalkerPathNotFoundContext = {
      walker: this,
      gameObject: this.gameObject,
      scene: this.gameObject.scene,
      start: startScenePosition,
      goal: goalScenePosition,
      obstacleHitboxes,
    };

    const decision = this.pathfindingOptions.onPathNotFound(context);
    const resolved =
      typeof decision === "string" ? { behavior: decision } : decision;

    const behavior =
      resolved?.behavior ?? this.pathfindingOptions.pathNotFoundBehavior;

    if (behavior === "throw") {
      throw new Error(
        `Walker could not find a path for ${this.gameObject.name} to ${goalScenePosition.x},${goalScenePosition.y}.`
      );
    }

    if (behavior === "stop") {
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.adjustedWaypoint = null;
      this.gameObject.speed = Vector.zero();
      this.active = false;
      return { stop: true };
    }

    if (behavior === "continue") {
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.adjustedWaypoint = null;
      return { stop: false };
    }

    const snapGoals =
      resolved && "goal" in resolved && resolved.goal
        ? [resolved.goal.clone()]
        : this.getSnappedGoals(goalScenePosition, obstacleHitboxes, proxy);

    if (snapGoals.length === 0) {
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.adjustedWaypoint = null;
      this.gameObject.speed = Vector.zero();
      this.active = false;
      return { stop: true };
    }

    for (const snapGoal of snapGoals) {
      const snapResult = this.computePathToTarget(startScenePosition, snapGoal);
      if (snapResult.status === "found") {
        this.currentPath = snapResult.path;
        this.currentPathIndex = 0;
        this.adjustedWaypoint = snapGoal.clone();
        return { stop: false };
      }

      if (snapResult.status === "skipped") {
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.adjustedWaypoint = snapGoal.clone();
        return { stop: false };
      }
    }

    this.currentPath = [];
    this.currentPathIndex = 0;
    this.adjustedWaypoint = null;
    this.gameObject.speed = Vector.zero();
    this.active = false;
    return { stop: true };
  }

  private computePathToTarget(
    startScenePosition: Vector,
    goalScenePosition: Vector
  ): {
    status: "skipped" | "found" | "no_path";
    path: Vector[];
    obstacleHitboxes?: Array<SquareHitbox | CircleHitbox>;
    proxy?: PathfindingProxy;
  } {
    if (!this.pathfindingOptions.avoidObstacles) {
      return { status: "skipped", path: [] };
    }

    const scene = this.gameObject.scene;
    if (!scene) {
      return { status: "skipped", path: [] };
    }

    const proxy = this.ensurePathfindingProxy();
    if (!proxy) {
      return { status: "skipped", path: [] };
    }

    const obstacleHitboxes = this.getObstacleHitboxes(scene);
    if (obstacleHitboxes.length === 0) {
      return { status: "skipped", path: [] };
    }

    const cellSize = this.pathfindingOptions.gridCellSize;
    const startTile = this.worldToTile(startScenePosition, cellSize);
    const goalTile = this.worldToTile(goalScenePosition, cellSize);

    const startKey = this.tileKey(startTile);
    const goalKey = this.tileKey(goalTile);

    const isInSearchRadius = (tile: Tile): boolean => {
      const dx = Math.abs(tile.x - startTile.x);
      const dy = Math.abs(tile.y - startTile.y);
      return (
        dx <= this.pathfindingOptions.maxSearchRadiusTiles &&
        dy <= this.pathfindingOptions.maxSearchRadiusTiles
      );
    };

    const walkableCache = new Map<string, boolean>();

    const isTileWalkable = (tile: Tile): boolean => {
      const key = this.tileKey(tile);
      if (key === startKey) return true;
      if (key === goalKey) {
        return this.isProxyPositionFree(
          proxy,
          goalScenePosition,
          obstacleHitboxes
        );
      }
      if (!isInSearchRadius(tile)) return false;
      const cached = walkableCache.get(key);
      if (cached != null) return cached;

      const worldCenter = this.tileToWorldCenter(tile, cellSize);
      const ok = this.isProxyPositionFree(proxy, worldCenter, obstacleHitboxes);
      walkableCache.set(key, ok);
      return ok;
    };

    const heuristic = (a: Tile, b: Tile): number =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    type Node = {
      tile: Tile;
      g: number;
      f: number;
    };

    const open = new MinHeap<Node>((n) => n.f);
    open.push({ tile: startTile, g: 0, f: heuristic(startTile, goalTile) });

    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startKey, 0]]);

    const dirs: Tile[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    let expanded = 0;

    while (
      open.size > 0 &&
      expanded < this.pathfindingOptions.maxExpandedNodes
    ) {
      expanded++;
      const current = open.pop()!;
      const currentKey = this.tileKey(current.tile);

      if (currentKey === goalKey) {
        const tiles: Tile[] = [goalTile];
        let cursorKey = goalKey;
        while (cursorKey !== startKey) {
          const parentKey = cameFrom.get(cursorKey);
          if (!parentKey) break;
          const [x, y] = parentKey.split(",").map((v) => Number(v)!);
          tiles.push({ x: x!, y: y! });
          cursorKey = parentKey;
        }
        tiles.reverse();

        const centers = tiles.map((tile) => {
          const key = this.tileKey(tile);
          if (key === goalKey) return goalScenePosition.clone();
          return this.tileToWorldCenter(tile, cellSize);
        });

        const path = centers.slice(1);
        if (path.length === 0) {
          return { status: "found", path: [] };
        }

        return { status: "found", path: this.simplifyPath(path) };
      }

      for (const dir of dirs) {
        const neighbor: Tile = {
          x: current.tile.x + dir.x,
          y: current.tile.y + dir.y,
        };

        if (!isTileWalkable(neighbor)) continue;

        const currentWorld = this.tileToWorldCenter(current.tile, cellSize);
        const neighborKey = this.tileKey(neighbor);
        const neighborWorld =
          neighborKey === goalKey
            ? goalScenePosition
            : this.tileToWorldCenter(neighbor, cellSize);
        if (
          currentKey !== startKey &&
          !this.isProxyEdgeFree(
            proxy,
            currentWorld,
            neighborWorld,
            obstacleHitboxes
          )
        ) {
          continue;
        }

        const tentativeG = current.g + 1;
        const bestKnownG = gScore.get(neighborKey);

        if (bestKnownG != null && tentativeG >= bestKnownG) {
          continue;
        }

        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        open.push({
          tile: neighbor,
          g: tentativeG,
          f: tentativeG + heuristic(neighbor, goalTile),
        });
      }
    }

    return { status: "no_path", path: [], obstacleHitboxes, proxy };
  }

  private getCurrentPathValidationTargets(goalScenePosition: Vector): Vector[] {
    const remainingPath = this.currentPath
      .slice(this.currentPathIndex)
      .map((node) => node.clone());

    if (remainingPath.length === 0) {
      return [goalScenePosition.clone()];
    }

    const lastNode = remainingPath[remainingPath.length - 1]!;
    if (!lastNode.equals(goalScenePosition)) {
      remainingPath.push(goalScenePosition.clone());
    }

    return remainingPath;
  }

  private isCurrentPathStillValid(
    startScenePosition: Vector,
    goalScenePosition: Vector
  ): boolean {
    const scene = this.gameObject.scene;
    if (!scene) {
      return true;
    }

    const proxy = this.ensurePathfindingProxy();
    if (!proxy) {
      return true;
    }

    const obstacleHitboxes = this.getObstacleHitboxes(scene);
    if (obstacleHitboxes.length === 0) {
      return true;
    }

    let previous = startScenePosition;
    const targets = this.getCurrentPathValidationTargets(goalScenePosition);

    for (const target of targets) {
      if (!this.isProxyEdgeFree(proxy, previous, target, obstacleHitboxes)) {
        return false;
      }
      previous = target;
    }

    return true;
  }

  private simplifyPath(path: Vector[]): Vector[] {
    if (path.length <= 2) return path;
    const simplified: Vector[] = [path[0]!.clone()];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = simplified[simplified.length - 1]!;
      const current = path[i]!;
      const next = path[i + 1]!;

      const a = current.toSubtracted(prev);
      const b = next.toSubtracted(current);

      const cross = a.x * b.y - a.y * b.x;
      const collinear = Math.abs(cross) < 0.0001;
      const sameDirection = a.dotProduct(b) >= 0;

      if (collinear && sameDirection) {
        continue;
      }

      simplified.push(current.clone());
    }

    simplified.push(path[path.length - 1]!.clone());
    return simplified;
  }

  public tick() {
    if (!this.active || this.waypoints.length === 0) {
      return;
    }

    this.tickCounter++;

    let currentPosition = this.gameObject.getScenePosition();
    let targetedWaypoint = this.getTargetedWaypoint();
    if (!targetedWaypoint) {
      this.onComplete?.();
      return;
    }

    if (!this.pathfindingOptions.avoidObstacles) {
      this.currentPath = [];
      this.currentPathIndex = 0;
      this.recalcRequested = false;
      this.adjustedWaypoint = null;
    } else if (this.pathfindingPaused) {
      this.recalcRequested = false;
    } else {
      const shouldRecalculate =
        this.recalcRequested ||
        this.tickCounter % this.pathfindingOptions.recalculateEveryTicks ===
          0 ||
        this.pathfindingOptions.shouldRecalculatePath({
          walker: this,
          gameObject: this.gameObject,
          scene: this.gameObject.scene,
          sceneObjects: this.gameObject.scene?.getGameObjects() ?? [],
          tick: this.tickCounter,
          start: currentPosition,
          goal: targetedWaypoint,
          currentPath: this.currentPath,
          currentPathIndex: this.currentPathIndex,
        });

      if (shouldRecalculate) {
        this.recalcRequested = false;
        const currentPathTarget = this.adjustedWaypoint ?? targetedWaypoint;
        if (this.isCurrentPathStillValid(currentPosition, currentPathTarget)) {
          // Keep following the current path if it still clears the latest obstacle layout.
        } else {
          const pathResult = this.computePathToTarget(
            currentPosition,
            targetedWaypoint
          );
          if (pathResult.status === "found") {
            this.currentPath = pathResult.path;
            this.currentPathIndex = 0;
            this.adjustedWaypoint = null;
          } else if (pathResult.status === "skipped") {
            this.currentPath = [];
            this.currentPathIndex = 0;
            this.adjustedWaypoint = null;
          } else if (pathResult.obstacleHitboxes && pathResult.proxy) {
            const result = this.resolvePathNotFound(
              currentPosition,
              targetedWaypoint,
              pathResult.obstacleHitboxes,
              pathResult.proxy
            );
            if (result.stop) {
              return;
            }
          }
        }
      }
    }

    // Drop nodes that were reached via collisions/teleports.
    while (
      this.currentPathIndex < this.currentPath.length &&
      this.hasReachedTarget(
        currentPosition,
        this.currentPath[this.currentPathIndex]!
      )
    ) {
      this.currentPathIndex++;
    }
    this.compactCurrentPathIfNeeded();

    if (
      this.pathfindingOptions.avoidObstacles &&
      this.pathfindingPaused &&
      this.currentPathIndex >= this.currentPath.length &&
      !this.adjustedWaypoint
    ) {
      this.gameObject.speed = Vector.zero();
      return;
    }

    const currentWaypointTarget = this.adjustedWaypoint ?? targetedWaypoint;
    if (
      this.currentPathIndex >= this.currentPath.length &&
      this.hasReachedTarget(currentPosition, currentWaypointTarget)
    ) {
      currentPosition = currentWaypointTarget.clone();
      this.gameObject.setPosition(currentPosition);

      const isAtLastWaypoint =
        !this.ciclic && this.waypointIndex >= this.waypoints.length - 1;

      if (isAtLastWaypoint) {
        this.gameObject.speed = Vector.zero();
        this.active = false;
        this.onComplete?.();
        return;
      }

      this.currentPath = [];
      this.currentPathIndex = 0;
      this.recalcRequested = true;
      this.adjustedWaypoint = null;
      this.nextWaypoint();
      targetedWaypoint = this.getTargetedWaypoint();

      if (!targetedWaypoint) {
        this.gameObject.speed = Vector.zero();
        this.onComplete?.();
        return;
      }
    }

    const movementTarget =
      this.currentPath[this.currentPathIndex] ??
      (this.adjustedWaypoint ?? targetedWaypoint);

    const movementVector = movementTarget.toSubtracted(currentPosition);
    const movementDirection = movementVector.toNormalized();
    const distanceToTarget = movementVector.magnitude();
    const tickDt = this.getTickDt();
    const maxDistanceThisTick = this.speed * tickDt;

    if (distanceToTarget <= maxDistanceThisTick) {
      this.gameObject.speed =
        maxDistanceThisTick > 0
          ? movementVector.toMultiplied(1 / tickDt)
          : Vector.zero();
      return;
    }

    this.gameObject.speed = movementDirection.toMultiplied(this.speed);
  }

  public renderDebug(canvas: CanvasController) {
    if (!this.debug) return;
    const drawer = canvas.getShapeDrawer();
    const rotation = this.gameObject.rotation ?? 0;

    const draw = () => {
      const sceneOffset = this.gameObject.scene?.getVisualOffset() ?? Vector.zero();

      this.waypoints.forEach((waypoint, index) => {
        const renderedWaypoint = waypoint.toAdded(sceneOffset);
        drawer.drawCircle(
          renderedWaypoint.x,
          renderedWaypoint.y,
          8,
          "red",
          true
        );
        if (index == 0) return;
        drawer.drawLine(
          this.waypoints[index - 1]!.toAdded(sceneOffset),
          renderedWaypoint,
          WALKER_DEBUG_STROKE_WIDTH
        );
      });

      if (this.ciclic && this.waypoints.length > 1) {
        drawer.drawLine(
          this.waypoints[this.waypoints.length - 1]!.toAdded(sceneOffset),
          this.waypoints[0]!.toAdded(sceneOffset),
          WALKER_DEBUG_STROKE_WIDTH
        );
      }

      if (this.currentPathIndex < this.currentPath.length) {
        const start = this.gameObject.getPosition();
        let previous = start;
        for (
          let index = this.currentPathIndex;
          index < this.currentPath.length;
          index++
        ) {
          const node = this.currentPath[index]!;
          const rendered = node.toAdded(sceneOffset);
          drawer.drawCircle(rendered.x, rendered.y, 6, "cyan", true);
          drawer.drawLine(
            previous,
            rendered,
            WALKER_DEBUG_STROKE_WIDTH,
            "cyan"
          );
          previous = rendered;
        }
      }
    };

    // Walker debug drawing is called from within the GameObject's rotation block.
    // Cancel it so waypoints/path are drawn in world space (non-rotated).
    if (rotation !== 0) {
      const pivot = this.gameObject.getRotationCenter();
      drawer.withRotation(pivot.x, pivot.y, -rotation, draw);
      return;
    }

    draw();
  }
}

export { Walker };
export type {
  WalkerPathfindingOptions,
  WalkerPathRecalculationContext,
  WalkerPathNotFoundBehavior,
  WalkerPathNotFoundContext,
  WalkerPathNotFoundResolution,
};
