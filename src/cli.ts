#!/usr/bin/env node
/**
 * CLI for fumadocs-registry
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { buildRegistry } from "./plugin.js";
import type { PluginOptions } from "./types.js";

const CONFIG_FILES = [
  "registry.config.ts",
  "registry.config.js",
  "registry.config.mjs",
];

async function loadConfig(): Promise<PluginOptions | null> {
  for (const configFile of CONFIG_FILES) {
    const configPath = path.resolve(process.cwd(), configFile);
    try {
      await fs.access(configPath);
      const config = await import(configPath);
      return config.default || config;
    } catch {
      continue;
    }
  }
  return null;
}

function printHelp() {
  console.log(`
${pc.bold("fumadocs-registry")} - Generate shadcn registry from your component library

${pc.dim("Usage:")}
  fumadocs-registry

${pc.dim("Config file:")}
  registry.config.ts

${pc.dim("Example:")}
  import type { PluginOptions } from "fumadocs-registry";

  export default {
    baseUrl: "https://myui.com/r",
    registry: { name: "myui" },
  } satisfies PluginOptions;

${pc.dim("Options:")}
  -h, --help     Show this help
  -v, --version  Show version
`);
}

function printVersion() {
  console.log("fumadocs-registry v0.1.0");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    printVersion();
    process.exit(0);
  }

  const config = await loadConfig();

  if (!config) {
    console.error(pc.red("Error:"), "No config file found.");
    console.log(pc.dim("\nCreate"), "registry.config.ts", pc.dim("with:"));
    console.log(`
  import type { PluginOptions } from "fumadocs-registry";

  export default {
    baseUrl: "https://myui.com/r",
    registry: { name: "myui" },
  } satisfies PluginOptions;
`);
    process.exit(1);
  }

  if (!config.baseUrl) {
    console.error(pc.red("Error:"), "baseUrl is required in config.");
    process.exit(1);
  }

  try {
    await buildRegistry(config);
  } catch (error) {
    console.error(pc.red("[fumadocs-registry] Build failed:"), error);
    process.exit(1);
  }
}

main();
