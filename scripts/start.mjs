import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = process.env.PORT || "3000";
const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url)
);

const child = spawn(
  process.execPath,
  [nextBin, "start", "-H", "0.0.0.0", "-p", port],
  {
    env: process.env,
    stdio: "inherit"
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
