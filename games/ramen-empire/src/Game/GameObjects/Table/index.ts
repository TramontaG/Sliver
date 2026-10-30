import { GameObject, SquareHitbox, Vector, onClick, type GameEvent } from "sliver-engine";
import { gridCellSize, gridRectToCenter } from "../../Definitions/Grid";
import { Seat } from "../Seat";
import { tableClickedMessage } from "../../Messages/Restaurant";
import {
  cleanTable as cleanTableState,
  createTableServiceSnapshot,
  isTableAvailableForNewParty,
  markTableDirty,
  markTableEating,
  markTableReadyForBill,
  markTableWaitingFood,
  releaseTableReservation,
  reserveTable as reserveTableState,
  seatTable as seatTableState,
  type TableServiceSnapshot,
  type TableServiceState,
} from "./state";

const getTableColors = (serviceState: TableServiceState) => {
  switch (serviceState) {
    case "reserved":
      return {
        fill: "rgba(242, 193, 78, 0.35)",
        stroke: "#f2c14e",
      };
    case "occupied_waiting_order":
      return {
        fill: "rgba(76, 142, 218, 0.30)",
        stroke: "#4c8eda",
      };
    case "occupied_waiting_food":
      return {
        fill: "rgba(240, 138, 36, 0.30)",
        stroke: "#f08a24",
      };
    case "occupied_eating":
      return {
        fill: "rgba(60, 163, 112, 0.30)",
        stroke: "#3ca370",
      };
    case "occupied_waiting_bill":
      return {
        fill: "rgba(142, 68, 173, 0.30)",
        stroke: "#8e44ad",
      };
    case "dirty":
      return {
        fill: "rgba(139, 46, 46, 0.35)",
        stroke: "#8b2e2e",
      };
    case "free":
    default:
      return {
        fill: "rgba(207, 160, 109, 0.25)",
        stroke: "#6d4428",
      };
  }
};

class Table extends GameObject {
  public readonly gridColumn: number;
  public readonly gridRow: number;
  public readonly widthCells: number;
  public readonly heightCells: number;
  public serviceState: TableServiceState;
  public activeGroupId: string | null;
  public occupiedCustomerIds: string[];

  constructor(
    gridColumn: number,
    gridRow: number,
    widthCells: number,
    heightCells: number,
    seatOffsets: Vector[] = []
  ) {
    const center = gridRectToCenter(
      gridColumn,
      gridRow,
      widthCells,
      heightCells
    );
    super("Table", center);
    this.gridColumn = gridColumn;
    this.gridRow = gridRow;
    this.widthCells = widthCells;
    this.heightCells = heightCells;
    const initialServiceSnapshot = createTableServiceSnapshot();
    this.serviceState = initialServiceSnapshot.serviceState;
    this.activeGroupId = initialServiceSnapshot.activeGroupId;
    this.occupiedCustomerIds = initialServiceSnapshot.occupiedCustomerIds;
    const size = new Vector(
      widthCells * gridCellSize,
      heightCells * gridCellSize
    );
    this.addHitbox(
      new SquareHitbox(
        size.toMultiplied(-0.5).toAdded(new Vector(16, 16)),
        size,
        this,
        {
          solid: true,
          // debug: true,
        }
      )
    );

    this.setRenderFunction((table, canvas) => {
      const hitbox = table
        .getHitboxes()
        .find((currentHitbox): currentHitbox is SquareHitbox => {
          return currentHitbox instanceof SquareHitbox;
        });

      if (!hitbox) {
        return;
      }


      const topLeft = table.getPosition().toAdded(hitbox.offset);
      const { fill, stroke } = getTableColors(this.serviceState);
      const drawer = canvas.getShapeDrawer();

      drawer.drawRectangle(
        topLeft.x,
        topLeft.y,
        hitbox.size.x,
        hitbox.size.y,
        fill,
        true
      );
      drawer.drawRectangle(
        topLeft.x,
        topLeft.y,
        hitbox.size.x,
        hitbox.size.y,
        stroke,
        false
      );
    });

    seatOffsets.forEach((seatOffset) => {
      this.addSeat(new Seat(seatOffset));
    });
  }

  getServiceSnapshot(): TableServiceSnapshot {
    return {
      serviceState: this.serviceState,
      activeGroupId: this.activeGroupId,
      occupiedCustomerIds: [...this.occupiedCustomerIds],
    };
  }

  getGridFootprint() {
    return {
      gridColumn: this.gridColumn,
      gridRow: this.gridRow,
      widthCells: this.widthCells,
      heightCells: this.heightCells,
    };
  }

  getSeats(): Seat[] {
    return this.getChildren().filter((child): child is Seat => child instanceof Seat);
  }

  addSeat(seat: Seat): Seat {
    seat.setPositionRelativeToMotherShip(true);
    this.addChild(seat);
    return seat;
  }

  getSeatScenePositions(): Vector[] {
    return this.getSeats().map((seat) => seat.getScenePosition());
  }

  getSeatCount(): number {
    return this.getSeats().length;
  }

  isAvailableForNewParty(): boolean {
    return isTableAvailableForNewParty(this.getServiceSnapshot());
  }

  reserve(groupId?: string | null): TableServiceSnapshot {
    return this.applyServiceSnapshot(
      reserveTableState(this.getServiceSnapshot(), groupId)
    );
  }

  reserveForGroup(groupId: string): TableServiceSnapshot {
    return this.reserve(groupId);
  }

  releaseReservation(): TableServiceSnapshot {
    return this.applyServiceSnapshot(
      releaseTableReservation(this.getServiceSnapshot())
    );
  }

  seatCustomers(
    customerIds: string[],
    groupId?: string | null
  ): TableServiceSnapshot {
    return this.applyServiceSnapshot(
      seatTableState(this.getServiceSnapshot(), customerIds, groupId)
    );
  }

  seatGroup(groupId: string, customerIds: string[]): TableServiceSnapshot {
    return this.seatCustomers(customerIds, groupId);
  }

  markWaitingFood(): TableServiceSnapshot {
    return this.applyServiceSnapshot(
      markTableWaitingFood(this.getServiceSnapshot())
    );
  }

  markEating(): TableServiceSnapshot {
    return this.applyServiceSnapshot(markTableEating(this.getServiceSnapshot()));
  }

  markReadyForBill(): TableServiceSnapshot {
    return this.applyServiceSnapshot(
      markTableReadyForBill(this.getServiceSnapshot())
    );
  }

  markDirty(): TableServiceSnapshot {
    return this.applyServiceSnapshot(markTableDirty(this.getServiceSnapshot()));
  }

  clean(): TableServiceSnapshot {
    return this.applyServiceSnapshot(cleanTableState(this.getServiceSnapshot()));
  }

  @onClick<Table>((table, event) => {
    table.sendMessage(tableClickedMessage, {
      tableId: table.id,
    });
    event.stopPropagation = true;
  })
  override handleEvent(event: GameEvent): void {
    super.handleEvent(event);
  }

  private applyServiceSnapshot(
    serviceSnapshot: TableServiceSnapshot
  ): TableServiceSnapshot {
    this.serviceState = serviceSnapshot.serviceState;
    this.activeGroupId = serviceSnapshot.activeGroupId;
    this.occupiedCustomerIds = [...serviceSnapshot.occupiedCustomerIds];

    return this.getServiceSnapshot();
  }
}

export { Table, gridCellSize };
