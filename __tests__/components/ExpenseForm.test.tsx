import { render, screen, fireEvent } from '@testing-library/react';
import {
  ExpenseForm,
  validateExpenseForm,
  type ExpenseFormValues,
} from '@/components/app/ExpenseForm';

const clients = [{ value: 'client-1', label: 'ABC Corp', clientCode: 'ABC01' }];

const projects = [
  { value: 'proj-1', label: 'Audit 2026', clientId: 'client-1', clientName: 'ABC Corp' },
];

const baseCoreValues: ExpenseFormValues = {
  expenseType: 'Core',
  clientId: 'client-1',
  projectId: 'proj-1',
  amount: 50000,
  currency: 'KRW',
  date: '2026-06-20',
  description: 'Travel',
};

const baseOverheadValues: ExpenseFormValues = {
  expenseType: 'Overhead',
  amount: 12000,
  currency: 'USD',
  date: '2026-06-20',
  description: 'Office supplies',
};

describe('validateExpenseForm', () => {
  it('requires client and project for Core expense', () => {
    expect(
      validateExpenseForm({ ...baseCoreValues, clientId: '', projectId: '' }),
    ).toBe('프로젝트 경비는 고객과 프로젝트를 선택해 주세요');
  });

  it('accepts valid Core expense', () => {
    expect(validateExpenseForm(baseCoreValues)).toBeNull();
  });

  it('accepts valid Overhead expense without client or project', () => {
    expect(validateExpenseForm(baseOverheadValues)).toBeNull();
  });

  it('rejects negative amount', () => {
    expect(validateExpenseForm({ ...baseOverheadValues, amount: -1 })).toBe(
      '금액은 0 이상이어야 합니다',
    );
  });
});

describe('ExpenseForm', () => {
  it('shows client and project fields for Core expense', () => {
    render(
      <ExpenseForm clients={clients} projects={projects} onSubmit={jest.fn()} />,
    );
    expect(screen.getByLabelText('고객')).toBeInTheDocument();
    expect(screen.getByLabelText('프로젝트')).toBeInTheDocument();
  });

  it('hides client and project fields for Overhead expense', () => {
    render(
      <ExpenseForm clients={clients} projects={projects} onSubmit={jest.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('경비 유형'), {
      target: { value: 'Overhead' },
    });
    expect(screen.queryByLabelText('고객')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('프로젝트')).not.toBeInTheDocument();
  });

  it('shows validation error when Core submit missing project', async () => {
    const onSubmit = jest.fn();
    render(
      <ExpenseForm clients={clients} projects={projects} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText('지출일'), {
      target: { value: '2026-06-20' },
    });
    fireEvent.change(screen.getByLabelText('금액'), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText('설명'), {
      target: { value: 'Travel' },
    });

    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    expect(
      await screen.findByText('프로젝트 경비는 고객과 프로젝트를 선택해 주세요'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
