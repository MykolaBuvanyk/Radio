# Android E2E tests

The suite uses the open-source Maestro CLI and the accessibility identifiers
exposed by the React Native application. No test SDK is linked into the APK.

## Prerequisites

- Java 17 or newer
- Android SDK and a running emulator or connected device
- Maestro CLI (`brew install mobile-dev-inc/tap/maestro` on macOS)
- The `com.radioapp` debug application installed on the target device
- Metro running for a debug APK

## Run

From the repository root, start Metro and install the debug app in separate
terminals. Then run either suite:

```sh
npm run e2e:android:smoke
npm run e2e:android:network
```

`e2e:android:smoke` is deterministic and does not require a successful external
API response. It covers clean startup, SQLite initialization, tab navigation,
empty states, and local podcast URL validation.

`e2e:android:network` covers Radio Browser results, favorites, live playback,
the mini player, sleep timer, podcast subscription, episode playback, playback
speed, queue persistence, and subscription deletion. It requires internet
access and therefore has longer explicit waits.

The default podcast feed can be overridden without editing the flow:

```sh
maestro test -e PODCAST_FEED_URL=https://example.com/feed.xml \
  --include-tags=network .maestro
```

Run all flows with `npm run e2e:android`. Test artifacts are written to
`.maestro/artifacts` and ignored by Git.

## Manual system scenarios

Phone calls, audio focus competition, unplugged headphones, OEM battery savers,
Doze, lock-screen controls, a ten-second network outage, and completed offline
downloads still require the manual device checklist in the root README. These
flows depend on device or operating-system state and should not be disguised as
deterministic UI tests.
