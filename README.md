# fumadocs-registry

Automatic [shadcn registry](https://ui.shadcn.com/docs/registry) generation for component libraries built with [Fumadocs](https://fumadocs.dev).

## Features

- Auto-detect exports from component files
- Auto-detect dependencies (npm + shadcn)
- Generate registry.json and component JSONs
- Generate demo blocks from `<ComponentPreview>` in MDX
- Remark plugin for automatic code injection

## Installation

```bash
pnpm add fumadocs-registry
```

## Setup

Create `registry.config.ts`:

```ts
import type { PluginOptions } from "fumadocs-registry";

export default {
  baseUrl: "https://myui.com/r",
  registry: { name: "myui" },
} satisfies PluginOptions;
```

Add to `package.json`:

```json
{
  "scripts": {
    "build:registry": "fumadocs-registry"
  }
}
```

Add remark plugin to `source.config.ts`:

```ts
import { remarkComponentPreview } from "fumadocs-registry/remark";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkComponentPreview],
  },
});
```

## Usage

Run:

```bash
pnpm build:registry
```

## Config Options

```ts
export default {
  // Required
  baseUrl: "https://myui.com/r",

  // Optional
  registry: {
    name: "myui",           // default: "components"
    homepage: "https://myui.com",
  },
  componentsDir: "src/registry",  // default: "src/registry"
  componentsDirs: [               // default: [{ name: "ui", type: "ui" }, { name: "lib", type: "lib" }]
    { name: "ui", type: "ui" },
    { name: "hooks", type: "lib" },
  ],
  docsDirs: ["content/docs/components"],  // default: ["content/docs/components"]
  outputDir: "public/r",                   // default: "public/r"
} satisfies PluginOptions;
```

## How It Works

1. Write component in `src/registry/ui/my-button.tsx`
2. Document in `content/docs/components/my-button.mdx`:

```mdx
---
title: My Button
description: A button component.
---

<ComponentPreview component="my-button" example="preview">
  <MyButton>Click</MyButton>
</ComponentPreview>
```

3. Run `fumadocs-registry`
4. Generated in `public/r/`:
   - `registry.json`
   - `my-button.json`
   - `my-button-demo-preview.json`

## License

MIT
# fumadocs-registry
