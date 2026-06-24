export type ExpensePaymentMethod =
  | 'BizCreditCardRegistered'
  | 'BizDebitCardRegistered'
  | 'ETaxInvoiceEmail'
  | 'CashReceiptExpense'
  | 'PersonalCardUnregistered'
  | 'BankTransfer'
  | 'CashSimpleReceipt'
  | 'CeremonialExpense';

export type ExpensePaymentMethodCategory = 'Eligible' | 'NonVoucher' | 'Other';

export interface ExpensePaymentMethodOption {
  id: ExpensePaymentMethod;
  label: string;
  hint?: string;
}

export interface ExpensePaymentMethodGroup {
  id: ExpensePaymentMethodCategory;
  label: string;
  methods: ExpensePaymentMethodOption[];
}

export const EXPENSE_PAYMENT_METHOD_GROUPS: ExpensePaymentMethodGroup[] = [
  {
    id: 'Eligible',
    label: '적격',
    methods: [
      {
        id: 'BizCreditCardRegistered',
        label: '사업용 신용카드',
        hint: '홈택스 등록 카드',
      },
      {
        id: 'BizDebitCardRegistered',
        label: '사업용 체크카드',
        hint: '홈택스 등록 카드',
      },
      {
        id: 'ETaxInvoiceEmail',
        label: '전자세금계산서 / 계산서',
        hint: '이메일 발행분',
      },
      {
        id: 'CashReceiptExpense',
        label: '현금영수증',
        hint: '지출증빙용',
      },
    ],
  },
  {
    id: 'NonVoucher',
    label: '비증빙',
    methods: [
      {
        id: 'PersonalCardUnregistered',
        label: '개인 신용/체크카드',
        hint: '홈택스 미등록',
      },
      {
        id: 'BankTransfer',
        label: '계좌이체',
        hint: '이체확인증 첨부 필요',
      },
      {
        id: 'CashSimpleReceipt',
        label: '현금 (간이영수증)',
        hint: '3만 원 이하/초과 구분용',
      },
    ],
  },
  {
    id: 'Other',
    label: '기타',
    methods: [
      {
        id: 'CeremonialExpense',
        label: '경조사비',
        hint: '청첩장/부고장 첨부, 건당 20만 원 한도',
      },
    ],
  },
];

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] =
  EXPENSE_PAYMENT_METHOD_GROUPS.flatMap((group) => group.methods.map((m) => m.id));

const PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = Object.fromEntries(
  EXPENSE_PAYMENT_METHOD_GROUPS.flatMap((group) =>
    group.methods.map((method) => [
      method.id,
      `[${group.label}] ${method.label}${method.hint ? ` (${method.hint})` : ''}`,
    ]),
  ),
) as Record<ExpensePaymentMethod, string>;

export function getExpensePaymentMethodLabel(id: ExpensePaymentMethod): string {
  return PAYMENT_METHOD_LABELS[id];
}

export function getExpensePaymentMethodCategory(
  id: ExpensePaymentMethod,
): ExpensePaymentMethodCategory {
  for (const group of EXPENSE_PAYMENT_METHOD_GROUPS) {
    if (group.methods.some((method) => method.id === id)) {
      return group.id;
    }
  }
  return 'Other';
}

export function isNonVoucherPaymentMethod(id: ExpensePaymentMethod): boolean {
  return getExpensePaymentMethodCategory(id) === 'NonVoucher';
}

export function parseExpensePaymentMethod(value: unknown): ExpensePaymentMethod | null {
  if (typeof value !== 'string') return null;
  return EXPENSE_PAYMENT_METHODS.includes(value as ExpensePaymentMethod)
    ? (value as ExpensePaymentMethod)
    : null;
}

export function formatPaymentMethodOptionLabel(method: ExpensePaymentMethodOption): string {
  return method.hint ? `${method.label} (${method.hint})` : method.label;
}
