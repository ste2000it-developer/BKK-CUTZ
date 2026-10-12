import { describe, expect, it } from "vitest";
import { createAdvanceId, saveBarberAdvance } from "./advances";

describe("advances repository", () => {
  it("validates input fields correctly", async () => {
    await expect(saveBarberAdvance({
      barberId: "b1",
      barberName: "ช่างเอก",
      amount: -50,
      reason: "เบิกล่วงหน้า",
    })).rejects.toThrow("ต้องมากกว่า 0 บาท");

    await expect(saveBarberAdvance({
      barberId: "",
      barberName: "",
      amount: 500,
      reason: "เบิกล่วงหน้า",
    })).rejects.toThrow("กรุณาเลือกช่าง");
  });

  it("generates unique advance IDs starting with adv_", () => {
    const id = createAdvanceId();
    expect(id).toMatch(/^adv_/);
  });
});
