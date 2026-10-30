import {
  CanvasController,
  GameObject,
  SquareHitbox,
  Vector,
  Walker,
  onClick,
  type GameContext,
  type GameEvent,
  type Scene,
} from "sliver-engine";
import { gridCellSize } from "../../Definitions/Grid";
import {
  customerClickedMessage,
  customerSelectedMessage,
} from "../../Messages/Restaurant";
import { Human } from "../Human";
import type { Table } from "../Table";

type CustomerState =
  | "arriving"
  | "waitingForSeat"
  | "followingPlayer"
  | "walkingToSeat"
  | "seated"
  | "leaving";

const citizenSheets = [
  "Citizen_1",
  "Citizen_2",
  "Citizen_3",
  "Citizen_4",
  "Citizen_5",
  "Citizen_6",
  "Citizen_7",
];

const customerMoveSpeed = 2;
const customerArrivalThreshold = 2;
const humanRenderOffset = new Vector(16, 54);
const heroFollowOffset = new Vector(gridCellSize, gridCellSize);

const snapToGrid = (target: Vector): Vector => {
  return new Vector(
    Math.floor(target.x / gridCellSize) * gridCellSize + gridCellSize / 2,
    Math.floor(target.y / gridCellSize) * gridCellSize + gridCellSize / 2
  );
};

const isNearTarget = (position: Vector, target: Vector): boolean => {
  return (
    position.toSubtracted(target).magnitude() <= customerArrivalThreshold
  );
};

const areSameGridPosition = (a: Vector | null, b: Vector | null): boolean => {
  if (!a || !b) {
    return false;
  }

  return snapToGrid(a).equals(snapToGrid(b));
};

class CustomerGroup extends GameObject {
  static spawnedCount = 0;

  private customers: Customer[] = [];
  private customersAddedToScene = false;
  private queuePosition: Vector | null = null;
  private followTarget: GameObject | null = null;
  private followTrail: Vector[] = [];
  private targetTable: Table | null = null;
  private seatAssignments = new Map<string, Vector>();
  private seatedCustomerIds = new Set<string>();

  public customerState: CustomerState = "arriving";

  constructor(count: number, basePosition = new Vector(16, 176)) {
    super("CustomerGroup", basePosition.clone());
    this.visible = false;

    const clampedCount = Math.max(1, Math.min(4, Math.floor(count)));
    CustomerGroup.spawnedCount += 1;

    for (let i = 0; i < clampedCount; i += 1) {
      this.customers.push(
        new Customer(
          basePosition.toAdded(new Vector(i * gridCellSize, 0)),
          this.id
        )
      );
    }
  }

  override onAddedToScene(scene: Scene, context: GameContext): void {
    super.onAddedToScene(scene, context);

    if (this.customersAddedToScene) {
      return;
    }

    this.customersAddedToScene = true;
    scene.addGameObject(this.customers);
  }

  override tick(): void {
    this.updateCustomersMovement();
    this.syncAnchorPosition();
    super.tick();
  }

  getCustomerState(): CustomerState {
    return this.customerState;
  }

  isWaitingInQueue(): boolean {
    return (
      this.customerState === "arriving" ||
      this.customerState === "waitingForSeat"
    );
  }

  isFollowingPlayer(): boolean {
    return this.customerState === "followingPlayer";
  }

  getReceptionPosition(): Vector {
    if (this.queuePosition) {
      return snapToGrid(
        this.queuePosition.toAdded(
          new Vector(this.getCustomerCount() * gridCellSize, 0)
        )
      );
    }

    const rightmostCustomer = this.getRightmostCustomer();
    const basePosition = rightmostCustomer
      ? rightmostCustomer.getScenePosition()
      : this.getScenePosition();

    return snapToGrid(basePosition.toAdded(new Vector(gridCellSize, 0)));
  }

  getCustomerIds(): string[] {
    return this.customers.map((customer) => customer.id);
  }

  getCustomerCount(): number {
    return this.customers.length;
  }

  queueAt(position: Vector): void {
    this.queuePosition = snapToGrid(position);
    this.followTarget = null;
    this.followTrail = [];
    this.targetTable = null;
    this.seatAssignments.clear();
    this.seatedCustomerIds.clear();
    this.customers.forEach((customer) => customer.setCollisionEnabled(true));
    this.setCustomerState("arriving");
  }

