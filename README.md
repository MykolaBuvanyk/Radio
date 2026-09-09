# Radio

Radio is a React Native CLI application for live radio and podcasts. The app
uses TypeScript, NativeWind, SQLite, `@rntp/player`, and a local Kotlin Turbo
Module.

## Current architecture

Application code is organized by feature:

- `src/app` owns bootstrap, providers, and navigation.
- `src/features/radio` owns Radio Browser catalog and live-station playback.
- `src/features/podcasts` owns RSS/Atom fetching, feed parsing, subscriptions,
  and the paginated episode catalog.
- `src/features/player` owns the app-facing player domain, state, persistence,
  and the Track Player adapter.
- `src/features/queue` owns episode queue workflows and the draggable queue UI.
- `src/features/downloads` owns resumable transfers, offline file resolution,
  download state, and cache eviction.
- `src/features/system` owns Android system and power-management integration.
- `src/shared/database` owns SQLite setup and schema migrations.
- `modules/radio-system` is a local New Architecture native module. Its typed
  TypeScript spec is the contract between the app and Kotlin/Objective-C++.

Zustand is used only for transient UI/player state. SQLite is the persistent
source of truth. Native libraries are accessed through infrastructure adapters,
so library-specific types do not enter the app domain.

## End-to-end tests

Android user journeys are covered by the Maestro flows in `.maestro`. Stable
React Native `testID` values are used for navigation, dynamic catalog cards,
player controls, subscriptions, episodes, downloads, and the local library.

- `npm run e2e:android:smoke` checks clean startup, SQLite initialization,
  navigation, empty states, and local feed URL validation without relying on a
  successful external API response.
- `npm run e2e:android:network` checks the Radio Browser catalog, favorites,
  live playback, sleep timer, RSS subscription, episode playback speed, the
  persisted queue, and subscription deletion.
- `npm run e2e:android` runs the complete suite.

The debug app must be installed, Metro must be running, and an Android emulator
or device must be connected. See `.maestro/README.md` for setup, environment
overrides, and the system scenarios that remain manual.

## Podcast feeds

The Podcasts tab accepts public HTTP or HTTPS RSS/Atom feed URLs. Feed payloads
are treated as untrusted data and normalized before they enter the domain or
SQLite:

- network requests have a 15-second timeout and an 8 MB response limit;
- ETag and Last-Modified validators avoid downloading unchanged feeds;
- RSS 2.0, Atom, iTunes fields, CDATA, HTML descriptions, common entities, and
  multiple date/duration formats are normalized;
- episodes without a title or valid HTTP(S) audio enclosure are skipped;
- missing enclosure sizes and optional metadata remain nullable;
- subscription and episode updates are written in one SQLite transaction;
- each sync imports at most the 200 newest playable episodes, while the UI reads the
  local catalog in virtualized pages of 30 items.

RSS does not define a universal server-side pagination mechanism. Limiting each
sync prevents unusually large archives from expanding the local database and UI
without bounds while still retaining a useful recent catalog.

## Playback queue and episode progress

The episode queue is persisted in SQLite and projected into Track Player only
when podcast playback starts. Starting live radio replaces the native runtime
queue but does not erase the saved podcast queue.

- Episodes can be played immediately or appended from the podcast details
  screen.
- The Queue tab supports long-press drag-and-drop ordering, play/pause, and
  removal.
- Queue writes are serialized and stored transactionally before the matching
  native queue operation runs.
- Track Player receives the complete ordered queue, so automatic transitions
  and native Next/Previous controls continue without depending on a mounted UI.
- The persistent queue is limited to 500 items.

Episode progress checkpoints are emitted by the native player every 10 seconds.
Only podcast episode checkpoints are written to SQLite. A final checkpoint is
also emitted when playback pauses, while the app lifecycle flushes any pending
write before entering the background. This avoids a database write every second
while limiting position loss if the UI process disappears.

When an episode is selected or reached through automatic queue transition, its
saved position is restored with a five-second rewind. Completed episodes start
from the beginning. An episode is considered completed after reaching 98% or
the final 15 seconds.

## Offline episode downloads

Episode audio is downloaded directly to the application document directory by
the native filesystem/network adapter. File bytes never cross the JavaScript
bridge. SQLite remains the source of truth for queued, downloading, paused,
failed, and completed states.

