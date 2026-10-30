const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

const WEBSITE_DIR = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(WEBSITE_DIR, "docs");
const SANDPACK_DIR = path.join(DOCS_DIR, "sandpack");
const PARSE_OPTIONS = { ecmaVersion: 2022 };

const toSlug = (value) => {
	const slug = value
		.toLowerCase()
		.replace(/`/g, "")
		.replace(/<[^>]*>/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return slug || "main";
};

const toPascal = (value) => {
	return value
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
};

const applyReplacements = (source, replacements) => {
	const ordered = replacements.slice().sort((a, b) => b.start - a.start);
	let next = source;

	for (const replacement of ordered) {
		next =
			next.slice(0, replacement.start) +
			replacement.text +
			next.slice(replacement.end);
	}

	return next;
};

const isInsideCodeFence = (content, index) => {
	const prefix = content.slice(0, index);
	const matches = prefix.match(/^[ \t]{0,3}(?:```|~~~)/gm);
	return Boolean(matches && matches.length % 2 === 1);
};

const findSandpackBlocks = (content) => {
	const blocks = [];
	const regex = /^[ \t]*<SandpackExample[\s\S]*?^[ \t]*\/>/gm;
	let match;

	while ((match = regex.exec(content)) !== null) {
		if (isInsideCodeFence(content, match.index)) {
			continue;
		}

		blocks.push({
			start: match.index,
			end: regex.lastIndex,
			text: match[0],
		});
	}

	return blocks;
};

const findFrontmatterInsertionIndex = (content) => {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
	if (!match) {
		return 0;
	}

	return match[0].length;
};

const getLastHeadingBefore = (content, index) => {
	const headingRegex = /^#{1,6}\s+(.+)$/gm;
	let heading = "";
	let match;

	while ((match = headingRegex.exec(content)) !== null) {
		if (match.index >= index) {
			break;
		}

		if (isInsideCodeFence(content, match.index)) {
			continue;
		}

		heading = match[1].trim();
	}

	return heading;
};

const listDocsWithSandpack = (dir) => {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolute = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			if (absolute === SANDPACK_DIR) {
				continue;
			}

			files.push(...listDocsWithSandpack(absolute));
			continue;
		}

		if (!/\.mdx?$/.test(entry.name)) {
			continue;
		}

		const content = fs.readFileSync(absolute, "utf8");
		if (content.includes("<SandpackExample")) {
			files.push(absolute);
		}
	}

	return files.sort((a, b) => a.localeCompare(b));
};

