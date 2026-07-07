export const ASSUMED_HOURS_PER_DAY = 4;
export const DAYS_PER_MONTH = 30;
export const DEFAULT_RATE_PER_KWH = 8;

export type BillableEquipment = {
  ratedPowerWatt?: number | null;
  hoursPerDay?: number | null;
  isOn?: boolean | null;
  quantity?: number | null;
  efficiencyFactor?: number | null;
};

export type BillableTariff = {
  tariffType?: string | null;
  slabs?: Array<{
    uptoKwh?: number | null;
    pricePerUnit?: number | null;
  }> | null;
};

export const roundBillingValue = (value: number) => Number(value.toFixed(2));

export function calculateProjectedEquipmentKwh(
  equipment: BillableEquipment,
  days = DAYS_PER_MONTH
) {
  if (!equipment.isOn || days <= 0) {
    return 0;
  }

  const ratedPowerWatt = Number(equipment.ratedPowerWatt ?? 0);
  const quantity = Number(equipment.quantity ?? 1);
  const efficiencyFactor = Number(equipment.efficiencyFactor ?? 1);
  const hoursPerDay = Number(equipment.hoursPerDay ?? ASSUMED_HOURS_PER_DAY);

  return (
    ratedPowerWatt *
    Math.max(quantity, 1) *
    Math.max(efficiencyFactor, 0) *
    Math.max(hoursPerDay, 0) *
    days
  ) / 1000;
}

export function calculateTariffAmount(
  totalKwh: number,
  tariff?: BillableTariff | null
) {
  const safeKwh = Math.max(Number(totalKwh) || 0, 0);
  const slabs = Array.isArray(tariff?.slabs)
    ? tariff.slabs.filter(
        (slab) => Number.isFinite(Number(slab.pricePerUnit)) && Number(slab.pricePerUnit) > 0
      )
    : [];

  if (String(tariff?.tariffType ?? "FLAT").toUpperCase() !== "SLAB") {
    const rate = Number(slabs[0]?.pricePerUnit ?? DEFAULT_RATE_PER_KWH);
    return roundBillingValue(safeKwh * rate);
  }

  if (slabs.length === 0) {
    return roundBillingValue(safeKwh * DEFAULT_RATE_PER_KWH);
  }

  let remaining = safeKwh;
  let previousLimit = 0;
  let totalAmount = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;

    const configuredLimit = slab.uptoKwh == null ? null : Number(slab.uptoKwh);
    const availableInSlab =
      configuredLimit == null
        ? remaining
        : Math.max(configuredLimit - previousLimit, 0);
    const consumedKwh = Math.min(remaining, availableInSlab);

    totalAmount += consumedKwh * Number(slab.pricePerUnit);
    remaining -= consumedKwh;

    if (configuredLimit != null) {
      previousLimit = configuredLimit;
    }
  }

  if (remaining > 0) {
    totalAmount += remaining * Number(slabs[slabs.length - 1].pricePerUnit);
  }

  return roundBillingValue(totalAmount);
}
