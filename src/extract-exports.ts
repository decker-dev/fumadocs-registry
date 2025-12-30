/**
 * Extract exports from TypeScript/TSX files using regex
 */

import { promises as fs } from "node:fs";
import type { ExtractedExports } from "./types.js";

/**
 * Extract all named exports from a TypeScript/TSX file
 */
export async function extractExports(
  filePath: string,
): Promise<ExtractedExports> {
  const content = await fs.readFile(filePath, "utf-8");
  return extractExportsFromContent(content);
}

/**
 * Extract exports from file content
 */
export function extractExportsFromContent(content: string): ExtractedExports {
  const exports: string[] = [];
  let defaultExport: string | undefined;

  // Remove comments to avoid false matches
  const cleanContent = removeComments(content);

  // Pattern 1: export { Name1, Name2, ... }
  const namedExportBlockRegex = /export\s*\{([^}]+)\}/g;

  for (const match of cleanContent.matchAll(namedExportBlockRegex)) {
    const exportList = match[1];
    const names = exportList
      .split(",")
      .map((item) => {
        const trimmed = item.trim();
        const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
        if (asMatch) {
          return asMatch[2];
        }
        return trimmed;
      })
      .filter((name) => name && !name.startsWith("type "));

    exports.push(...names);
  }

  // Pattern 2: export const Name = ...
  const exportConstRegex = /export\s+const\s+(\w+)\s*[=:]/g;
  for (const match of cleanContent.matchAll(exportConstRegex)) {
    const name = match[1];
    if (name && !exports.includes(name)) {
      exports.push(name);
    }
  }

  // Pattern 3: export function Name(...)
  const exportFunctionRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*[(<]/g;
  for (const match of cleanContent.matchAll(exportFunctionRegex)) {
    const name = match[1];
    if (name && !exports.includes(name)) {
      exports.push(name);
    }
  }

  // Pattern 4: export class Name
  const exportClassRegex = /export\s+class\s+(\w+)/g;
  for (const match of cleanContent.matchAll(exportClassRegex)) {
    const name = match[1];
    if (name && !exports.includes(name)) {
      exports.push(name);
    }
  }

  // Pattern 5: export default
  const exportDefaultRegex = /export\s+default\s+(?:function\s+)?(\w+)/g;
  for (const match of cleanContent.matchAll(exportDefaultRegex)) {
    defaultExport = match[1];
  }

  // Pattern 6: displayName (React components)
  const displayNameRegex = /(\w+)\.displayName\s*=\s*["'](\w+)["']/g;
  for (const match of cleanContent.matchAll(displayNameRegex)) {
    const varName = match[1];
    if (!exports.includes(varName)) {
      const isExported = new RegExp(
        `export\\s*\\{[^}]*\\b${varName}\\b[^}]*\\}|export\\s+const\\s+${varName}\\b`,
      ).test(cleanContent);
      if (isExported) {
        exports.push(varName);
      }
    }
  }

  // Filter duplicates and invalid names
  const filteredExports = [...new Set(exports)].filter(
    (name) =>
      !name.startsWith("type") && (/^[A-Z]/.test(name) || /^[a-z]/.test(name)),
  );

  return {
    exports: filteredExports,
    defaultExport,
  };
}

function removeComments(content: string): string {
  let result = content.replace(/\/\/.*$/gm, "");
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  return result;
}

export function filterComponentExports(exports: string[]): string[] {
  return exports.filter((name) => /^[A-Z][a-zA-Z0-9]*$/.test(name));
}

export function filterUtilityExports(exports: string[]): string[] {
  return exports.filter(
    (name) => /^[a-z][a-zA-Z0-9]*$/.test(name) || /^[A-Z_]+$/.test(name),
  );
}
