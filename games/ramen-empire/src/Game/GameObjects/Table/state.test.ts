import { describe, expect, it } from "vitest";
import {
  cleanTable,
  createTableServiceSnapshot,
  isTableAvailableForNewParty,
  markTableEating,
  markTableReadyForBill,
  markTableWaitingFood,
  markTableDirty,
  releaseTableReservation,
  reserveTable,
  seatTable,
} from "./state";

describe("createTableServiceSnapshot", () => {
  it("starts tables as free and empty", () => {
    expect(createTableServiceSnapshot()).toEqual({
      serviceState: "free",
      activeGroupId: null,
      occupiedCustomerIds: [],
    });
  });
});

describe("table reservation flow", () => {
  it("reserves a free table for a customer group and can release it back to free", () => {
    const freeTable = createTableServiceSnapshot();
    const reservedTable = reserveTable(freeTable, "group-1");

    expect(reservedTable.serviceState).toBe("reserved");
    expect(reservedTable.activeGroupId).toBe("group-1");
    expect(isTableAvailableForNewParty(freeTable)).toBe(true);
    expect(isTableAvailableForNewParty(reservedTable)).toBe(false);

    expect(releaseTableReservation(reservedTable)).toEqual({
      serviceState: "free",
      activeGroupId: null,
      occupiedCustomerIds: [],
    });
  });

  it("does not allow reserving a table that is not free", () => {
    expect(() => {
      reserveTable(
        seatTable(createTableServiceSnapshot(), ["customer-1", "customer-2"])
      );
    }).toThrow("Cannot reserve table while in state occupied_waiting_order.");
  });
});

describe("table service loop", () => {
  it("moves through the full service cycle and returns to free after cleaning", () => {
    const waitingOrderTable = seatTable(
      reserveTable(createTableServiceSnapshot(), "group-1"),
      ["customer-1"],
      "group-1"
    );

    expect(waitingOrderTable).toEqual({
      serviceState: "occupied_waiting_order",
      activeGroupId: "group-1",
      occupiedCustomerIds: ["customer-1"],
    });

    const waitingFoodTable = markTableWaitingFood(waitingOrderTable);
    expect(waitingFoodTable.serviceState).toBe("occupied_waiting_food");
    expect(waitingFoodTable.activeGroupId).toBe("group-1");

    const eatingTable = markTableEating(waitingFoodTable);
    expect(eatingTable.serviceState).toBe("occupied_eating");
    expect(eatingTable.activeGroupId).toBe("group-1");

    const waitingBillTable = markTableReadyForBill(eatingTable);
    expect(waitingBillTable.serviceState).toBe("occupied_waiting_bill");
    expect(waitingBillTable.activeGroupId).toBe("group-1");

    const dirtyTable = markTableDirty(waitingBillTable);
    expect(dirtyTable.serviceState).toBe("dirty");
    expect(dirtyTable.activeGroupId).toBe(null);
    expect(dirtyTable.occupiedCustomerIds).toEqual([]);
    expect(isTableAvailableForNewParty(dirtyTable)).toBe(false);

    expect(cleanTable(dirtyTable)).toEqual({
      serviceState: "free",
      activeGroupId: null,
      occupiedCustomerIds: [],
    });
  });

  it("rejects invalid seating and cleanup transitions", () => {
    const dirtyTable = markTableDirty(
      markTableReadyForBill(
        markTableEating(
          markTableWaitingFood(
            seatTable(createTableServiceSnapshot(), ["customer-1"])
          )
        )
      )
    );

    expect(() => {
      seatTable(createTableServiceSnapshot(), []);
    }).toThrow("Cannot seat a table without at least one customer.");

    expect(() => {
      seatTable(dirtyTable, ["customer-2"]);
    }).toThrow("Cannot seat table while in state dirty.");

    expect(() => {
      cleanTable(createTableServiceSnapshot());
    }).toThrow("Cannot clean table while in state free.");
  });

  it("does not allow a reserved table to be seated by a different customer group", () => {
    expect(() => {
      seatTable(
        reserveTable(createTableServiceSnapshot(), "group-1"),
        ["customer-2"],
        "group-2"
      );
    }).toThrow(
      "Cannot seat table reserved for group group-1 with group group-2."
    );
  });
});
