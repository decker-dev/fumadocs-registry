/**
 * Extract dependencies from TypeScript/TSX import statements
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtractedDependencies, ResolvedOptions } from "./types.js";

/**
 * Known shadcn component mappings
 */
const DEFAULT_SHADCN_COMPONENTS: Record<string, string> = {
  button: "button",
  badge: "badge",
  input: "input",
  label: "label",
  select: "select",
  progress: "progress",
  card: "card",
  dialog: "dialog",
  popover: "popover",
  tooltip: "tooltip",
  avatar: "avatar",
  checkbox: "checkbox",
  switch: "switch",
  tabs: "tabs",
};

/**
 * npm packages to track as dependencies
 */
const NPM_DEPENDENCY_PATTERNS = [
  /^lucide-react$/,
  /^class-variance-authority$/,
  /^clsx$/,
  /^tailwind-merge$/,
  /^motion$/,
  /^framer-motion$/,
  /^@radix-ui\//,
  /^date-fns$/,
  /^zod$/,
];

const EXCLUDED_PACKAGES = new Set([
  "react",
  "react-dom",
  "next",
  "next/link",
  "next/image",
  "next/navigation",
]);

export async function extractDependencies(
  filePath: string,
  options: ResolvedOptions,
): Promise<ExtractedDependencies> {
  const content = await fs.readFile(filePath, "utf-8");
  return extractDependenciesFromContent(content, filePath, options);
}

export function extractDependenciesFromContent(
  content: string,
  filePath: string,
  options: ResolvedOptions,
): ExtractedDependencies {
  const dependencies: Set<string> = new Set();
  const registryDependencies: Set<string> = new Set();
  const internalDependencies: Set<string> = new Set();

  const shadcnMap = {
    ...DEFAULT_SHADCN_COMPONENTS,
    ...options.shadcnComponents,
  };

  const importRegex =
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?["']([^"']+)["']/g;

  for (const match of content.matchAll(importRegex)) {
    const importPath = match[1];
    if (!importPath) continue;
    if (match[0].includes("import type")) continue;

    const result = categorizeImport(importPath, filePath, options, shadcnMap);

    if (result.type === "npm") {
      dependencies.add(result.name);
    } else if (result.type === "shadcn") {
      registryDependencies.add(result.name);
    } else if (result.type === "internal") {
      internalDependencies.add(result.name);
    }
  }

  return {
    dependencies: Array.from(dependencies),
    registryDependencies: Array.from(registryDependencies),
    internalDependencies: Array.from(internalDependencies),
  };
}

interface ImportCategory {
  type: "npm" | "shadcn" | "internal" | "ignore";
  name: string;
}

function categorizeImport(
  importPath: string,
  filePath: string,
  _options: ResolvedOptions,
  shadcnMap: Record<string, string>,
): ImportCategory {
  if (EXCLUDED_PACKAGES.has(importPath)) {
    return { type: "ignore", name: importPath };
  }

  // npm package
  if (!importPath.startsWith(".") && !importPath.startsWith("@/")) {
    for (const pattern of NPM_DEPENDENCY_PATTERNS) {
      if (pattern.test(importPath)) {
        const packageName = importPath.startsWith("@")
          ? importPath.split("/").slice(0, 2).join("/")
          : importPath;
        return { type: "npm", name: packageName };
      }
    }
    return { type: "ignore", name: importPath };
  }

  // shadcn component (@/components/ui/*)
  if (importPath.startsWith("@/components/ui/")) {
    const componentFile = importPath.replace("@/components/ui/", "");
    const shadcnName = shadcnMap[componentFile] || componentFile;
    return { type: "shadcn", name: shadcnName };
  }

  // internal registry import (@/registry/*)
  if (importPath.startsWith("@/registry/")) {
    const parts = importPath.replace("@/registry/", "").split("/");
    const componentName = parts[parts.length - 1];
    return { type: "internal", name: componentName };
  }

  // relative imports
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const relativeToCwd = path.relative(process.cwd(), resolvedPath);

    if (relativeToCwd.includes("registry/")) {
      const componentName = path
        .basename(importPath)
        .replace(/\.(tsx?|jsx?)$/, "");
      return { type: "internal", name: componentName };
    }
  }

  // lib import (@/lib/*)
  if (importPath.startsWith("@/lib/")) {
    const libName = importPath
      .replace("@/lib/", "")
      .replace(/\.(tsx?|jsx?)$/, "");
    return { type: "internal", name: libName };
  }

  return { type: "ignore", name: importPath };
}

export function internalToRegistryDeps(
  internalDeps: string[],
  baseUrl: string,
): string[] {
  return internalDeps.map((dep) => `${baseUrl}/${dep}.json`);
}

export function detectShadcnInCode(
  code: string,
  shadcnMap: Record<string, string> = DEFAULT_SHADCN_COMPONENTS,
): string[] {
  const detected: Set<string> = new Set();

  for (const [componentName, registryName] of Object.entries(shadcnMap)) {
    const pascalName =
      componentName.charAt(0).toUpperCase() + componentName.slice(1);
    if (code.includes(`<${pascalName}`) || code.includes(`<${pascalName}/>`)) {
      detected.add(registryName);
    }
  }

  const commonComponents = ["Button", "Badge", "Input", "Label", "Progress"];
  for (const comp of commonComponents) {
    if (code.includes(`<${comp}`)) {
      const lower = comp.toLowerCase();
      if (shadcnMap[lower]) {
        detected.add(shadcnMap[lower]);
      }
    }
  }

  return Array.from(detected);
}
