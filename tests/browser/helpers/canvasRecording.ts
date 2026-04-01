import type { Page, TestInfo } from "@playwright/test";

declare global {
  interface Window {
    __testApi?: {
      startCanvasRecording?: (options?: {
        fps?: number;
      }) => Promise<boolean>;
      downloadCanvasRecording?: (fileName?: string) => Promise<boolean>;
    };
  }
}

const sanitizeFileName = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
};

const getCanvasVideoName = (testInfo: TestInfo): string => {
  const titlePath = testInfo.titlePath();
  const relevantTitle = titlePath.slice(1).join(" ");
  const safeTitle = sanitizeFileName(relevantTitle || testInfo.title || "browser-test");

  return `canvas-${safeTitle}.webm`;
};

const startCanvasRecordingForPage = async (
  page: Page,
  fps = 60
): Promise<void> => {
  try {
    await page.evaluate(async (recordingFps) => {
      await window.__testApi?.startCanvasRecording?.({
        fps: recordingFps,
      });
    }, fps);
  } catch {
    return;
  }
};

const saveCanvasRecordingForPage = async (
  page: Page,
  testInfo: TestInfo
): Promise<void> => {
  if (page.isClosed()) {
    return;
  }

  try {
    const outputPath = testInfo.outputPath(getCanvasVideoName(testInfo));
    const fileName =
      outputPath.split(/[\\/]/).pop() ?? getCanvasVideoName(testInfo);

    const downloadPromise = page
      .waitForEvent("download", {
        timeout: 2000,
      })
      .catch(() => null);

    const didStartDownload = await page.evaluate(async (downloadFileName) => {
      return (await window.__testApi?.downloadCanvasRecording?.(downloadFileName)) ?? false;
    }, fileName);

    if (!didStartDownload) {
      return;
    }

    const download = await downloadPromise;
    if (!download) {
      return;
    }

    await download.saveAs(outputPath);

    await testInfo.attach("canvas-video", {
      path: outputPath,
      contentType: "video/webm",
    });
  } catch {
    return;
  }
};

export { saveCanvasRecordingForPage, startCanvasRecordingForPage };
