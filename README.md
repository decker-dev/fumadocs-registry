# fumadocs-registry

Automatic [shadcn registry](https://ui.shadcn.com/docs/registry) generation for component libraries built with [Fumadocs](https://fumadocs.dev).

## Features

- Auto-generates `registry.json` and component JSONs
- Auto-injects code into `<ComponentPreview>` in MDX
- Extracts exports and dependencies automatically
- **Automatic dependency bundling** for v0.dev compatibility
- Zero manual configuration for component metadata

## Quick Start

```bash
pnpm add fumadocs-registry
```

Run the init command to set up your project:

```bash
npx fumadocs-registry init
```

This creates:
- `registry.config.ts` - Configuration file
- `src/components/docs/component-preview.tsx` - Preview component

## Setup

### 1. Add the remark plugin

In `source.config.ts`:

```ts
import { remarkComponentPreview } from "fumadocs-registry/remark";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkComponentPreview],
  },
});
```

### 2. Register the component

In `mdx-components.tsx`:

```tsx
import { ComponentPreview } from "@/components/docs/component-preview";

export function useMDXComponents(components: MDXComponents) {
  return {
    ComponentPreview,
    ...components,
  };
}
```

### 3. Add build script

In `package.json`:

```json
{
  "scripts": {
    "build": "fumadocs-registry && next build"
  }
}
```

## Usage

Write your component documentation using `<ComponentPreview>`:

```mdx
<ComponentPreview component="button" example="preview">
  <Button>Click me</Button>
</ComponentPreview>
```

The plugin automatically:
1. Injects the source code as the `code` prop
2. Generates registry JSON files in `public/r/`
3. Creates demo blocks for v0.dev integration

## Configuration

Create `registry.config.ts` in your project root:

```ts
import type { PluginOptions } from "fumadocs-registry";

export default {
  // Required: Base URL where registry files are served
  baseUrl: "https://myui.com/r",

  // Optional: Registry metadata
  registry: {
    name: "myui",
    homepage: "https://myui.com",
  },

  // Optional: Component directories (default: [{ name: "ui", type: "ui" }])
  componentsDirs: [
    { name: "ui", type: "ui" },
    { name: "animated", type: "ui" },
    { name: "lib", type: "lib" },
  ],

  // Optional: Docs directories to scan (default: ["content/docs/components"])
  docsDirs: [
    "content/docs/components",
    "content/docs/animated",
  ],

  // Optional: Other settings
  componentsDir: "src/registry",  // Default: "src/registry"
  outputDir: "public/r",          // Default: "public/r"
} satisfies PluginOptions;
```

## Project Structure

Expected directory structure:

```
your-project/
├── src/
│   ├── registry/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   └── card.tsx
│   │   └── lib/
│   │       └── utils.ts
│   └── components/
│       └── docs/
│           └── component-preview.tsx
├── content/
│   └── docs/
│       └── components/
│           ├── button.mdx
│           └── card.mdx
├── public/
│   └── r/                # Generated (auto-created)
└── registry.config.ts
```

## CLI Commands

```bash
# Initialize a new project
fumadocs-registry init

# Build the registry
fumadocs-registry

# Show help
fumadocs-registry --help
```

## Output

The plugin generates:

- `public/r/registry.json` - Main registry index
- `public/r/button.json` - Component registry entry
- `public/r/button-demo-preview.json` - Demo block for v0.dev

## Automatic Dependency Bundling

Since v0.3.0, fumadocs-registry automatically bundles internal dependencies directly into each component's `files` array. This ensures compatibility with v0.dev and the shadcn CLI.

**How it works:**

When a component imports internal utilities or other components from your registry:

```tsx
import { useControllableState } from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";
```

Instead of creating separate `registryDependencies` URLs, fumadocs-registry will:

1. Detect all internal imports recursively
2. Bundle all required files into the component's `files` array
3. Keep only external shadcn dependencies in `registryDependencies`

**Example output:**

```json
{
  "name": "card-input",
  "files": [
    { "target": "components/ui/card-input.tsx", ... },
    { "target": "lib/use-controllable-state.ts", ... },
    { "target": "lib/utils.ts", ... }
  ],
  "dependencies": ["clsx", "tailwind-merge"]
}
```

This ensures v0.dev can resolve all imports without needing to fetch multiple registry entries.

## License

MIT
