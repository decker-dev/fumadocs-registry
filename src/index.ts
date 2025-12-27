/**
 * fumadocs-registry
 *
 * Automatic shadcn registry generation for component libraries built with Fumadocs
 */

export { buildRegistry, resolveOptions } from "./plugin.js";
export { remarkComponentPreview } from "./remark-plugin.js";
export { extractExports, extractExportsFromContent } from "./extract-exports.js";
export {
  extractDependencies,
  extractDependenciesFromContent,
  detectShadcnInCode,
} from "./extract-dependencies.js";
export {
  scanComponents,
  generateRegistryJson,
  generateComponentJsonFiles,
  generateBundleJson,
  writeRegistryFiles,
} from "./generate-registry.js";
export {
  generateDemoPage,
  generateDemoBlock,
  generateAllDemoBlocks,
  writeDemoBlocks,
} from "./generate-blocks.js";

export type {
  PluginOptions,
  ResolvedOptions,
  ComponentInfo,
  ComponentPreviewData,
  RegistryItem,
  Registry,
  RegistryFile,
  ExtractedExports,
  ExtractedDependencies,
  VFileData,
} from "./types.js";

