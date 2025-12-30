# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2024-12-30

### Fixed

- Demo blocks now correctly reference the main component via `registryDependencies` instead of trying to bundle everything in `files`
- This allows the shadcn CLI to properly resolve and install components with their bundled internal dependencies

### Changed

- Blocks now include the component's registry URL in `registryDependencies` (e.g., `https://billui.com/r/card-input.json`)
- The CLI will fetch and install the component with all its bundled lib files automatically

## [0.3.0] - 2024-12-30

### Added

- **Automatic dependency bundling**: Internal dependencies are now automatically bundled into each component's `files` array for better v0.dev compatibility
- Components with internal imports (like `@/lib/utils`, `@/lib/use-controllable-state`) now work seamlessly with v0.dev without requiring separate registry entries

### Changed

- `generateComponentJsonFiles` now recursively collects and bundles all internal dependencies
- Registry dependencies are now filtered to only include external shadcn components
- Internal dependencies are resolved and included directly in the component's files array

### Fixed

- Components importing custom lib utilities now work correctly in v0.dev
- Import resolution issues when v0.dev validates components before installing dependencies

## [0.2.1] - 2024-12-28

### Initial Release

- Auto-generates `registry.json` and component JSONs
- Auto-injects code into `<ComponentPreview>` in MDX
- Extracts exports and dependencies automatically
- Generates demo blocks for v0.dev integration