  startFollowing(target: GameObject): void {
    this.queuePosition = null;
    this.followTarget = target;
    this.followTrail = this.buildInitialFollowTrail(target);
    this.targetTable = null;
    this.seatAssignments.clear();
    this.seatedCustomerIds.clear();
    this.customers.forEach((customer) => customer.setCollisionEnabled(true));
    this.setCustomerState("followingPlayer");
  }

  stopFollowing(): void {
    this.followTarget = null;
    this.followTrail = [];

    if (this.queuePosition) {
      this.queueAt(this.queuePosition);
      return;
    }

    this.customers.forEach((customer) => customer.stopMovement());
    this.setCustomerState("waitingForSeat");
  }

  seatAtTable(table: Table): boolean {
    const seatAssignments = this.assignSeats(table.getSeatScenePositions());
    if (seatAssignments.size < this.customers.length) {
      return false;
    }

    this.followTarget = null;
    this.queuePosition = null;
    this.followTrail = [];
    this.targetTable = table;
    this.seatAssignments = seatAssignments;
    this.seatedCustomerIds.clear();
    table.reserveForGroup(this.id);
    this.customers.forEach((customer) => {
      customer.setSelected(false);
      customer.setCollisionEnabled(false);
    });
    this.setCustomerState("walkingToSeat");

    return true;
  }

  startLeaving(exitPosition: Vector): void {
    this.followTarget = null;
    this.queuePosition = null;
    this.followTrail = [];
    this.targetTable = null;
    this.seatAssignments.clear();
    this.seatedCustomerIds.clear();
    this.customers.forEach((customer) => customer.setCollisionEnabled(true));
    this.setCustomerState("leaving");

    this.getCustomersInFollowOrder().forEach((customer, index) => {
      customer.moveTo(
        exitPosition.toAdded(new Vector(-index * gridCellSize, 0))
      );
    });
  }

  private updateCustomersMovement(): void {
    if (this.queuePosition) {
      this.updateQueueMovement();
      return;
    }

    if (this.followTarget) {
      this.updateFollowMovement();
      return;
    }

    if (this.targetTable && this.seatAssignments.size > 0) {
      this.updateSeatMovement();
      return;
    }

    if (this.customerState === "leaving") {
      const everybodyGone = this.customers.every((customer) => {
        return !customer.walker?.isActive();
      });
      if (everybodyGone) {
        this.customers.forEach((customer) => customer.destroy());
        this.destroy();
      }
    }
  }

  private updateQueueMovement(): void {
    const basePosition = this.queuePosition;
    if (!basePosition) {
      return;
    }

    const queueTargets = this.customers.map((_customer, index) => {
      return basePosition.toAdded(new Vector(index * gridCellSize, 0));
    });

    this.customers.forEach((customer, index) => {
      customer.moveToIfNeeded(queueTargets[index]!);
    });

    const everybodyInPosition = this.customers.every((customer, index) => {
      return customer.isAtPosition(queueTargets[index]!);
    });

    this.setCustomerState(
      everybodyInPosition ? "waitingForSeat" : "arriving"
    );
  }

  private updateFollowMovement(): void {
    const followTarget = this.followTarget;
    if (!followTarget) {
      return;
    }

    const customersInLine = this.getCustomersInFollowOrder();
    const leaderSlot = this.getLeaderFollowSlot(followTarget);

    if (this.followTrail.length === 0) {
      this.followTrail = this.buildInitialFollowTrail(followTarget);
    } else if (!areSameGridPosition(this.followTrail[0] ?? null, leaderSlot)) {
      this.followTrail.unshift(leaderSlot);
      this.followTrail = this.followTrail.slice(0, customersInLine.length + 1);
    }

    customersInLine.forEach((customer, index) => {
      const movementTarget = this.followTrail[index];
      if (!movementTarget) {
        return;
      }

      customer.moveToIfNeeded(movementTarget);
    });
  }

