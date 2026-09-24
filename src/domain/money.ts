export type Money = number; // Always in paise (1 INR = 100 paise)

export function addMoney(a: Money, b: Money): Money {
  return Math.round(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return Math.round(a - b);
}

export function multiplyMoney(a: Money, multiplier: number): Money {
  return Math.round(a * multiplier);
}

export function percentage(amount: Money, percent: number): Money {
  return Math.round(amount * (percent / 100));
}

export function roundMoney(amount: number): Money {
  return Math.round(amount);
}

export function formatINR(amount: Money): string {
  const rupees = amount / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function parseINR(formatted: string): Money {
  const numericString = formatted.replace(/[^0-9.-]+/g, '');
  const rupees = parseFloat(numericString);
  if (isNaN(rupees)) {
    return 0;
  }
  return Math.round(rupees * 100);
}

export function assertNonNegative(amount: Money): void {
  if (amount < 0) {
    throw new Error(`Amount must be non-negative. Got ${amount}`);
  }
}

export function assertPositive(amount: Money): void {
  if (amount <= 0) {
    throw new Error(`Amount must be strictly positive. Got ${amount}`);
  }
}
