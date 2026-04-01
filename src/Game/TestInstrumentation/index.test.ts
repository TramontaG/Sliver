import { describe, expect, it, vi } from "vitest";
import { spawnCustomerGroupMessage } from "../Messages/Restaurant";
import {
  createBrowserTestApi,
  createGameSnapshot,
  installBrowserTestApi,
  isBrowserTestApiEnabled,
  type BrowserTestApiHost,
  type RuntimeGame,
  type RuntimeGameObject,
  type RuntimeScene,
} from "./index";

const vector = (x: number, y: number) => ({ x, y });

const createRuntimeObject = ({
  id,
  name,
  position = vector(0, 0),
  scenePosition = position,
  children = [],
  extra = {},
}: {
  id: string;
  name: string;
  position?: { x: number; y: number };
  scenePosition?: { x: number; y: number };
  children?: RuntimeGameObject[];
  extra?: Record<string, unknown>;
}): RuntimeGameObject => ({
  id,
  name,
  getPosition: () => position,
  getScenePosition: () => scenePosition,
  getChildren: () => children,
  ...extra,
});

type RuntimeGameDouble = RuntimeGame & {
  onTick: ReturnType<typeof vi.fn>;
};

const createRuntimeScene = (
  name: string,
  gameObjects: RuntimeGameObject[]
): RuntimeScene => {
  const sceneWithName = {
    name,
    getGameObjects: () => gameObjects,
  };

  return sceneWithName as RuntimeScene;
};

const createRuntimeGame = (
  currentScene: RuntimeScene | null,
  options?: {
    tickCount?: number;
    frameCount?: number;
    tickRate?: number;
  }
): RuntimeGameDouble => {
  const sceneManager = {
    tick: vi.fn(),
  };
  const context = {
    getTickCount: vi.fn(() => options?.tickCount ?? 0),
    getFrameCount: vi.fn(() => options?.frameCount ?? 0),
    getTickRate: vi.fn(() => options?.tickRate ?? 60),
    getCurrentScene: vi.fn(() => currentScene),
    getActiveScenes: vi.fn(() => (currentScene ? [currentScene] : [])),
    getSceneManager: vi.fn(() => sceneManager),
    sendMessage: vi.fn(),
  };

  return {
    onTick: vi.fn(),
    getContext: vi.fn(() => context),
  };
};

describe("isBrowserTestApiEnabled", () => {
  it("enables the API in dev and test environments only", () => {
    expect(isBrowserTestApiEnabled({ DEV: true, MODE: "development" })).toBe(
      true
    );
    expect(isBrowserTestApiEnabled({ DEV: false, MODE: "test" })).toBe(true);
    expect(isBrowserTestApiEnabled({ DEV: false, MODE: "production" })).toBe(
      false
    );
  });
});

describe("createGameSnapshot", () => {
  it("collects session state plus nested tables and customers", () => {
    const customer = createRuntimeObject({
      id: "customer-1",
      name: "Customer",
      position: vector(8, 16),
      scenePosition: vector(24, 40),
      extra: {
        groupId: "group-1",
        selected: true,
        state: "waitingForSeat",
      },
    });
    const customerGroup = createRuntimeObject({
      id: "group-1",
      name: "CustomerGroup",
      children: [customer],
    });
    const hero = createRuntimeObject({
      id: "hero-1",
      name: "Hero",
      position: vector(48, 176),
    });
    const table = createRuntimeObject({
      id: "table-1",
      name: "Table",
      position: vector(80, 96),
      extra: {
        serviceState: "free",
        activeGroupId: "group-1",
        occupiedCustomerIds: ["customer-1"],
      },
    });
    const restaurantScene = createRuntimeScene("Restaurant", [
      hero,
      table,
      customerGroup,
    ]);
    const game = createRuntimeGame(restaurantScene, {
      tickCount: 12,
      frameCount: 4,
    });

    expect(createGameSnapshot(game)).toEqual({
      session: {
        tickCount: 12,
        frameCount: 4,
        tickRate: 60,
        currentScene: "Restaurant",
        activeScenes: ["Restaurant"],
      },
      hero: {
        id: "hero-1",
        name: "Hero",
        position: vector(48, 176),
        scenePosition: vector(48, 176),
      },
      tables: [
        {
          id: "table-1",
          name: "Table",
          position: vector(80, 96),
          scenePosition: vector(80, 96),
          state: "free",
          activeGroupId: "group-1",
          occupiedCustomerIds: ["customer-1"],
        },
      ],
      customers: [
        {
          id: "customer-1",
          name: "Customer",
          position: vector(8, 16),
          scenePosition: vector(24, 40),
          groupId: "group-1",
          selected: true,
          state: "waitingForSeat",
        },
      ],
      orders: [],
    });
  });
});

describe("createBrowserTestApi", () => {
  it("exposes deterministic tick and spawn helpers", () => {
    const restaurantScene = createRuntimeScene("Restaurant", []);
    const game = createRuntimeGame(restaurantScene);
    const api = createBrowserTestApi(game);

    api.tick(3);
    api.spawnCustomer(2);

    expect(game.onTick).toHaveBeenCalledTimes(3);
    expect(
      game.getContext().getSceneManager().tick
    ).toHaveBeenCalledTimes(3);
    expect(game.getContext().sendMessage).toHaveBeenCalledWith(
      spawnCustomerGroupMessage,
      {
        count: 2,
      }
    );
  });
});

describe("installBrowserTestApi", () => {
  it("attaches and removes the API based on the environment", () => {
    const host: BrowserTestApiHost = {};
    const game = createRuntimeGame(null);

    expect(
      installBrowserTestApi(game, host, {
        DEV: false,
        MODE: "production",
      })
    ).toBeNull();
    expect(host.__testApi).toBeUndefined();

    const api = installBrowserTestApi(game, host, {
      DEV: false,
      MODE: "test",
    });

    expect(api).not.toBeNull();
    expect(host.__testApi).toBe(api);
  });
});
