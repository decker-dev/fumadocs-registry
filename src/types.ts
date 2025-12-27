/**
 * Types for fumadocs-registry
 */

export interface PluginOptions {
  /**
   * Base URL for registry references (REQUIRED)
   * @example 'https://myui.com/r'
   */
  baseUrl: string;

  /**
   * Registry metadata
   */
  registry?: {
    name?: string;
    homepage?: string;
  };

  /**
   * Directory containing component source files
   * @default 'src/registry'
   */
  componentsDir?: string;

  /**
   * Subdirectories to scan within componentsDir
   * - 'ui' type subdirs contain .tsx components → target: components/ui/
   * - 'lib' type subdirs contain .ts utilities → target: lib/
   *
   * @default [{ name: 'ui', type: 'ui' }, { name: 'lib', type: 'lib' }]
   * @example [{ name: 'ui', type: 'ui' }, { name: 'animated', type: 'ui' }, { name: 'hooks', type: 'lib' }]
   */
  componentsDirs?: Array<{ name: string; type: "ui" | "lib" }>;

  /**
   * Directories containing MDX documentation files
   * @default ['content/docs/components']
   */
  docsDirs?: string[];

  /**
   * Output directory for generated JSON files
   * @default 'public/r'
   */
  outputDir?: string;

  /**
   * Additional shadcn component mappings
   * Maps component name to registry name
   */
  shadcnComponents?: Record<string, string>;
}

export interface ResolvedOptions {
  baseUrl: string;
  registry: {
    name: string;
    homepage: string;
  };
  componentsDir: string;
  componentsDirs: Array<{ name: string; type: "ui" | "lib" }>;
  docsDirs: string[];
  outputDir: string;
  shadcnComponents: Record<string, string>;
}

export interface ComponentPreviewData {
  /** Component name (e.g., 'plan-card') */
  component: string;
  /** Example identifier (e.g., 'preview', 'default') */
  example: string;
  /** JSX code for the preview */
  code: string;
  /** Source MDX file path */
  sourcePath: string;
}

export interface ExtractedExports {
  /** Named exports from the component file */
  exports: string[];
  /** Default export name if exists */
  defaultExport?: string;
}

export interface ExtractedDependencies {
  /** npm package dependencies */
  dependencies: string[];
  /** shadcn registry dependencies (e.g., 'button', 'badge') */
  registryDependencies: string[];
  /** Internal dependencies (other components in the same registry) */
  internalDependencies: string[];
}

export interface ComponentInfo {
  /** Component name (kebab-case, e.g., 'plan-card') */
  name: string;
  /** Component title (e.g., 'Plan Card') */
  title: string;
  /** Description from frontmatter */
  description: string;
  /** Component type */
  type: "registry:ui" | "registry:lib";
  /** Source file path relative to project root */
  sourcePath: string;
  /** Target path for installation */
  targetPath: string;
  /** Folder within componentsDir ('ui' or 'animated' or 'lib') */
  folder: string;
  /** Extracted exports */
  exports: string[];
  /** npm dependencies */
  dependencies: string[];
  /** shadcn registry dependencies */
  registryDependencies: string[];
  /** Preview examples from MDX */
  previews: ComponentPreviewData[];
}

export interface RegistryFile {
  path: string;
  content: string;
  type: "registry:ui" | "registry:lib" | "registry:component" | "registry:page";
  target: string;
}

export interface RegistryItem {
  $schema: string;
  name: string;
  type: "registry:ui" | "registry:lib" | "registry:block";
  title?: string;
  description: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  meta?: Record<string, unknown>;
  categories?: string[];
}

export interface Registry {
  $schema: string;
  name: string;
  homepage: string;
  items: RegistryItem[];
}

/**
 * Data stored in vfile.data during MDX processing
 */
export interface VFileData {
  componentPreviews?: ComponentPreviewData[];
  frontmatter?: {
    title?: string;
    description?: string;
  };
}

