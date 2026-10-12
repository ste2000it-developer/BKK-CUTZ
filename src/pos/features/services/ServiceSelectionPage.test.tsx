import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ServiceSelectionPage } from "./ServiceSelectionPage";
const service = { id: "cut", groupId: "g", name: "Cut", type: "fixed", price: 300 };
const props = { services: [service], barber: { id: "b", name: "Barber" }, onBack: () => {}, onCheckout: () => {} };
it("normal POS selection still starts empty and cannot checkout", () => {
  const html = renderToStaticMarkup(<ServiceSelectionPage {...props} />);
  expect(html).toContain("ยังไม่ได้เลือกบริการ");
  expect(html).toMatch(/disabled=""[^>]*>ยืนยันรายการ/);
});
