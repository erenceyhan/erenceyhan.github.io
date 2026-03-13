import type { InstallmentItem, ItemMovement, PaymentPlan } from "./types";
import { roundCurrency } from "./utils";

export function createPaymentPlan(
  items: InstallmentItem[],
  installmentCount: number,
  firstInstallmentDate: Date
): PaymentPlan {
  const totalAmount = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0));
  const monthlyFixedPayment = roundCurrency(totalAmount / installmentCount);
  const remainingByItem = new Map(items.map((item) => [item.name, item.amount]));
  const months = [];

  for (let month = 1; month <= installmentCount; month += 1) {
    const totalRemaining = roundCurrency(
      Array.from(remainingByItem.values()).reduce((sum, value) => sum + value, 0)
    );

    if (totalRemaining <= 0) {
      break;
    }

    const payableThisMonth =
      month === installmentCount
        ? totalRemaining
        : roundCurrency(Math.min(monthlyFixedPayment, totalRemaining));

    let paymentLeft = payableThisMonth;
    const movements: ItemMovement[] = [];

    for (const item of items) {
      if (paymentLeft <= 0) {
        break;
      }

      const itemRemaining = remainingByItem.get(item.name) ?? 0;
      if (itemRemaining <= 0) {
        continue;
      }

      const paid = roundCurrency(Math.min(paymentLeft, itemRemaining));
      const nextRemaining = roundCurrency(itemRemaining - paid);

      remainingByItem.set(item.name, nextRemaining);
      paymentLeft = roundCurrency(paymentLeft - paid);
      movements.push({
        itemName: item.name,
        paid,
        remaining: nextRemaining
      });
    }

    months.push({
      monthNo: month,
      installmentDate: addMonths(firstInstallmentDate, month - 1),
      totalPayment: payableThisMonth,
      remainingAfterMonth: roundCurrency(
        Array.from(remainingByItem.values()).reduce((sum, value) => sum + value, 0)
      ),
      movements
    });
  }

  return {
    items,
    installmentCount,
    firstInstallmentDate,
    totalAmount,
    monthlyFixedPayment,
    months
  };
}

function addMonths(date: Date, count: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
}
