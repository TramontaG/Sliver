import { GameObject, Vector, type GameContext, type Scene } from "sliver-engine";
import { CustomerGroup } from "../CustomerGroup";
import { Table } from "../Table";
import { gridCellSize } from "../../Definitions/Grid";
import {
  customerClickedMessage,
  customerSelectedMessage,
  spawnCustomerGroupMessage,
  tableClickedMessage,
  type CustomerClickedPayload,
  type CustomerSelectedPayload,
  type SpawnCustomerGroupPayload,
  type TableClickedPayload,
} from "../../Messages/Restaurant";

class RestaurantController extends GameObject {
  private readonly queueAnchor = new Vector(16, 176);
  private readonly queueSpacing = gridCellSize * 3;
  private selectedGroupId: string | null = null;

  constructor() {
    super("RestaurantController", new Vector(0, 0));
    this.visible = false;
  }

  override onAddedToScene(scene: Scene, context: GameContext): void {
    super.onAddedToScene(scene, context);
    this.onMessage<SpawnCustomerGroupPayload>(
      spawnCustomerGroupMessage,
      (payload) => {
        const count = payload?.count ?? Math.floor(Math.random() * 4) + 1;
        const queuePosition = this.getQueuePosition(
          this.getCustomerGroups(scene).filter((group) => group.isWaitingInQueue())
            .length
        );
        scene.addGameObject(new CustomerGroup(count, queuePosition));
        this.refreshWaitingQueue(scene);
      }
    );
    this.onMessage<CustomerClickedPayload>(
      customerClickedMessage,
      (payload) => {
        if (!payload) {
          return;
        }
        context.sendMessage<CustomerSelectedPayload>(customerSelectedMessage, {
          groupId: payload.groupId,
          customerId: payload.customerId,
        });
        const customerGroup = this.getCustomerGroupById(scene, payload.groupId);
        if (!customerGroup || !customerGroup.isWaitingInQueue()) {
          return;
        }

        const hero = this.getHero(scene) as
          | (GameObject & {
              moveTo: (target: Vector, onComplete?: () => void) => void;
            })
          | null;
        if (!hero?.moveTo) {
          return;
        }

        this.selectedGroupId = payload.groupId;
        hero.moveTo(customerGroup.getReceptionPosition());
      }
    );
    this.onMessage<TableClickedPayload>(tableClickedMessage, (payload) => {
      if (!payload || !this.selectedGroupId) {
        return;
      }

      const table = this.getTableById(scene, payload.tableId);
      const customerGroup = this.getCustomerGroupById(
        scene,
        this.selectedGroupId
      );

      if (!table || !customerGroup) {
        return;
      }

      if (!table.isAvailableForNewParty()) {
        return;
      }

      if (table.getSeatCount() < customerGroup.getCustomerCount()) {
        return;
      }

      if (!customerGroup.isWaitingInQueue()) {
        return;
      }

      const seated = customerGroup.seatAtTable(table);
      if (!seated) {
        return;
      }

      this.selectedGroupId = null;
      context.sendMessage<CustomerSelectedPayload>(customerSelectedMessage, {
        groupId: "",
        customerId: "",
      });
      this.refreshWaitingQueue(scene);
    });
  }

  private getHero(scene: Scene): GameObject | null {
    return scene.getGameObjects().find((obj) => obj.name === "Hero") ?? null;
  }

  private getCustomerGroups(scene: Scene): CustomerGroup[] {
    return scene
      .getGameObjects()
      .filter((obj): obj is CustomerGroup => obj instanceof CustomerGroup);
  }

  private getTables(scene: Scene): Table[] {
    return scene.getGameObjects().filter((obj): obj is Table => obj instanceof Table);
  }

  private getCustomerGroupById(
    scene: Scene,
    groupId: string
  ): CustomerGroup | null {
    return this.getCustomerGroups(scene).find((group) => group.id === groupId) ?? null;
  }

  private getTableById(scene: Scene, tableId: string): Table | null {
    return this.getTables(scene).find((table) => table.id === tableId) ?? null;
  }

  private refreshWaitingQueue(scene: Scene): void {
    this.getCustomerGroups(scene)
      .filter((group) => group.isWaitingInQueue())
      .forEach((group, index) => {
        group.queueAt(this.getQueuePosition(index));
      });
  }

  private getQueuePosition(index: number): Vector {
    return this.queueAnchor.toAdded(new Vector(0, index * this.queueSpacing));
  }
}

export { RestaurantController };
