# Boat & RV Guardian — agent notes

## Time & timestamps (storage = UTC, display = device time zone)

**Policy:** every timestamp is **stored in UTC** and **displayed in the device's configured
time zone**. Do not deviate from this.

- **Storage** → persist epoch milliseconds (`Date.now()`) or ISO-8601 (`date.toISOString()`).
  Never persist a localized/formatted time string, and never store wall-clock time without a zone.
  Example: LinkTap per-device usage history buckets use `new Date().toISOString()`.
- **Display** → format through `dashboard/src/utils/time.ts`
  (`formatTime` / `formatDate` / `formatDateTime`). These render in the `lt_tz` setting (a
  device-local preference, NOT cloud-synced — see `LOCAL_ONLY_KEYS` in `utils/configSync.ts`),
  falling back to the OS-resolved zone, then UTC.
- **Never** call `toLocaleTimeString` / `toLocaleDateString` / `toLocaleString` directly in
  components — they use the raw browser zone and ignore the user's `lt_tz` choice.
- `lt_tz` can change at runtime; components showing times keep a `displayTz` state refreshed on
  the `settings_updated` event so already-rendered times reformat (see `LinkTapWidget.tsx`).

## Where historical / event data lives

**On-device (always):**

- `localStorage['lt_usage_history_<deviceId>']` — per-device water-usage history. Keys are UTC
  ISO-8601 hour buckets, values are flow-volume deltas (liters). Gated by `lt_enable_history`.
- `localStorage['lt_event_log_<deviceId>']` — the **Event Sentry Log** (`{ts,type,message}[]`,
  capped 50). The flow-rate line chart (`flowHistory`) is still in-memory only.

**Cloud (opt-in, Phase 1):** when `lt_store_history_cloud === 'true'`, `utils/historySync.ts`
mirrors usage + events into **monthly rollup docs** at `vehicles/{vid}/history/{deviceId}_{YYYY-MM}`
(`usage` and `events` are maps so `setDoc(merge)` is append-only). `LinkTapWidget` debounce-pushes
the current/previous month (~10s) and reads those two docs back on mount/login, merging into local
state (usage = max per bucket, events = dedup by `ts|message`). The worker stores no history — it
only reads vehicle config to relay LinkTap commands.

(History rule is included in the consolidated ruleset below.)

## Shelly devices (provisioning, polling, password)

- Each vehicle has an auto-generated 8-char `sh_local_password` (per-vehicle, cloud-synced; created
  in `VehicleManager.generateShellyPassword()` on vehicle creation). Editable/regenerable in the
  General tab. **Currently the password is NOT pushed to devices** (user chose unauthenticated local
  RPC) — it's reserved for the cloud/webhook side and future authenticated polling.
- **Local polling** (`ShellyWidget`, rendered from `Dashboard.tsx` over the `lt_devices` model):
  when `device.localIp` is known it polls `http://<ip>/rpc/Shelly.GetStatus` (no auth, ~8s) and
  falls back to Shelly cloud (`/device/status`, ~15s) otherwise. A LOCAL/CLOUD badge shows the
  source. `device.localIp` is captured during manual-IP provisioning; AP/BLE setups need discovery
  to learn it (follow-up). NOTE: the `Sensors.tsx` category pages still use the older cloud-only
  `sh_high_power`/`sh_low_power`/`sh_flood` arrays — not yet migrated to local polling.
- **Provisioning** (`ProvisionShellyModal`): auto-detects sensor type from `Shelly.GetDeviceInfo`,
  and **only creates the cloud webhook when signed in**. Removing a device confirms via dialog and
  can optionally send `Shelly.FactoryReset` to its local IP (best-effort).
- Transport rationale: HTTP RPC chosen over MQTT (needs a broker) and UDP RPC (WebViews can't open
  UDP sockets). Shelly Gen2 auth is done in the JSON-RPC body, so authenticated local polling is
  possible in pure JS later without native code.

## Friends / vehicle sharing (`utils/sharing.ts`, `hooks/usePendingInvites.ts`)

Per-vehicle sharing with three roles — `admin` (Full Admin), `control` (Monitor & Control),
`monitor` (view only). **No email service** (chosen option): invites are discovered by the
invitee's email and accepted manually; the inviter shares a copyable message.

- **Vehicle doc** gains `members: { <uid>: { role, email } }` (kept in sync with `allowedUsers`).
  `getMyRole(vehicleData)` resolves the current user's role; a legacy member with no `members`
  entry is treated as `admin` (original owner). `ensureOwnerAdmin()` backfills this.
- **Invites** live in `invites/{autoId}`: `{ vehicleId, vehicleName, role, invitedBy,
  invitedByEmail, inviteeEmail (lowercased), status }`. They are **not** auto-applied — the
  Friends tab shows pending invites (via `usePendingInvites`, matched on the user's email) to
  accept/decline. Accepting adds the user to the vehicle (`acceptInvite` sets a transient
  `lastClaimInviteId` so the rule can verify the invite). Admins remove members / cancel invites;
  members `leaveVehicle()`.
- **Role enforcement:** `SyncModal` stashes the active vehicle's role in `localStorage['lt_my_role']`
  and fires a `role_updated` event. `LinkTapWidget` reads it: monitor-only users see a banner and
  user-initiated valve commands no-op (automation/auto-restart still works via the un-gated raw
  command). Enforcement is currently client-side only — a monitor with the vehicle's cloud
  credentials could still call the device API directly; hardening that requires routing control
  through the worker.

## Consolidated Firestore rules (publish in the Firebase console)

Merge into the project rules (preserve any existing `users` rule):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isValidClaim(vid) {
      let inv = get(/databases/$(database)/documents/invites/$(request.resource.data.lastClaimInviteId)).data;
      return request.auth != null
        && !(request.auth.uid in resource.data.allowedUsers)
        && request.auth.uid in request.resource.data.allowedUsers
        && inv.vehicleId == vid
        && inv.status == 'pending'
        && inv.inviteeEmail == request.auth.token.email
        && request.resource.data.members[request.auth.uid].role == inv.role;
    }

    match /vehicles/{vid} {
      allow read:   if request.auth != null && request.auth.uid in resource.data.allowedUsers;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.allowedUsers;
      allow update: if (request.auth != null && request.auth.uid in resource.data.allowedUsers)
                    || isValidClaim(vid);
      allow delete: if false;

      match /history/{histId} {
        allow read:   if request.auth != null && request.auth.uid in resource.data.allowedUsers;
        allow create: if request.auth != null && request.auth.uid in request.resource.data.allowedUsers;
        allow update: if request.auth != null && request.auth.uid in resource.data.allowedUsers;
      }
    }

    match /invites/{inviteId} {
      allow read:   if request.auth != null && (resource.data.inviteeEmail == request.auth.token.email
                       || resource.data.invitedBy == request.auth.uid);
      allow create: if request.auth != null && request.resource.data.invitedBy == request.auth.uid
                       && request.auth.uid in get(/databases/$(database)/documents/vehicles/$(request.resource.data.vehicleId)).data.allowedUsers;
      allow update: if request.auth != null && (resource.data.inviteeEmail == request.auth.token.email
                       || resource.data.invitedBy == request.auth.uid);
      allow delete: if request.auth != null && resource.data.invitedBy == request.auth.uid;
    }

    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
Note: rules compare `inviteeEmail == request.auth.token.email`; emails are stored lowercased and
Google/most providers issue lowercase token emails. If a provider returns mixed-case email, claims
would fail until normalized.
