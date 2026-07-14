export type BillBreakdownItem = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  kwh: number;
  amount: number;
};

export type BillSummary = {
  id: string;
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  totalKwh: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type BillDetailRecord = BillSummary & {
  lineItems: BillBreakdownItem[];
};

