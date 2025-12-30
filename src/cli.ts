#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import { buildRegistry } from "./plugin.js";
import type { PluginOptions } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "..", "templates");

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
    } catch {}
  }
  return null;
}

async function loadTemplate(name: string): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, name);
  return fs.readFile(templatePath, "utf-8");
}

function printHelp() {
  console.log(`
${pc.bold("fumadocs-registry")} - Generate shadcn registry from your component library

${pc.dim("Usage:")}
  fumadocs-registry              Build the registry
  fumadocs-registry init         Setup files for a new project

${pc.dim("Commands:")}
  init     Create registry.config.ts and ComponentPreview component
  build    Build the registry (default)

${pc.dim("Options:")}
  -h, --help     Show this help
  -v, --version  Show version
`);
}

function printVersion() {
  console.log("fumadocs-registry v0.3.2");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runInit() {
  console.log(`\n${pc.bold("fumadocs-registry init")}\n`);

  const cwd = process.cwd();

  // Detect project name from package.json
  let projectName = "myui";
  let projectHomepage = "https://myui.com";
  try {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
    if (pkg.name) {
      projectName = pkg.name.replace(/^@[^/]+\//, "");
    }
    if (pkg.homepage) {
      projectHomepage = pkg.homepage;
    }
  } catch {
    // Ignore errors
  }

  const baseUrl = `${projectHomepage}/r`;

  // Create registry.config.ts
  const configPath = path.join(cwd, "registry.config.ts");
  if (await fileExists(configPath)) {
    console.log(pc.yellow("skip"), "registry.config.ts already exists");
  } else {
    const template = await loadTemplate("registry.config.ts");
    const content = template
      .replace("{{BASE_URL}}", baseUrl)
      .replace("{{NAME}}", projectName)
      .replace("{{HOMEPAGE}}", projectHomepage);

    await fs.writeFile(configPath, content);
    console.log(pc.green("created"), "registry.config.ts");
  }

  // Create ComponentPreview component
  const componentDir = path.join(cwd, "src", "components", "docs");
  const componentPath = path.join(componentDir, "component-preview.tsx");

  if (await fileExists(componentPath)) {
    console.log(
      pc.yellow("skip"),
      "src/components/docs/component-preview.tsx already exists",
    );
  } else {
    await fs.mkdir(componentDir, { recursive: true });

    const template = await loadTemplate("component-preview.tsx");
    const content = template.replace("{{BASE_URL}}", baseUrl);

    await fs.writeFile(componentPath, content);
    console.log(
      pc.green("created"),
      "src/components/docs/component-preview.tsx",
    );
  }

  console.log(`
${pc.bold("Next steps:")}

1. Add the remark plugin to ${pc.cyan("source.config.ts")}:

   ${pc.dim('import { remarkComponentPreview } from "fumadocs-registry/remark";')}

   ${pc.dim("export default defineConfig({")}
     ${pc.dim("mdxOptions: {")}
       ${pc.dim("remarkPlugins: [remarkComponentPreview],")}
     ${pc.dim("},")}
   ${pc.dim("});")}

2. Add to ${pc.cyan("mdx-components.tsx")}:

   ${pc.dim('import { ComponentPreview } from "@/components/docs/component-preview";')}

   ${pc.dim("export function useMDXComponents(components: MDXComponents) {")}
     ${pc.dim("return {")}
       ${pc.dim("ComponentPreview,")}
       ${pc.dim("...components,")}
     ${pc.dim("};")}
   ${pc.dim("}")}

3. Add build script to ${pc.cyan("package.json")}:

   ${pc.dim('"build": "fumadocs-registry && next build"')}

4. Use in MDX:

   ${pc.dim('<ComponentPreview component="button" example="preview">')}
     ${pc.dim("<Button>Click me</Button>")}
   ${pc.dim("</ComponentPreview>")}
`);
}

async function runBuild() {
  const config = await loadConfig();

  if (!config) {
    console.error(pc.red("Error:"), "No config file found.");
    console.log(
      pc.dim("\nRun"),
      "fumadocs-registry init",
      pc.dim("to get started."),
    );
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

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    printVersion();
    process.exit(0);
  }

  if (command === "init") {
    await runInit();
    process.exit(0);
  }

  await runBuild();
}

main();
