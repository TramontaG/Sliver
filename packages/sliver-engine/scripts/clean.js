import fs from "node:fs";

if (fs.rmSync) {
  fs.rmSync("dist", { recursive: true, force: true });
} else if (fs.existsSync("dist")) {
  fs.rmdirSync("dist", { recursive: true });
}

