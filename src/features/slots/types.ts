export type SlotStatus = "available" | "booked";

export type Slot = {
  id: string;
  startsAt: Date;
  dateKey: string;
  time: string;
  status: SlotStatus;
};

export type SlotInput = {
  date: string;
  time: string;
  status: SlotStatus;
};
