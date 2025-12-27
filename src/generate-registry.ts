/**
 * Generate registry.json and individual component JSON files
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ComponentInfo,
  Registry,
  RegistryItem,
  RegistryFile,
  ResolvedOptions,
} from "./types.js";
import { extractExports } from "./extract-exports.js";
import {
  extractDependencies,
  internalToRegistryDeps,
} from "./extract-dependencies.js";

/**
 * Scan the components directory and build component info
 */
export async function scanComponents(
  options: ResolvedOptions,
): Promise<ComponentInfo[]> {
  const components: ComponentInfo[] = [];
  const componentsDir = path.resolve(process.cwd(), options.componentsDir);

  for (const subDir of options.componentsDirs) {
    const dirPath = path.join(componentsDir, subDir.name);

    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (file === "index.ts" || file === "index.tsx") continue;
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;

        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;

        const componentName = file.replace(/\.(tsx?|jsx?)$/, "");
        const relativePath = path.relative(process.cwd(), filePath);

        const { exports } = await extractExports(filePath);
        const deps = await extractDependencies(filePath, options);

        const type = subDir.type === "lib" ? "registry:lib" : "registry:ui";

        const registryDeps = [
          ...deps.registryDependencies,
          ...internalToRegistryDeps(deps.internalDependencies, options.baseUrl),
        ];

        components.push({
          name: componentName,
          title: kebabToTitle(componentName),
          description: "",
          type,
          sourcePath: relativePath,
          targetPath:
            subDir.type === "lib"
              ? `lib/${componentName}.ts`
              : `components/ui/${componentName}.tsx`,
          folder: subDir.name,
          exports,
          dependencies: deps.dependencies,
          registryDependencies: registryDeps,
          previews: [],
        });
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return components;
}

/**
 * Generate the main registry.json file
 */
export async function generateRegistryJson(
  components: ComponentInfo[],
  options: ResolvedOptions,
): Promise<Registry> {
  const items: RegistryItem[] = [];

  for (const component of components) {
    const content = await fs.readFile(
      path.resolve(process.cwd(), component.sourcePath),
      "utf-8",
    );

    const item: RegistryItem = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: component.name,
      type: component.type,
      title: component.title,
      description: component.description || `${component.title} component`,
      files: [
        {
          path: component.sourcePath,
          content,
          type: component.type,
          target: component.targetPath,
        },
      ],
    };

    if (component.dependencies.length > 0) {
      item.dependencies = component.dependencies;
    }

    if (component.registryDependencies.length > 0) {
      item.registryDependencies = component.registryDependencies;
    }

    items.push(item);
  }

  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: options.registry.name,
    homepage: options.registry.homepage,
    items,
  };
}

/**
 * Generate individual component JSON files
 */
export async function generateComponentJsonFiles(
  components: ComponentInfo[],
  options: ResolvedOptions,
): Promise<Map<string, RegistryItem>> {
  const files = new Map<string, RegistryItem>();

  for (const component of components) {
    const content = await fs.readFile(
      path.resolve(process.cwd(), component.sourcePath),
      "utf-8",
    );

    const item: RegistryItem = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: component.name,
      type: component.type,
      title: component.title,
      description: component.description || `${component.title} component`,
      files: [
        {
          path: component.sourcePath,
          content,
          type: component.type,
          target: component.targetPath,
        },
      ],
    };

    if (component.dependencies.length > 0) {
      item.dependencies = component.dependencies;
    }

    if (component.registryDependencies.length > 0) {
      item.registryDependencies = component.registryDependencies;
    }

    files.set(`${component.name}.json`, item);
  }

  return files;
}

/**
 * Generate the bundled "all components" JSON file
 */
export async function generateBundleJson(
  components: ComponentInfo[],
  options: ResolvedOptions,
): Promise<RegistryItem> {
  const files: RegistryFile[] = [];
  const allDeps = new Set<string>();
  const allRegistryDeps = new Set<string>();

  const bundleComponents = components.filter(
    (c) => c.type === "registry:ui" || c.type === "registry:lib",
  );

  for (const component of bundleComponents) {
    const content = await fs.readFile(
      path.resolve(process.cwd(), component.sourcePath),
      "utf-8",
    );

    files.push({
      path: component.sourcePath,
      content,
      type: component.type,
      target: component.targetPath,
    });

    for (const dep of component.dependencies) {
      allDeps.add(dep);
    }

    for (const dep of component.registryDependencies) {
      if (!dep.includes(options.baseUrl)) {
        allRegistryDeps.add(dep);
      }
    }
  }

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: `${options.registry.name}-all`,
    type: "registry:block",
    description: `All ${options.registry.name} components and utilities.`,
    dependencies: Array.from(allDeps),
    registryDependencies: Array.from(allRegistryDeps),
    files,
  };
}

/**
 * Write all generated files to the output directory
 */
export async function writeRegistryFiles(
  registry: Registry,
  componentFiles: Map<string, RegistryItem>,
  bundleJson: RegistryItem,
  options: ResolvedOptions,
): Promise<void> {
  const outputDir = path.resolve(process.cwd(), options.outputDir);

  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(
    path.join(outputDir, "registry.json"),
    JSON.stringify(registry, null, 2),
  );

  for (const [filename, item] of componentFiles) {
    await fs.writeFile(
      path.join(outputDir, filename),
      JSON.stringify(item, null, 2),
    );
  }

  await fs.writeFile(
    path.join(outputDir, `${options.registry.name}-all.json`),
    JSON.stringify(bundleJson, null, 2),
  );
}

function kebabToTitle(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

