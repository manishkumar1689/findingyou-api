/*
Only servces to validate payment options
*/

export interface PaymentOption {
  readonly key: string;
  readonly name: string;
  readonly amount: number;
  readonly period: string;
  readonly duration: number;
  readonly maxRepeats: number;
}
