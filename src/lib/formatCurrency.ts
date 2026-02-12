export function formatCurrency(
  amount: number,
  options?: { signedParenthesis?: boolean }
): string {
  const n = Math.abs(amount) < 1e-10 ? 0 : amount;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));

  if (options?.signedParenthesis && n < 0) {
    return `(${formatted})`;
  }
  return formatted;
}
