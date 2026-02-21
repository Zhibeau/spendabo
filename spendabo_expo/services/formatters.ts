export function formatCurrency(cents: number, currency = "CAD"): string {
  const amount = Math.abs(cents) / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function formatMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}

export function isExpense(amount: number): boolean {
  return amount < 0;
}
