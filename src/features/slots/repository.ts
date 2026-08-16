import {
  Timestamp,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { firebaseApp } from "../../lib/firebase-app";
import { monthDateKeyRange, slotIdFor, warsawDateTime } from "../../lib/date";
import type { CalendarMonth } from "../../lib/date";
import type { Slot, SlotInput, SlotStatus } from "./types";

const slotsCollection = () => {
  const db = firebaseApp ? getFirestore(firebaseApp) : null;
  if (!db) throw new Error("Firebase is not configured.");
  return collection(db, "slots");
};

const getDb = () => {
  if (!firebaseApp) throw new Error("Firebase is not configured.");
  return getFirestore(firebaseApp);
};

const toSlot = (
  id: string,
  value: {
    startsAt: Timestamp;
    dateKey: string;
    time: string;
    status: SlotStatus;
  },
): Slot => ({
  id,
  startsAt: value.startsAt.toDate(),
  dateKey: value.dateKey,
  time: value.time,
  status: value.status,
});

export function subscribeToMonthSlots(
  month: CalendarMonth,
  onChange: (slots: Slot[]) => void,
  onError: (error: Error) => void,
) {
  const { start, end } = monthDateKeyRange(month);
  return onSnapshot(
    query(
      slotsCollection(),
      where("dateKey", ">=", start),
      where("dateKey", "<", end),
      orderBy("dateKey"),
    ),
    (snapshot) => {
      const slots = snapshot.docs
        .map((item) =>
          toSlot(
            item.id,
            item.data() as {
              startsAt: Timestamp;
              dateKey: string;
              time: string;
              status: SlotStatus;
            },
          ),
        )
        .sort(
          (first, second) =>
            first.dateKey.localeCompare(second.dateKey) ||
            first.time.localeCompare(second.time),
        );
      onChange(slots);
    },
    (error) => onError(error),
  );
}

export async function createSlot(input: SlotInput, userId: string) {
  const db = getDb();
  const reference = doc(slotsCollection(), slotIdFor(input.date, input.time));
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(reference)).exists())
      throw new Error("Slot already exists.");
    transaction.set(reference, {
      startsAt: Timestamp.fromDate(warsawDateTime(input.date, input.time)),
      dateKey: input.date,
      time: input.time,
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
    transaction.set(doc(collection(db, "calendarLogs")), {
      action: "create",
      slotId: reference.id,
      actorId: userId,
      createdAt: serverTimestamp(),
    });
  });
}

export async function setSlotStatus(
  slotId: string,
  status: SlotStatus,
  userId: string,
) {
  const db = getDb();
  const batch = writeBatch(db);
  batch.update(doc(db, "slots", slotId), {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
  batch.set(doc(collection(db, "calendarLogs")), {
    action: "update-status",
    slotId,
    actorId: userId,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function deleteSlots(slotIds: string[], userId: string) {
  const db = getDb();
  const batch = writeBatch(db);
  slotIds.forEach((slotId) => batch.delete(doc(db, "slots", slotId)));
  batch.set(doc(collection(db, "calendarLogs")), {
    action: "delete-day",
    slotIds,
    actorId: userId,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function copySlots(
  source: Slot[],
  targetDate: string,
  userId: string,
) {
  if (source.length > 249) throw new Error("Too many slots to copy at once.");
  const db = getDb();
  await runTransaction(db, async (transaction) => {
    const targets = source.map((slot) => ({
      slot,
      reference: doc(slotsCollection(), slotIdFor(targetDate, slot.time)),
    }));
    const existing = await Promise.all(
      targets.map(({ reference }) => transaction.get(reference)),
    );
    if (existing.some((snapshot) => snapshot.exists()))
      throw new Error("A copied time already exists on the target date.");
    targets.forEach(({ slot, reference }) =>
      transaction.set(reference, {
        startsAt: Timestamp.fromDate(warsawDateTime(targetDate, slot.time)),
        dateKey: targetDate,
        time: slot.time,
        status: slot.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      }),
    );
    transaction.set(doc(collection(db, "calendarLogs")), {
      action: "copy-day",
      slotIds: targets.map(({ reference }) => reference.id),
      actorId: userId,
      createdAt: serverTimestamp(),
    });
  });
}
