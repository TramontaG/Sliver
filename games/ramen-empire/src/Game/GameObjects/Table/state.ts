type TableServiceState =
  | "free"
  | "reserved"
  | "occupied_waiting_order"
  | "occupied_waiting_food"
  | "occupied_eating"
  | "occupied_waiting_bill"
  | "dirty";

type TableServiceSnapshot = {
  serviceState: TableServiceState;
  activeGroupId: string | null;
  occupiedCustomerIds: string[];
};

const createTableServiceSnapshot = (): TableServiceSnapshot => {
  return {
    serviceState: "free",
    activeGroupId: null,
    occupiedCustomerIds: [],
  };
};

const normalizeGroupId = (groupId?: string | null): string | null => {
  if (typeof groupId !== "string") {
    return null;
  }

  const trimmedGroupId = groupId.trim();
  return trimmedGroupId.length > 0 ? trimmedGroupId : null;
};

const updateTableServiceSnapshot = (
  _currentSnapshot: TableServiceSnapshot,
  nextState: TableServiceState,
  activeGroupId: string | null,
  occupiedCustomerIds: string[]
): TableServiceSnapshot => {
  return {
    serviceState: nextState,
    activeGroupId,
    occupiedCustomerIds: [...occupiedCustomerIds],
  };
};

const assertTableState = (
  snapshot: TableServiceSnapshot,
  expectedStates: TableServiceState[],
  action: string
) => {
  if (expectedStates.includes(snapshot.serviceState)) {
    return;
  }

  throw new Error(
    `Cannot ${action} while in state ${snapshot.serviceState}.`
  );
};

const reserveTable = (
  snapshot: TableServiceSnapshot,
  groupId?: string | null
): TableServiceSnapshot => {
  assertTableState(snapshot, ["free"], "reserve table");
  return updateTableServiceSnapshot(
    snapshot,
    "reserved",
    normalizeGroupId(groupId),
    []
  );
};

const releaseTableReservation = (
  snapshot: TableServiceSnapshot
): TableServiceSnapshot => {
  assertTableState(snapshot, ["reserved"], "release reservation");
  return updateTableServiceSnapshot(snapshot, "free", null, []);
};

const seatTable = (
  snapshot: TableServiceSnapshot,
  customerIds: string[],
  groupId?: string | null
): TableServiceSnapshot => {
  if (customerIds.length === 0) {
    throw new Error("Cannot seat a table without at least one customer.");
  }

  assertTableState(snapshot, ["free", "reserved"], "seat table");
  const normalizedGroupId = normalizeGroupId(groupId);
  if (
    snapshot.serviceState === "reserved" &&
    snapshot.activeGroupId !== null &&
    normalizedGroupId !== null &&
    snapshot.activeGroupId !== normalizedGroupId
  ) {
    throw new Error(
      `Cannot seat table reserved for group ${snapshot.activeGroupId} with group ${normalizedGroupId}.`
    );
  }

  return updateTableServiceSnapshot(
    snapshot,
    "occupied_waiting_order",
    normalizedGroupId ?? snapshot.activeGroupId,
    customerIds
  );
};

const markTableWaitingFood = (
  snapshot: TableServiceSnapshot
): TableServiceSnapshot => {
  assertTableState(snapshot, ["occupied_waiting_order"], "mark table waiting for food");
  return updateTableServiceSnapshot(
    snapshot,
    "occupied_waiting_food",
    snapshot.activeGroupId,
    snapshot.occupiedCustomerIds
  );
};

const markTableEating = (
  snapshot: TableServiceSnapshot
): TableServiceSnapshot => {
  assertTableState(snapshot, ["occupied_waiting_food"], "mark table eating");
  return updateTableServiceSnapshot(
    snapshot,
    "occupied_eating",
    snapshot.activeGroupId,
    snapshot.occupiedCustomerIds
  );
};

const markTableReadyForBill = (
  snapshot: TableServiceSnapshot
): TableServiceSnapshot => {
  assertTableState(snapshot, ["occupied_eating"], "mark table ready for bill");
  return updateTableServiceSnapshot(
    snapshot,
    "occupied_waiting_bill",
    snapshot.activeGroupId,
    snapshot.occupiedCustomerIds
  );
};

const markTableDirty = (
  snapshot: TableServiceSnapshot
): TableServiceSnapshot => {
  assertTableState(snapshot, ["occupied_waiting_bill"], "mark table dirty");
  return updateTableServiceSnapshot(snapshot, "dirty", null, []);
};

const cleanTable = (
  snapshot: TableServiceSnapshot
): TableServiceSnapshot => {
  assertTableState(snapshot, ["dirty"], "clean table");
  return updateTableServiceSnapshot(snapshot, "free", null, []);
};

const isTableAvailableForNewParty = (snapshot: TableServiceSnapshot) => {
  return snapshot.serviceState === "free";
};

export {
  cleanTable,
  createTableServiceSnapshot,
  isTableAvailableForNewParty,
  markTableDirty,
  markTableEating,
  markTableReadyForBill,
  markTableWaitingFood,
  releaseTableReservation,
  reserveTable,
  seatTable,
};
export type { TableServiceSnapshot, TableServiceState };
