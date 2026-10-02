export type ServiceOrder = {
  sortOrder?: unknown;
};

export function sortServicesByOrder<T extends ServiceOrder>(
  services: readonly T[],
): T[] {
  return [...services].sort(
    (first, second) =>
      Number(first.sortOrder || 999) - Number(second.sortOrder || 999),
  );
}