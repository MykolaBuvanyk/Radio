# Radio Development Rules

These rules apply to the entire repository.

## Commands and verification

- Do not run builds, Gradle tasks, Xcode builds, CocoaPods installation, Metro, lint, typecheck, tests, formatters, benchmarks, or profiling unless the user explicitly requests that specific action.
- Dependency installation and read-only inspection are allowed when they are required by the current task.
- Never run automatic dependency remediation such as `npm audit fix` or `npm audit fix --force` without explicit user approval.

## Product language

- All user-visible application text must be written in English.
- Developer documentation and code comments should be written in English unless the user requests another language.

## Styling

- Use NativeWind as the default styling system.
- Keep styles in colocated `*.styles.ts` files. Components import named style/class collections from those files.
- Do not place inline NativeWind class literals or `StyleSheet.create` declarations inside component files.
- Use React Native style objects only when a native API, animation, or unsupported NativeWind property requires them, and keep those objects in the corresponding `*.styles.ts` file.

## Architecture

- Organize application code by feature and add folders only when implementing real functionality.
- Keep framework entry points and screens thin. Business workflows belong in feature services.
- Keep external APIs, SQLite, filesystem access, Track Player, and native modules behind focused adapters.
- Track Player is the only owner of playback state, MediaSession, and the playback foreground service.
- SQLite is the source of truth for persistent data. Zustand contains only transient UI projections and narrowly selected runtime state.
- Validate every untrusted API and RSS payload at runtime before converting it to a domain model.
- Avoid broad barrel exports and circular dependencies. Prefer direct imports.

## React Native and native code

- Keep TypeScript strict and do not introduce `any` to bypass type errors.
- Never perform blocking work on the React Native UI thread or Android main thread.
- Prefer asynchronous native module methods and typed, serializable event payloads.
- Use virtualized lists for station and episode catalogs.
- Measure before adding memoization or speculative performance optimizations.
