const path = require("path");
const chokidar = require("chokidar");
const { syncSandpackDocs } = require("./syncSandpackImports.cjs");

const WEBSITE_DIR = path.resolve(__dirname, "..");
const SANDPACK_GLOB = path.join(WEBSITE_DIR, "docs/sandpack/**/*.ts");
const RUN_ONCE = process.argv.includes("--once");
const DEBOUNCE_MS = 120;

let running = false;
let pending = false;
let pendingReason = "initial";
let timer = null;

const runSync = (reason) => {
	if (running) {
		pending = true;
		pendingReason = reason;
		return;
	}

	running = true;

	try {
		console.log(`[sandpack-watch] Syncing (${reason})...`);
		syncSandpackDocs({ write: true, quiet: false });
	} catch (error) {
		console.error("[sandpack-watch] Sync failed:");
		console.error(error);
	} finally {
		running = false;
		if (pending) {
			pending = false;
			const nextReason = pendingReason;
			pendingReason = "queued";
			runSync(nextReason);
		}
	}
};

const scheduleSync = (reason) => {
	if (timer) {
		clearTimeout(timer);
	}

	timer = setTimeout(() => {
		timer = null;
		runSync(reason);
	}, DEBOUNCE_MS);
};

if (RUN_ONCE) {
	runSync("manual");
	process.exit(0);
}

runSync("startup");

const watcher = chokidar.watch(SANDPACK_GLOB, {
	ignoreInitial: true,
	awaitWriteFinish: {
		stabilityThreshold: 80,
		pollInterval: 20,
	},
});

watcher.on("add", (filePath) => {
	scheduleSync(`add:${path.relative(WEBSITE_DIR, filePath)}`);
});

watcher.on("change", (filePath) => {
	scheduleSync(`change:${path.relative(WEBSITE_DIR, filePath)}`);
});

watcher.on("unlink", (filePath) => {
	scheduleSync(`unlink:${path.relative(WEBSITE_DIR, filePath)}`);
});

watcher.on("error", (error) => {
	console.error("[sandpack-watch] Watcher error:");
	console.error(error);
});

const closeWatcher = () => {
	void watcher.close().finally(() => process.exit(0));
};

process.on("SIGINT", closeWatcher);
process.on("SIGTERM", closeWatcher);
