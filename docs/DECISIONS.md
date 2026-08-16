# Project Decisions

This document records the decisions that shape the Yana Grum website. Update it when a decision changes, rather than relying on implicit knowledge in code or chat history.

## Public calendar is not online booking

Visitors can browse available dates and times, then contact the salon to confirm a visit. Selecting a slot never reserves it. This keeps scheduling under the owner's control and avoids payment, cancellation, and double-booking workflows.

## Slot states and calendar behavior

Each Firestore document represents one time slot. A slot is either `available` or `booked`; a day is available when it has at least one future available slot. Past dates are neutral and cannot be selected. The public page shows the current Warsaw month and the next three months.

## Time-zone-safe data model

Slots store `dateKey` (`YYYY-MM-DD`) and `time` (`HH:mm`) in addition to `startsAt`. The `dateKey` is queried by month, while the user-facing date and time are always calculated in `Europe/Warsaw`. This avoids browser-local time zones and daylight-saving changes moving a slot into the wrong day.

## Admin access model

There is no public sign-up interface. The owner creates staff accounts manually in Firebase Authentication. Any authenticated account can use `/admin` and update slots; Firestore rules still prevent unauthenticated writes and validate the slot fields. Do not enable additional sign-in providers or public registration unless this access model is redesigned.

## No audit-log collection

The project deliberately does not write `calendarLogs`. The salon needs a small, inexpensive calendar rather than a change-history system. Existing `calendarLogs` collections can be deleted in the Firebase Console. If an audit trail becomes necessary, add it as an explicit feature with retention and access rules.

## Deployment choice

Firebase Hosting is the preferred production host because `firebase.json` rewrites all paths to `index.html`; this makes `https://<project>.web.app/admin` work directly. GitHub Pages has no SPA rewrite, so its compatible admin URL is `https://<account>.github.io/<repository>/#/admin`.

## Configuration and demo mode

Firebase web configuration is supplied through `VITE_FIREBASE_*` environment variables during the Vite build. Keep local values in `.env.local` and add deployment values to the host or GitHub Actions configuration; never commit `.env` files.

`VITE_DEMO_MODE=true` is only for visual testing without Firestore. It displays sample availability and must be removed or set to `false` before a live launch, otherwise visitors could see fictitious slots.

## UI approach

The public calendar remains custom because its status-focused black-and-gold layout is core to the brand. The admin's form controls use shadcn/ui: a compact popover date picker and a time select. The large admin calendar remains custom to preserve its calendar-management behavior.
