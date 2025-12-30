/**
 * fumadocs-registry
 *
 * Automatic shadcn registry generation for component libraries built with Fumadocs
 */

export {
  detectShadcnInCode,
  extractDependencies,
  extractDependenciesFromContent,
} from "./extract-dependencies.js";
export {
  extractExports,
  extractExportsFromContent,
} from "./extract-exports.js";
export {
  generateAllDemoBlocks,
  generateDemoBlock,
  generateDemoPage,
  writeDemoBlocks,
} from "./generate-blocks.js";
export {
  generateBundleJson,
  generateComponentJsonFiles,
  generateRegistryJson,
  scanComponents,
  writeRegistryFiles,
} from "./generate-registry.js";
export { buildRegistry, resolveOptions } from "./plugin.js";
export { remarkComponentPreview } from "./remark-plugin.js";

export type {
  ComponentInfo,
  ComponentPreviewData,
  ExtractedDependencies,
  ExtractedExports,
  PluginOptions,
  Registry,
  RegistryFile,
  RegistryItem,
  ResolvedOptions,
  VFileData,
} from "./types.js";
