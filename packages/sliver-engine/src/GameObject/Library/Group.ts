import { GameObject } from "..";
import type { GameEvent } from "../../Events";
import { onChildrenEvents } from "../../Events/decorators";
import { Vector } from "../../Lib/Vector";

class Group extends GameObject {
  constructor(name: string, children: GameObject[]) {
    super(name, new Vector(0, 0));

    children.forEach((child) => {
      this.addChild(child);
      if (this.getMotherShip()) {
        child.setMotherShip(this.getMotherShip()!);
      }
    });
  }

  @onChildrenEvents<Group>()
  override handleEvent(event: GameEvent): void {}
}

export { Group };
