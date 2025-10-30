#!/usr/bin/env node
/*
  Dev wrapper: ensure port 3000 is free and show helpful commands if not.
*/
import net from "node:net";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || 3000);

function checkPort(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err && err.code === "EADDRINUSE") resolve({ port, inUse: true });
        else resolve({ port, inUse: false });
      })
      .once("listening", () => {
        tester.close(() => resolve({ port, inUse: false }));
      })
      .listen(port, "0.0.0.0");
  });
}

(async () => {
  const { inUse } = await checkPort(PORT);
  if (inUse) {
    const isLinux = process.platform === "linux";
    const isMac = process.platform === "darwin";

    const suggestions = isLinux
      ? [`lsof -i :${PORT} -sTCP:LISTEN -nP`, `kill -9 $(lsof -ti :${PORT})`]
      : isMac
        ? [
            `lsof -i tcp:${PORT} -sTCP:LISTEN -nP`,
            `kill -9 $(lsof -ti tcp:${PORT})`,
          ]
        : [`# Free port ${PORT} (manual steps vary by OS)`];

    console.error(
      `\nPort ${PORT} is already in use.\n\nTry:\n  ${suggestions.join("\n  ")}\n`,
    );
    process.exit(1);
  }

  const child = spawn("npm", ["run", "astro", "--", "dev"], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
})();
