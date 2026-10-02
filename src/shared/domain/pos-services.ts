import type { ServiceRecord } from "../firebase/repositories/services";

export type SelectedService = {
  id: string;
  serviceCode: string | null;
  name: string;
  type: string;
  price: number;
  basePrice: number;
  detail?: string;
  discountAmount?: number;
  targetServiceCode?: string | null;
  discountPercent?: number;
};

export function getPosServiceDisplayName(service: ServiceRecord): string {
  if (service.type === "free_cut") return "ตัดผมฟรี 1 ครั้ง";
  if (service.type === "half_cut") {
    return `ส่วนลดค่าตัดผม ${Number(service.discountPercent || 0)}%`;
  }
  return service.name || "-";
}

export function makeSelectedService(
  service: ServiceRecord,
  price: number,
  extra: Partial<SelectedService> = {},
): SelectedService {
  return {
    id: service.id,
    serviceCode: service.serviceCode || null,
    name: getPosServiceDisplayName(service),
    type: service.type || "fixed",
    price: Number(price || 0),
    basePrice: Number(service.price || 0),
    ...extra,
  };
}

export function calculatePosServiceTotal(
  selected: readonly SelectedService[],
): number {
  return Math.max(
    0,
    selected.reduce((sum, service) => sum + Number(service.price || 0), 0),
  );
}

export function getHaircutDiscountAmount(
  discountService: ServiceRecord,
  target: SelectedService,
): number {
  if (discountService.type === "free_cut") return target.price;
  if (discountService.type === "half_cut") {
    return Math.round(
      target.price * Number(discountService.discountPercent || 0) / 100,
    );
  }
  return 0;
}