import { describe, expect, it, vi } from "vitest";

vi.mock("sliver-engine", () => {
  class Vector {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }

    toMultiplied(factor: number) {
      return new Vector(this.x * factor, this.y * factor);
    }

    toAdded(vector: Vector) {
      return new Vector(this.x + vector.x, this.y + vector.y);
    }
  }

  class GameObject {
    public hitboxes: unknown[] = [];
    public name: string;
    public position: Vector;
    public renderFn?: (obj: GameObject, canvas: unknown) => void;

    constructor(name: string, position: Vector) {
      this.name = name;
      this.position = position;
    }

    addHitbox(hitbox: unknown) {
      this.hitboxes.push(hitbox);
    }

    getHitboxes() {
      return this.hitboxes;
    }

    getPosition() {
      return this.position;
    }

    setRenderFunction(fn: (obj: GameObject, canvas: unknown) => void) {
      this.renderFn = fn;
    }
  }

  class SquareHitbox {
    public offset: Vector;
    public size: Vector;
    public owner: unknown;
    public options?: Record<string, unknown>;

    constructor(
      offset: Vector,
      size: Vector,
      owner: unknown,
      options?: Record<string, unknown>
    ) {
      this.offset = offset;
      this.size = size;
      this.owner = owner;
      this.options = options;
    }
  }

  return {
    Vector,
    GameObject,
    SquareHitbox,
    onClick: () => {
      return () => undefined;
    },
  };
});

import { Table } from "./index";

describe("Table entity", () => {
  it("tracks its grid footprint and centralizes service state on the object", () => {
    const table = new Table(11, 6, 2, 5);

    expect(table.getGridFootprint()).toEqual({
      gridColumn: 11,
      gridRow: 6,
      widthCells: 2,
      heightCells: 5,
    });
    expect(table.getServiceSnapshot()).toEqual({
      serviceState: "free",
      activeGroupId: null,
      occupiedCustomerIds: [],
    });

    table.reserveForGroup("group-1");
    table.seatGroup("group-1", ["customer-1", "customer-2"]);
    table.markWaitingFood();
    table.markEating();
    table.markReadyForBill();

    expect(table.getServiceSnapshot()).toEqual({
      serviceState: "occupied_waiting_bill",
      activeGroupId: "group-1",
      occupiedCustomerIds: ["customer-1", "customer-2"],
    });

    table.markDirty();
    table.clean();

    expect(table.getServiceSnapshot()).toEqual({
      serviceState: "free",
      activeGroupId: null,
      occupiedCustomerIds: [],
    });
  });

  it("keeps availability and runtime fields in sync", () => {
    const table = new Table(5, 7, 1, 1);

    expect(table.isAvailableForNewParty()).toBe(true);

    table.reserveForGroup("group-2");

    expect(table.isAvailableForNewParty()).toBe(false);
    expect(table.activeGroupId).toBe("group-2");
    expect(table.serviceState).toBe("reserved");

    table.releaseReservation();

    expect(table.isAvailableForNewParty()).toBe(true);
    expect(table.activeGroupId).toBe(null);
    expect(table.serviceState).toBe("free");
  });
});