  private updateSeatMovement(): void {
    if (!this.targetTable || this.seatAssignments.size === 0) {
      return;
    }

    const tablePosition = this.targetTable.getScenePosition().clone();

    this.customers.forEach((customer) => {
      if (this.seatedCustomerIds.has(customer.id)) {
        return;
      }

      const seatTarget = this.seatAssignments.get(customer.id);
      if (!seatTarget) {
        this.seatedCustomerIds.add(customer.id);
        return;
      }

      customer.setCollisionEnabled(true);

      if (!customer.isAtPosition(seatTarget)) {
        customer.moveToIfNeeded(seatTarget);
        return;
      }

      customer.stopMovement();
      customer.faceTowards(tablePosition.toSubtracted(seatTarget));
      customer.setCollisionEnabled(false);
      this.seatedCustomerIds.add(customer.id);
    });

    const everybodySeated = this.customers.every((customer) => {
      return this.seatedCustomerIds.has(customer.id);
    });

    if (!everybodySeated) {
      return;
    }

    this.targetTable.seatGroup(this.id, this.getCustomerIds());
    this.targetTable = null;
    this.seatAssignments.clear();
    this.seatedCustomerIds.clear();
    this.setCustomerState("seated");
  }

  private assignSeats(seatPositions: Vector[]): Map<string, Vector> {
    const availableSeats = [...seatPositions];
    const assignments = new Map<string, Vector>();

    this.getCustomersInFollowOrder().forEach((customer) => {
      if (availableSeats.length === 0) {
        return;
      }

      const customerPosition = customer.getScenePosition();
      let bestSeatIndex = 0;
      let bestSeatDistance = Number.POSITIVE_INFINITY;

      availableSeats.forEach((seatPosition, index) => {
        const distance = customerPosition
          .toSubtracted(seatPosition)
          .magnitude();

        if (distance < bestSeatDistance) {
          bestSeatDistance = distance;
          bestSeatIndex = index;
        }
      });

      const seatPosition = availableSeats.splice(bestSeatIndex, 1)[0];
      if (seatPosition) {
        assignments.set(customer.id, seatPosition.clone());
      }
    });

    return assignments;
  }

  private getCustomersInFollowOrder(): Customer[] {
    return [...this.customers].reverse();
  }

  private getLeaderFollowSlot(target: GameObject): Vector {
    return snapToGrid(target.getScenePosition().toAdded(heroFollowOffset));
  }

  private buildInitialFollowTrail(target: GameObject): Vector[] {
    return [
      this.getLeaderFollowSlot(target),
      ...this.getCustomersInFollowOrder().map((customer) => {
        return snapToGrid(customer.getScenePosition());
      }),
    ];
  }

  private getRightmostCustomer(): Customer | null {
    return (
      this.customers.reduce<Customer | null>((rightmost, customer) => {
        if (!rightmost) {
          return customer;
        }

        return customer.getScenePosition().x > rightmost.getScenePosition().x
          ? customer
          : rightmost;
      }, null) ?? null
    );
  }

  private syncAnchorPosition(): void {
    const leftmostCustomer =
      this.customers.reduce<Customer | null>((leftmost, customer) => {
        if (!leftmost) {
          return customer;
        }

        return customer.getScenePosition().x < leftmost.getScenePosition().x
          ? customer
          : leftmost;
      }, null) ?? null;

    if (!leftmostCustomer) {
      return;
    }

    this.setPosition(leftmostCustomer.getScenePosition().clone());
  }

  private setCustomerState(state: CustomerState): void {
    this.customerState = state;
    this.customers.forEach((customer) => customer.setCustomerState(state));
  }

  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}

class Customer extends Human {
  private readonly collisionHitbox: SquareHitbox;
  private readonly interactionHitbox: SquareHitbox;
  private selected = false;
  private movementTarget: Vector | null = null;
  private lastWalkerTarget: Vector | null = null;
  private failedTarget: Vector | null = null;
  private failedTargetRetryTick = 0;

  public readonly groupId: string;
  public customerState: CustomerState = "arriving";

  constructor(position: Vector, groupId: string) {
    const spriteName =
      citizenSheets[Math.floor(Math.random() * citizenSheets.length)];
    super("Customer", position, spriteName, 2, humanRenderOffset);
    this.groupId = groupId;
    this.zIndex = 1;

    const size = new Vector(16, 16).toMultiplied(0.95);
    this.collisionHitbox = new SquareHitbox(
      size.toMultiplied(-0.5),
      size,
      this,
      {
        solid: true,
        debug: false,
      }
    );
    this.interactionHitbox = new SquareHitbox(
      new Vector(-16, -32),
      new Vector(32, 40),
      this,
      {
        solid: false,
        debug: false,
      }
    );
    this.addHitbox(this.collisionHitbox);
    this.addHitbox(this.interactionHitbox);
  }

