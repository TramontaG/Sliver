import { expect, test } from "@playwright/test";

type BrowserGameSnapshot = {
  session: {
    currentScene: string | null;
    activeScenes: string[];
    tickCount: number;
    frameCount: number;
    tickRate: number;
  };
  tables: Array<{
    id: string;
    state: string | null;
  }>;
  customers: Array<{
    id: string;
    groupId: string | null;
    state: string | null;
  }>;
  orders: Array<{
    id: string;
    status: string | null;
  }>;
};

declare global {
  interface Window {
    __testApi?: {
      getSnapshot: () => BrowserGameSnapshot;
      getCustomers: () => BrowserGameSnapshot["customers"];
      spawnCustomer: (count?: number) => void;
      tick: (count?: number) => BrowserGameSnapshot;
    };
  }
}

test.describe("canvas test instrumentation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => {
      return typeof window.__testApi?.getSnapshot === "function";
    });
  });

  test("reads the gameplay snapshot from the browser runtime", async ({
    page,
  }) => {
    const snapshot = await page.evaluate(() => {
      return window.__testApi!.getSnapshot();
    });

    expect(snapshot.session.currentScene).toBe("Restaurant");
    expect(snapshot.session.activeScenes).toContain("Restaurant");
    expect(snapshot.session.tickRate).toBeGreaterThan(0);
    expect(snapshot.tables.length).toBeGreaterThan(0);
    expect(snapshot.tables.every((table) => table.state === "free")).toBe(true);
    expect(Array.isArray(snapshot.customers)).toBe(true);
    expect(Array.isArray(snapshot.orders)).toBe(true);
  });

  test("drives deterministic setup helpers without DOM-based assertions", async ({
    page,
  }) => {
    const beforeCount = await page.evaluate(() => {
      return window.__testApi!.getCustomers().length;
    });

    const snapshotAfterSpawn = await page.evaluate(() => {
      window.__testApi!.spawnCustomer(2);
      return window.__testApi!.tick(1);
    });

    expect(snapshotAfterSpawn.customers.length).toBe(beforeCount + 2);
    expect(snapshotAfterSpawn.customers.every((customer) => customer.groupId)).toBe(
      true
    );
    expect(snapshotAfterSpawn.session.currentScene).toBe("Restaurant");
  });
});
