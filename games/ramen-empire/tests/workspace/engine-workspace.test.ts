import { describe, expect, it } from "vitest";
import { GameObject, Vector } from "sliver-engine";
import {
  GameObject as WorkspaceGameObject,
  Vector as WorkspaceVector,
} from "../../../../packages/sliver-engine/src";
import { Human } from "../../src/Game/GameObjects/Human";

describe("engine workspace integration", () => {
  it("uses the local engine sources and a single class identity in the game", () => {
    expect(GameObject).toBe(WorkspaceGameObject);
    expect(Vector).toBe(WorkspaceVector);

    const human = new Human("TestHuman", new Vector(16, 16), "Hero");
    expect(human).toBeInstanceOf(WorkspaceGameObject);
    expect(human.getPosition()).toBeInstanceOf(WorkspaceVector);
  });
});
