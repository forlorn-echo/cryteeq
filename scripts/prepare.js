import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const env = { ...process.env, npm_config_global: "false" };

function run(args) {
  const result = spawnSync("npm", args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync("node_modules/tsup")) {
  run(["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
}
run(["run", "build"]);
