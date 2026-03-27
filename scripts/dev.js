import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");

const buildScript = path.join(__dirname, "build.js");

const runBuild = () => {
  return spawn("node", [buildScript], { stdio: "inherit" });
};

const runServer = () => {
  const command = "npx http-server dist -p 4173 -c-1";
  return spawn(command, {
    stdio: "inherit",
    shell: true
  });
};

let serverProcess = null;
let building = false;
let pending = false;

const rebuild = () => {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const child = runBuild();
  child.on("exit", () => {
    building = false;
    if (pending) {
      pending = false;
      rebuild();
    }
  });
};

const start = () => {
  rebuild();
  serverProcess = runServer();

  fs.watch(srcDir, { recursive: true }, () => {
    rebuild();
  });

  process.on("SIGINT", () => {
    if (serverProcess) serverProcess.kill();
    process.exit(0);
  });
};

start();