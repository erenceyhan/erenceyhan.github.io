export type ItemInput = {
  id: string;
  name: string;
  amount: string;
};

export type InstallmentItem = {
  name: string;
  amount: number;
};

export type ItemMovement = {
  itemName: string;
  paid: number;
  remaining: number;
};

export type MonthPlan = {
  monthNo: number;
  installmentDate: Date;
  totalPayment: number;
  remainingAfterMonth: number;
  movements: ItemMovement[];
};

export type PaymentPlan = {
  items: InstallmentItem[];
  installmentCount: number;
  firstInstallmentDate: Date;
  totalAmount: number;
  monthlyFixedPayment: number;
  months: MonthPlan[];
};
