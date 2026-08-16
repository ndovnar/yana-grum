# Yana Grum

Polish, mobile-first grooming salon website built with React, TypeScript, Tailwind CSS and Firebase.

## Product specification

- Public users see a black-and-gold monthly calendar with available, booked, neutral and past dates.
- Selecting an available day reveals its times. Selecting a time never creates a booking; it only exposes contact actions and a prefilled WhatsApp message.
- The public view shows the current month plus the next three months, using the `Europe/Warsaw` time zone.
- `/admin` is the protected entry point for administrators. Firebase Email/Password Authentication is used for sign-in. New administrators should be invited by the owner; no public sign-up is exposed.
- Only authenticated accounts manually created by the owner may manage calendar data. Public visitors have read-only access to appointment slots.
- Contact information, address, social links and the page copy are temporary placeholders and must be replaced before publication.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create a Firebase project, enable **Email/Password** authentication and create a Firestore database.
3. Add the Firebase web app credentials to `.env.local`.
4. Create administrator accounts through Firebase Authentication. Do not enable public sign-up.
5. Deploy Firestore rules and indexes: `firebase deploy --only firestore`.
6. Start the app: `npm run dev`.

## Firebase data model

Store each appointment slot in the `slots` collection:

```ts
{
  startsAt: Timestamp, // Europe/Warsaw appointment time
  dateKey: string, // YYYY-MM-DD in Europe/Warsaw, used for calendar queries
  time: string, // HH:mm in Europe/Warsaw, used for ordering and duplicate prevention
  status: 'available' | 'booked',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedBy: string // Firebase user ID
}
```

The admin dashboard groups slots by date, can copy slots to another date, requires deletion confirmation, and writes an audit record to `calendarLogs` for each modification. Only authenticated accounts can change this data.

Existing slot documents created before `dateKey` and `time` were introduced must be migrated before deployment; otherwise they are intentionally excluded from the calendar query.

## Checks

```bash
npm run build
npm run test
npm run test:rules # requires a local Java Runtime for the Firestore Emulator
npm run lint
```
