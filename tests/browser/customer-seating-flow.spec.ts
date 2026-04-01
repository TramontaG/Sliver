import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  saveCanvasRecordingForPage,
  startCanvasRecordingForPage,
} from "./helpers/canvasRecording";

type BrowserGameSnapshot = {
  hero: {
    id: string;
    scenePosition: {
      x: number;
      y: number;
    };
  } | null;
  tables: Array<{
    id: string;
    scenePosition: {
      x: number;
      y: number;
    };
    state: string | null;
    seatCount: number;
    activeGroupId: string | null;
    occupiedCustomerIds: string[];
  }>;
  customers: Array<{
    id: string;
    groupId: string | null;
    selected: boolean;
    state: string | null;
    scenePosition: {
      x: number;
      y: number;
    };
  }>;
};

declare global {
  interface Window {
    __testApi?: {
      getSnapshot: () => BrowserGameSnapshot;
      spawnCustomer: (count?: number) => void;
      startCanvasRecording?: (options?: { fps?: number }) => Promise<boolean>;
      downloadCanvasRecording?: (fileName?: string) => Promise<boolean>;
    };
  }
}

const getSnapshot = async (page: Page): Promise<BrowserGameSnapshot> => {
  return page.evaluate(() => window.__testApi!.getSnapshot());
};

const getCanvasMetrics = async (canvas: Locator) => {
  return canvas.evaluate((element) => {
    const htmlCanvas = element as HTMLCanvasElement;
    const rect = htmlCanvas.getBoundingClientRect();

    return {
      width: htmlCanvas.width,
      height: htmlCanvas.height,
      clientWidth: rect.width,
      clientHeight: rect.height,
    };
  });
};

const clickScenePosition = async (
  canvas: Locator,
  scenePosition: { x: number; y: number }
) => {
  const metrics = await getCanvasMetrics(canvas);

  await canvas.click({
    position: {
      x: (scenePosition.x / metrics.width) * metrics.clientWidth,
      y: (scenePosition.y / metrics.height) * metrics.clientHeight,
    },
  });
};

const waitForWaitingGroup = async (page: Page, count: number) => {
  await page.waitForFunction(
    (expectedCount) => {
      const snapshot = window.__testApi?.getSnapshot();
      if (!snapshot) {
        return false;
      }

      return (
        snapshot.customers.length === expectedCount &&
        snapshot.customers.every((customer) => {
          return customer.state === "waitingForSeat";
        })
      );
    },
    count,
    {
      timeout: 10000,
    }
  );
};

const customerCountsToCover = [1, 2, 4] as const;

const getTargetTable = (
  snapshot: BrowserGameSnapshot,
  customerCount: number
) => {
  return [...snapshot.tables]
    .filter((table) => {
      return table.state === "free" && table.seatCount >= customerCount;
    })
    .sort((a, b) => {
      if (a.seatCount !== b.seatCount) {
        return a.seatCount - b.seatCount;
      }

      if (a.scenePosition.x !== b.scenePosition.x) {
        return a.scenePosition.x - b.scenePosition.x;
      }

      return a.scenePosition.y - b.scenePosition.y;
    })[0];
};

