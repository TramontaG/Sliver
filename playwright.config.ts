import { defineConfig, devices } from "@playwright/test";

type TraceMode =
  | "on"
  | "off"
  | "on-first-retry"
  | "on-all-retries"
  | "retain-on-failure";

type VideoMode = "off" | "on" | "retain-on-failure" | "on-first-retry";

type ScreenshotMode = "off" | "on" | "only-on-failure";
type VideoConfig = {
  mode: VideoMode;
  size: {
    width: number;
    height: number;
  };
};

const readTraceMode = (): TraceMode => {
  switch (process.env.PLAYWRIGHT_TRACE_MODE) {
    case "on":
    case "off":
    case "on-first-retry":
    case "on-all-retries":
    case "retain-on-failure":
      return process.env.PLAYWRIGHT_TRACE_MODE;
    default:
      return "on-first-retry";
  }
};

const readVideoMode = (): VideoMode => {
  switch (process.env.PLAYWRIGHT_VIDEO_MODE) {
    case "off":
    case "on":
    case "retain-on-failure":
    case "on-first-retry":
      return process.env.PLAYWRIGHT_VIDEO_MODE;
    default:
      return "on";
  }
};

const readVideoConfig = (): VideoConfig => {
  return {
    mode: readVideoMode(),
    size: {
      width: 1600,
      height: 900,
    },
  };
};

const readScreenshotMode = (): ScreenshotMode => {
  switch (process.env.PLAYWRIGHT_SCREENSHOT_MODE) {
    case "off":
    case "on":
    case "only-on-failure":
      return process.env.PLAYWRIGHT_SCREENSHOT_MODE;
    default:
      return "only-on-failure";
  }
};

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results",
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: process.env.PLAYWRIGHT_REPORT_DIR ?? "playwright-report",
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: {
      width: 1600,
      height: 900,
    },
    trace: readTraceMode(),
    video: readVideoConfig(),
    screenshot: readScreenshotMode(),
  },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {
          width: 1600,
          height: 900,
        },
        screen: {
          width: 1600,
          height: 900,
        },
      },
    },
  ],
});