  override onAddedToScene(scene: Scene, context: GameContext): void {
    super.onAddedToScene(scene, context);

    if (!this.walker) {
      this.walker = new Walker(this, [], customerMoveSpeed, false, false);
      this.setWalker(this.walker);
    }

    this.updateWalkerPathfinding();

    this.onMessage<{ groupId: string; customerId: string }>(
      customerSelectedMessage,
      (payload) => {
        this.setSelected(payload?.groupId === this.groupId);
      }
    );
  }

  override tick(): void {
    super.tick();

    if (!this.movementTarget) {
      return;
    }

    if (!this.isAtPosition(this.movementTarget)) {
      return;
    }

    this.stopMovement();
  }

  override beforeColision(otherGO: GameObject): boolean {
    if (otherGO.name === "Hero") {
      return false;
    }

    if (otherGO instanceof Customer) {
      return otherGO.groupId !== this.groupId;
    }

    return super.beforeColision(otherGO);
  }

  moveTo(target: Vector): void {
    const snappedTarget = snapToGrid(target);
    this.movementTarget = snappedTarget;
    this.lastWalkerTarget = snappedTarget.clone();
    this.failedTarget = null;
    this.failedTargetRetryTick = 0;
    this.walker?.setWaypoints([snappedTarget], false);
    this.walker?.start();
  }

  moveToIfNeeded(target: Vector): void {
    const snappedTarget = snapToGrid(target);
    const currentTick = this.getContext()?.getTickCount() ?? 0;

    if (this.isAtPosition(snappedTarget)) {
      this.stopMovement();
      return;
    }

    if (
      this.lastWalkerTarget &&
      isNearTarget(this.lastWalkerTarget, snappedTarget) &&
      this.walker?.isActive()
    ) {
      return;
    }

    if (
      this.failedTarget &&
      areSameGridPosition(this.failedTarget, snappedTarget) &&
      currentTick < this.failedTargetRetryTick
    ) {
      return;
    }

    this.moveTo(snappedTarget);
  }

  stopMovement(): void {
    this.movementTarget = null;
    this.lastWalkerTarget = null;
    this.walker?.setWaypoints([], false);
    this.speed = Vector.zero();
    this.faceDown();
  }

  isAtPosition(target: Vector): boolean {
    return isNearTarget(this.getScenePosition(), snapToGrid(target));
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
  }

  setCollisionEnabled(enabled: boolean): void {
    this.collisionHitbox.solid = enabled;
    this.interactionHitbox.solid = false;
  }

  setCustomerState(state: CustomerState): void {
    this.customerState = state;
    this.updateWalkerPathfinding();
  }

  private faceDown(): void {
    this.faceTowards(new Vector(0, 1));
  }

  faceTowards(direction: Vector): void {
    const horizontalDominant = Math.abs(direction.x) >= Math.abs(direction.y);
    const facing = horizontalDominant
      ? direction.x >= 0
        ? "right"
        : "left"
      : direction.y >= 0
        ? "down"
        : "up";

    (
      this as unknown as {
        lastDominantDirection: "up" | "down" | "left" | "right" | null;
      }
    ).lastDominantDirection = facing;
  }

  private updateWalkerPathfinding(): void {
    this.walker?.setPathfindingOptions({
      avoidObstacles:
        this.customerState === "walkingToSeat" ||
        this.customerState === "leaving",
      gridCellSize,
      pathNotFoundBehavior: "stop",
      recalculateEveryTicks: 9999,
      maxExpandedNodes: 2500,
      maxSearchRadiusTiles: 48,
      onPathNotFound: ({ goal }) => {
        this.failedTarget = snapToGrid(goal);
        this.failedTargetRetryTick =
          (this.getContext()?.getTickCount() ?? 0) + 20;
        return "stop";
      },
    });
  }

  override render(canvas: CanvasController, scene: Scene): void {
    super.render(canvas, scene);

    if (!this.selected) {
      return;
    }

    const size = this.frameSize.toMultiplied(this.scale);
    const topLeft = this.getRenderPosition();
    const drawer = canvas.getShapeDrawer();
    drawer.drawRectangle(topLeft.x, topLeft.y, size.x, size.y, "yellow", false);
  }

  @onClick<Customer>((customer, event) => {
    customer.sendMessage(customerClickedMessage, {
      groupId: customer.groupId,
      customerId: customer.id,
      position: {
        x: customer.getScenePosition().x,
        y: customer.getScenePosition().y,
      },
    });
    event.stopPropagation = true;
  })
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }
}

export { CustomerGroup };
export type { CustomerState };