test.describe("customer seating flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => {
      return typeof window.__testApi?.getSnapshot === "function";
    });
    await startCanvasRecordingForPage(page, 60);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await saveCanvasRecordingForPage(page, testInfo);
  });

  for (const customerCount of customerCountsToCover) {
    test(`selects a waiting customer group and moves the hero to reception (${customerCount} customers)`, async ({
      page,
    }) => {
      test.setTimeout(20000);

      const canvas = page.locator("canvas").first();

      await page.evaluate((count) => {
        window.__testApi!.spawnCustomer(count);
      }, customerCount);
      await waitForWaitingGroup(page, customerCount);

      const snapshotBeforeClick = await getSnapshot(page);
      const selectedGroupId =
        snapshotBeforeClick.customers[0]?.groupId ?? null;
      expect(selectedGroupId).not.toBeNull();
      if (!selectedGroupId) {
        throw new Error("Expected a spawned customer group to be available.");
      }

      const groupCustomers = snapshotBeforeClick.customers.filter((customer) => {
        return customer.groupId === selectedGroupId;
      });
      const rightmostCustomer = [...groupCustomers].sort((a, b) => {
        return b.scenePosition.x - a.scenePosition.x;
      })[0];
      expect(rightmostCustomer).toBeTruthy();
      if (!rightmostCustomer) {
        throw new Error("Expected to find a customer to click.");
      }

      await clickScenePosition(canvas, rightmostCustomer.scenePosition);

      await page.waitForFunction(
        (groupId) => {
          const snapshot = window.__testApi?.getSnapshot();
          if (!snapshot?.hero) {
            return false;
          }

          const groupCustomers = snapshot.customers.filter((customer) => {
            return customer.groupId === groupId;
          });
          if (groupCustomers.length === 0) {
            return false;
          }

          const allSelected = groupCustomers.every((customer) => {
            return customer.selected === true;
          });
          if (!allSelected) {
            return false;
          }

          const rightmostCustomer = [...groupCustomers].sort((a, b) => {
            return b.scenePosition.x - a.scenePosition.x;
          })[0];
          if (!rightmostCustomer) {
            return false;
          }

          const receptionPosition = {
            x: rightmostCustomer.scenePosition.x + 32,
            y: rightmostCustomer.scenePosition.y,
          };

          return (
            Math.abs(snapshot.hero.scenePosition.x - receptionPosition.x) <= 4 &&
            Math.abs(snapshot.hero.scenePosition.y - receptionPosition.y) <= 4
          );
        },
        selectedGroupId,
        {
          timeout: 10000,
        }
      );
    });

    test(`seats the selected customer group at a compatible free table via browser clicks (${customerCount} customers)`, async ({
      page,
    }) => {
      test.setTimeout(30000);

      const canvas = page.locator("canvas").first();

      await page.evaluate((count) => {
        window.__testApi!.spawnCustomer(count);
      }, customerCount);
      await waitForWaitingGroup(page, customerCount);

      const snapshotBeforeSelection = await getSnapshot(page);
      const selectedGroupId =
        snapshotBeforeSelection.customers[0]?.groupId ?? null;
      expect(selectedGroupId).not.toBeNull();
      if (!selectedGroupId) {
        throw new Error("Expected a spawned customer group to be available.");
      }

      const groupCustomers = snapshotBeforeSelection.customers.filter((customer) => {
        return customer.groupId === selectedGroupId;
      });
      const clickTargetCustomer = [...groupCustomers].sort((a, b) => {
        return b.scenePosition.x - a.scenePosition.x;
      })[0];
      expect(clickTargetCustomer).toBeTruthy();
      if (!clickTargetCustomer) {
        throw new Error("Expected to find a customer to click.");
      }

      const targetTable = getTargetTable(snapshotBeforeSelection, customerCount);
      expect(targetTable).toBeTruthy();
      if (!targetTable) {
        throw new Error(
          `Expected to find a free table for a group of ${customerCount}.`
        );
      }

      await clickScenePosition(canvas, clickTargetCustomer.scenePosition);

      await page.waitForFunction(
        (groupId) => {
          const snapshot = window.__testApi?.getSnapshot();
          if (!snapshot) {
            return false;
          }

          const groupCustomers = snapshot.customers.filter((customer) => {
            return customer.groupId === groupId;
          });

          return (
            groupCustomers.length > 0 &&
            groupCustomers.every((customer) => customer.selected)
          );
        },
        selectedGroupId,
        {
          timeout: 5000,
        }
      );

      await clickScenePosition(canvas, targetTable.scenePosition);

      await page.waitForFunction(
        ({ groupId, tableId, expectedCount }) => {
          const snapshot = window.__testApi?.getSnapshot();
          if (!snapshot) {
            return false;
          }

          const table = snapshot.tables.find((entry) => entry.id === tableId);
          const groupCustomers = snapshot.customers.filter((customer) => {
            return customer.groupId === groupId;
          });

          if (!table || groupCustomers.length !== expectedCount) {
            return false;
          }

          return (
            table.state === "occupied_waiting_order" &&
            table.activeGroupId === groupId &&
            table.occupiedCustomerIds.length === expectedCount &&
            groupCustomers.every((customer) => {
              return customer.state === "seated" && customer.selected === false;
            })
          );
        },
        {
          groupId: selectedGroupId,
          tableId: targetTable.id,
          expectedCount: groupCustomers.length,
        },
        {
          timeout: 15000,
        }
      );

      const finalSnapshot = await getSnapshot(page);
      const finalTable = finalSnapshot.tables.find((table) => {
        return table.id === targetTable.id;
      });
      expect(finalTable?.state).toBe("occupied_waiting_order");
      expect(finalTable?.seatCount).toBeGreaterThanOrEqual(customerCount);
      expect(finalTable?.activeGroupId).toBe(selectedGroupId);
      expect(finalTable?.occupiedCustomerIds).toHaveLength(groupCustomers.length);
    });
  }
});