- Up to two episodes download concurrently.
- Progress events are limited to four per second and SQLite checkpoints are
  throttled further by time and byte count.
- Pausing cancels the active native request, commits its downloaded segment to
  a `.part` file, and resumes later with an HTTP `Range` request.
- A server that ignores `Range` and returns `200` replaces the partial file
  safely instead of appending duplicate bytes.
- HTTP status, `Content-Range`, response length, and the final on-disk size are
  checked before a file is marked complete.
- Interrupted in-progress database rows return to the queue after application
  startup and continue from an existing partial file.
- Completed files are selected instead of remote enclosure URLs when a podcast
  queue is activated, so they remain playable in airplane mode.
- Cache limits of 250 MB, 500 MB, or 1 GB are available in Downloads. The least
  recently played completed episodes are evicted first; the currently playing
  episode is never evicted.
- Removing a download deletes its file and database row. Podcast/episode
  deletion services also delete the local and partial files returned by the
  cascading SQLite operation.

`react-native-blob-util` uses an iOS background task for transfers. On Android,
the native request can continue while the app is backgrounded as long as the
process remains alive; playback's foreground service improves survival while
audio is active. A force-stop, OEM process kill, reboot, or iOS background-time
expiration can stop the network request. The persisted partial file is resumed
the next time the app starts. Android DownloadManager is intentionally not used
because it cannot provide the same app-controlled pause/append workflow and
stores files outside this private cache lifecycle.

## Android background playback

`@rntp/player` is the only owner of playback, the foreground media service,
and the Android MediaSession. It provides the ongoing media notification and
native remote controls. The app intentionally does not register a second audio
service or MediaSession because two competing owners can produce duplicated
notifications, conflicting commands, and incorrect playback state.

The current player configuration includes:

- a media-playback foreground service and persistent media notification;
- MediaSession controls for play/pause, stop, next/previous, and 30-second seek
  actions;
- exclusive audio focus handling for calls, alarms, and other players;
- pause handling for a disconnected wired or Bluetooth audio route;
- a network wake mode for live streams;
- continued playback after the app is removed from Android recents;
- live-edge recovery for live radio streams.

The custom `RadioSystem` Kotlin Turbo Module does not control audio. It exposes
battery-optimization status and settings to the Library screen. It also owns a
live-radio recovery controller that observes Android connectivity, applies a
bounded exponential retry policy, detects stalled buffering, collects session
statistics, and emits typed retry events to JavaScript. Track Player remains the
only component that reloads media or controls audio.

Live-radio recovery uses five attempts with delays of 1, 2, 4, 8, and 16
seconds, capped at 30 seconds. A stream that remains buffering for 12 seconds is
reloaded. If the device is offline, retry attempts pause without consuming the
attempt budget and resume 500 ms after connectivity returns. Switching between
Wi-Fi, cellular, Ethernet, and VPN is recorded, while network and unknown player
errors enter the retry flow. Source errors such as HTTP 404 and decoder errors
remain terminal because retrying the same invalid source would not help.

The mini player includes a native sleep timer with 15, 30, 45, and 60-minute
presets. The countdown lives inside Track Player rather than a JavaScript
timeout, so it continues while the application is backgrounded. Playback fades
out over the final 15 seconds, and the timer can be replaced or cancelled from
the mini player.

Podcast episodes support playback speeds from 0.5x through 2x. The selected
episode speed is retained for the current application session and reapplied
when a podcast queue replaces live radio. Live streams always use 1x so speed
processing cannot move playback away from the live edge.

## Battery optimization and OEM limitations

Android Doze and App Standby can restrict background CPU and network access.
The Library screen shows the current battery-optimization status. A direct
`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` system prompt is opened only after the
user explicitly presses **Allow unrestricted battery use**. The app never
requests this exemption during startup. A general battery-optimization settings
screen is also available as a fallback.

An exemption improves reliability but does not make a process immortal.
Xiaomi/Redmi/Poco, Huawei/Honor, Oppo/Realme/OnePlus, Vivo, Samsung, Asus, and
Meizu firmware may add proprietary battery managers, auto-start restrictions,
or background-process limits. Their option names and behavior vary by device
and OS release. Users may still need to allow auto-start, remove the app from a
sleeping-app list, or choose an unrestricted battery mode in the manufacturer's
settings. Android does not provide one standard API that can guarantee or force
these vendor-specific permissions.

