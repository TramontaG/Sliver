const path = require("path");
const { spawn } = require("child_process");

const WEBSITE_DIR = path.resolve(__dirname, "..");
const nodeBinary = process.execPath;

const watcherProcess = spawn(
	nodeBinary,
	[path.join("scripts", "watchSandpackImports.cjs")],
	{
		cwd: WEBSITE_DIR,
		stdio: "inherit",
	},
);

const docsProcess = spawn("bun", ["docusaurus", "start", "--port", "3025"], {
	cwd: WEBSITE_DIR,
	stdio: "inherit",
	env: process.env,
});

let shuttingDown = false;

const shutdown = (signal = "SIGTERM") => {
	if (shuttingDown) {
		return;
	}

	shuttingDown = true;

	if (!watcherProcess.killed) {
		watcherProcess.kill(signal);
	}

	if (!docsProcess.killed) {
		docsProcess.kill(signal);
	}
};

docsProcess.on("exit", (code, signal) => {
	shutdown("SIGTERM");
	if (signal) {
		process.exit(1);
		return;
	}
	process.exit(code || 0);
});

watcherProcess.on("exit", (code, signal) => {
	if (shuttingDown) {
		return;
	}

	console.error(
		`[sandpack-watch] exited unexpectedly (${signal || code}). Stopping docs server.`,
	);
	shutdown("SIGTERM");
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
