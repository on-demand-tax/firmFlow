/** Mongoose Expense.create()용 최소 분류 필드 (스키마 required) */
export const expenseClassificationFixture = {
  paymentMethod: 'BizCreditCardRegistered',
  expensePurpose: 'TravelTransport',
} as const;

export const overheadClassificationFixture = {
  paymentMethod: 'ETaxInvoiceEmail',
  expensePurpose: 'OfficeSupplies',
} as const;
