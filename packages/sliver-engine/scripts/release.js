import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const usage =
	"Usage: bun scripts/release.js <version> [--tag <tag>] [--access <access>] [--dry-run]";

if (args.length === 0) {
	console.error(usage);
	process.exit(1);
}

let version = null;
let tag = null;
let access = null;
let dryRun = false;

for (let i = 0; i < args.length; i += 1) {
	const arg = args[i];
	if (!version && !arg.startsWith("--")) {
		version = arg;
		continue;
	}

	if (arg === "--tag") {
		tag = args[i + 1] ?? null;
		i += 1;
		continue;
	}

	if (arg === "--access") {
		access = args[i + 1] ?? null;
		i += 1;
		continue;
	}

	if (arg === "--dry-run") {
		dryRun = true;
		continue;
	}

	console.error(`Unknown argument: ${arg}`);
	console.error(usage);
	process.exit(1);
}

if (!version) {
	console.error("Missing version.");
	console.error(usage);
	process.exit(1);
}

if (tag === null && args.includes("--tag")) {
	console.error("Missing value for --tag.");
	console.error(usage);
	process.exit(1);
}

if (access === null && args.includes("--access")) {
	console.error("Missing value for --access.");
	console.error(usage);
	process.exit(1);
}

const run = (command, commandArgs) => {
	const result = spawnSync(command, commandArgs, { stdio: "inherit" });
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
};

const pkgPath = path.join(process.cwd(), "package.json");
const pkgRaw = await readFile(pkgPath, "utf8");
const pkg = JSON.parse(pkgRaw);
pkg.version = version;
await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

run("bun", ["run", "docs:version", "--", version]);
run("bun", ["run", "build"]);

const publishArgs = ["publish"];
if (tag) {
	publishArgs.push("--tag", tag);
}
if (access) {
	publishArgs.push("--access", access);
}
if (dryRun) {
	publishArgs.push("--dry-run");
}
run("npm", publishArgs);
