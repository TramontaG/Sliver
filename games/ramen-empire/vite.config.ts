import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";

const gameRoot = fileURLToPath(new URL(".", import.meta.url));
const engineSource = fileURLToPath(
  new URL("../../packages/sliver-engine/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: [{ find: /^sliver-engine$/, replacement: engineSource }],
  },
  optimizeDeps: {
    exclude: ["sliver-engine"],
  },
  server: {
    fs: { allow: [searchForWorkspaceRoot(gameRoot)] },
  },
});
