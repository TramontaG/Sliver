type SpawnCustomerGroupPayload = {
  count?: number;
};

type CustomerClickedPayload = {
  groupId: string;
  customerId: string;
  position: { x: number; y: number };
};

type CustomerSelectedPayload = {
  groupId: string;
  customerId: string;
};

type TableClickedPayload = {
  tableId: string;
};

const spawnCustomerGroupMessage = "restaurant:spawnCustomerGroup";
const customerClickedMessage = "restaurant:customerClicked";
const customerSelectedMessage = "restaurant:customerSelected";
const tableClickedMessage = "restaurant:tableClicked";

export {
  spawnCustomerGroupMessage,
  customerClickedMessage,
  customerSelectedMessage,
  tableClickedMessage,
};
export type {
  SpawnCustomerGroupPayload,
  CustomerClickedPayload,
  CustomerSelectedPayload,
  TableClickedPayload,
};
