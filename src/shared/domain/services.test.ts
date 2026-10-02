import { describe, expect, it } from "vitest";
import { sortServicesByOrder } from "./services";

describe("sortServicesByOrder", () => {
  it("sorts by sortOrder while placing missing values last", () => {
    const services = [
      { id: "missing" },
      { id: "later", sortOrder: 3 },
      { id: "first", sortOrder: 1 },
    ];

    expect(sortServicesByOrder(services).map((service) => service.id)).toEqual([
      "first",
      "later",
      "missing",
    ]);
    expect(services[0].id).toBe("missing");
  });
});