const syncBlock = ({
	block,
	blockIndex,
	docPath,
	category,
	page,
	sectionSlug,
	importLines,
	importLineSet,
	missingFiles,
}) => {
	const markerMatch = /files\s*=\s*\{\{/.exec(block);
	if (!markerMatch) {
		return block;
	}

	const filesObjectStart = markerMatch.index + markerMatch[0].length - 1;
	let filesObjectAst;

	try {
		filesObjectAst = acorn.parseExpressionAt(
			block,
			filesObjectStart,
			PARSE_OPTIONS,
		);
	} catch {
		return block;
	}

	if (filesObjectAst.type !== "ObjectExpression") {
		return block;
	}

	const replacements = [];

	for (const property of filesObjectAst.properties) {
		if (property.type !== "Property") {
			continue;
		}

		let rawFilePath;
		if (property.key.type === "Literal") {
			rawFilePath = String(property.key.value);
		} else if (property.key.type === "Identifier") {
			rawFilePath = property.key.name;
		}

		if (!rawFilePath) {
			continue;
		}

		const normalizedFilePath = rawFilePath.replace(/^\/+/, "");
		if (!normalizedFilePath) {
			continue;
		}

		const variableName = `sandpack${blockIndex}${toPascal(normalizedFilePath)}`;
		const snippetAbsolutePath = path.join(
			SANDPACK_DIR,
			category,
			page,
			sectionSlug,
			normalizedFilePath,
		);

		const relativeImportPath = path
			.relative(path.dirname(docPath), snippetAbsolutePath)
			.replace(/\\/g, "/");

		const importPath = relativeImportPath.startsWith(".")
			? relativeImportPath
			: `./${relativeImportPath}`;

		const importLine = `import ${variableName} from "${importPath}?raw";`;

		if (!importLineSet.has(importLine)) {
			importLineSet.add(importLine);
			importLines.push(importLine);
		}

		if (!fs.existsSync(snippetAbsolutePath)) {
			missingFiles.push(
				`${path.relative(WEBSITE_DIR, docPath)} -> ${path.relative(
					WEBSITE_DIR,
					snippetAbsolutePath,
				)}`,
			);
		}

		if (property.value.type === "ObjectExpression") {
			const codeProperty = property.value.properties.find((nestedProperty) => {
				if (nestedProperty.type !== "Property") {
					return false;
				}

				if (nestedProperty.key.type === "Identifier") {
					return nestedProperty.key.name === "code";
				}

				return String(nestedProperty.key.value) === "code";
			});

			if (!codeProperty || codeProperty.type !== "Property") {
				continue;
			}

			replacements.push({
				start: codeProperty.value.start,
				end: codeProperty.value.end,
				text: variableName,
			});
			continue;
		}

		replacements.push({
			start: property.value.start,
			end: property.value.end,
			text: variableName,
		});
	}

	return applyReplacements(block, replacements);
};

const syncDocFile = (docPath) => {
	const original = fs.readFileSync(docPath, "utf8");
	const blocks = findSandpackBlocks(original);

	if (blocks.length === 0) {
		return {
			changed: false,
			missingFiles: [],
		};
	}

	const relativeFromDocs = path.relative(DOCS_DIR, docPath).replace(/\\/g, "/");
	const category = relativeFromDocs.split("/")[0];
	const page = path.basename(docPath).replace(/\.mdx?$/, "");
	const sectionCounts = new Map();
	const importLines = [];
	const importLineSet = new Set();
	const missingFiles = [];

	let cursor = 0;
	let rebuilt = "";

	blocks.forEach((blockMatch, index) => {
		rebuilt += original.slice(cursor, blockMatch.start);

		const heading = getLastHeadingBefore(original, blockMatch.start);
		const sectionBase = toSlug(heading || "main");
		const nextCount = (sectionCounts.get(sectionBase) || 0) + 1;
		sectionCounts.set(sectionBase, nextCount);

		const sectionSlug =
			nextCount === 1 ? sectionBase : `${sectionBase}-${nextCount}`;

		rebuilt += syncBlock({
			block: blockMatch.text,
			blockIndex: index + 1,
			docPath,
			category,
			page,
			sectionSlug,
			importLines,
			importLineSet,
			missingFiles,
		});

		cursor = blockMatch.end;
	});

	rebuilt += original.slice(cursor);

	const insertionIndex = findFrontmatterInsertionIndex(rebuilt);
	const prefix = rebuilt.slice(0, insertionIndex);
	let suffix = rebuilt.slice(insertionIndex);

	suffix = suffix.replace(/^(?:import\s+sandpack[A-Za-z0-9_]+\s+from\s+"[^"]+\?raw";\r?\n)+/, "");
	suffix = suffix.replace(/^\r?\n*/, "");

	let next = `${prefix}${suffix}`;

	if (importLines.length > 0) {
		const importBlock = `${importLines.join("\n")}\n\n`;
		next = `${prefix}${importBlock}${suffix}`;
	}

	return {
		changed: next !== original,
		next,
		missingFiles,
	};
};

const syncSandpackDocs = ({ write = true, quiet = false } = {}) => {
	const docs = listDocsWithSandpack(DOCS_DIR);
	let updatedCount = 0;
	const missingFiles = [];

	for (const docPath of docs) {
		const result = syncDocFile(docPath);

		missingFiles.push(...result.missingFiles);

		if (!result.changed) {
			continue;
		}

		updatedCount += 1;
		if (write) {
			fs.writeFileSync(docPath, result.next, "utf8");
		}
	}

	if (!quiet) {
		const mode = write ? "updated" : "would update";
		console.log(
			`[sandpack-sync] ${mode} ${updatedCount} doc file(s). Checked ${docs.length}.`,
		);
		if (missingFiles.length > 0) {
			console.warn(
				`[sandpack-sync] Missing snippet files (${missingFiles.length}):`,
			);
			missingFiles.forEach((entry) => console.warn(`- ${entry}`));
		}
	}

	return {
		updatedCount,
		checkedCount: docs.length,
		missingFiles,
	};
};

if (require.main === module) {
	const checkMode = process.argv.includes("--check");
	const result = syncSandpackDocs({ write: !checkMode });

	if (checkMode && result.updatedCount > 0) {
		process.exitCode = 1;
	}
}

module.exports = {
	syncSandpackDocs,
};