Direct battery-optimization exemption requests are subject to Android and app
store policy. This pet project currently targets local/sideloaded builds. Before
publishing through Google Play or another store, review the current distribution
policy and consider removing the direct exemption request while keeping the
general settings shortcut.

## Manual Android test checklist

Use a physical Android device for meaningful background and audio-focus tests:

1. Start a radio station and lock the screen. Confirm audio continues and the
   media notification shows the station metadata.
2. Use play/pause from the lock screen and notification.
3. Send the app to the background and remove it from recents. Confirm playback
   continues.
4. Disconnect wired headphones or the active Bluetooth route. Confirm playback
   pauses instead of moving unexpectedly to the speaker.
5. Start another media app or simulate an interruption. Confirm Radio yields
   audio focus and can resume appropriately after the interruption.
6. Turn off connectivity for 10 seconds, restore it, and observe the buffering
   and recovery behavior.
7. Open **Library → Background playback**, request unrestricted battery use,
   return to Radio, and confirm the status updates.
8. Repeat the locked-screen test after the device has been idle long enough to
   enter Doze. Vendor-specific battery settings may still be required.

The **Next** and ±30-second controls are registered now for the podcast queue.
For the current single-item live-radio source, seeking may not be available and
Next has no following item to select.

## Manual podcast test checklist

1. Open **Podcasts**, paste a public RSS feed URL, and press **Add podcast**.
2. Confirm the subscription appears with its title, author, and last sync date.
3. Open the subscription and scroll through the episode catalog. Confirm more
   local rows appear as the list approaches the end.
4. Pull down to refresh. An unchanged feed should keep the existing episodes
   and update its sync timestamp through HTTP cache validators when supported.
5. Try an invalid URL, an HTML page, a feed with broken enclosure URLs, and an
   unreachable host. Confirm the app shows an error instead of saving invalid
   domain data.

## Manual queue and position test checklist

1. Open a podcast and press **Add to queue** on several episodes. Confirm each
   episode appears once in the Queue tab.
2. Long-press **Hold to drag**, move an episode, leave the tab, and return.
   Confirm the new order remains.
3. Play an item in the middle of the queue. Confirm its metadata appears in the
   mini player and native media notification.
4. Let the episode finish. Confirm the following queue item starts
   automatically, and test Next/Previous from the notification or lock screen.
5. Listen beyond the first 10-second checkpoint, pause, play another episode,
   then return to the first one. Confirm it resumes roughly five seconds before
   the saved position.
6. Background or swipe away the application while an episode is playing, wait
   for another checkpoint, then reopen it and confirm the position was retained.
7. Remove an inactive queue item and confirm the remaining order is compact.
   Remove the active item and confirm Track Player advances or stops when no
   items remain.

## Manual download and offline test checklist

1. Open a podcast and press **Download** on two or more episodes. Open
   **Downloads** and confirm at most two items actively progress.
2. Pause an active download, note its byte count, resume it, and confirm it
   continues rather than restarting when the host supports byte ranges.
3. Disable connectivity during a transfer. Confirm the item shows a retryable
   error, restore connectivity, and press **Resume**.
4. Complete a download, enable airplane mode, add the episode to the queue, and
   play it. Confirm playback and position restoration use the local file.
5. Restart the app during a partial download. Confirm the row returns to the
   queue and resumes from the saved partial file.
6. Lower the storage limit below the completed cache size. Confirm older files
   are removed while the currently playing download is retained.
7. Remove a completed item from Downloads and confirm it disappears and no
   longer contributes to used storage.
8. Fill device storage or test on a nearly full emulator. Confirm the item
   fails with a storage-specific message and can be removed or retried.

## Development rules

- All user-facing application text is written in English.
- NativeWind classes are kept in dedicated `*.styles.ts` files.
- TypeScript strict mode remains enabled.
- Do not run builds, Gradle tasks, CocoaPods, Metro, lint, tests, type-checking,
  or formatters unless the project owner explicitly requests it.

## Running later

When execution is explicitly requested, start Metro with `npm start` and run
Android with `npm run android`. Native dependency changes require a fresh native
build; Fast Refresh alone cannot load a newly added native module.
