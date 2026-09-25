import { Charge } from './charge';
import { Payment } from './payment';
import { Money } from './money';

export function totalCharges(charges: Charge[]): Money {
  return charges.reduce((acc, c) => acc + (!c.isVoided ? c.totalAmount : 0), 0);
}

export function totalPayments(payments: Payment[]): Money {
  return payments.reduce((acc, p) => acc + (!p.isReversed ? p.amount : 0), 0);
}

export function computeBalance(charges: Charge[], payments: Payment[]): Money {
  return totalCharges(charges) - totalPayments(payments);
}
