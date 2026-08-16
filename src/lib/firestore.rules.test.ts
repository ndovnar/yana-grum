import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { Timestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let testEnvironment: RulesTestEnvironment;

const validSlot = {
  startsAt: Timestamp.fromDate(new Date("2026-08-21T13:00:00Z")),
  dateKey: "2026-08-21",
  time: "15:00",
  status: "available",
  createdAt: Timestamp.fromDate(new Date("2026-08-01T10:00:00Z")),
  updatedAt: Timestamp.fromDate(new Date("2026-08-01T10:00:00Z")),
  updatedBy: "admin-1",
};

beforeAll(async () => {
  const rules = await readFile(
    new URL("../../firestore.rules", import.meta.url),
    "utf8",
  );
  testEnvironment = await initializeTestEnvironment({
    projectId: "yana-grum-rules-test",
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "slots/2026-08-21_1500"), validSlot);
  });
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("Firestore slot rules", () => {
  it("allows public visitors to read published slots", async () => {
    const snapshot = await assertSucceeds(
      getDoc(
        doc(
          testEnvironment.unauthenticatedContext().firestore(),
          "slots/2026-08-21_1500",
        ),
      ),
    );

    expect(snapshot.data()?.status).toBe("available");
  });

  it("rejects writes from unauthenticated visitors", async () => {
    await assertFails(
      setDoc(
        doc(
          testEnvironment.unauthenticatedContext().firestore(),
          "slots/2026-08-22_1500",
        ),
        validSlot,
      ),
    );
  });

  it("allows an authenticated invited user to create a valid slot", async () => {
    await assertSucceeds(
      setDoc(
        doc(
          testEnvironment.authenticatedContext("staff-1").firestore(),
          "slots/2026-08-22_1500",
        ),
        { ...validSlot, dateKey: "2026-08-22", updatedBy: "staff-1" },
      ),
    );
  });
});
