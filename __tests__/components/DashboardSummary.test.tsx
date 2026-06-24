import { render, screen } from '@testing-library/react';
import DashboardSummary from '@/components/app/DashboardSummary';

describe('DashboardSummary', () => {
  it('renders pending count badge from props', () => {
    render(
      <DashboardSummary
        totalHours={120}
        totalLaborCost={6000}
        totalCoreExpense={{ KRW: 2500, USD: 100 }}
        totalOverhead={{ KRW: 800, USD: 0 }}
        pendingTimeLogCount={3}
        pendingExpenseCount={2}
      />,
    );

    expect(screen.getByTestId('pending-timelog-badge')).toHaveTextContent('3');
    expect(screen.getByTestId('pending-expense-badge')).toHaveTextContent('2');
    expect(screen.getByText('120h')).toBeInTheDocument();
    expect(screen.getByText('₩6,000')).toBeInTheDocument();
    expect(screen.getByText('₩2,500 / $100.00')).toBeInTheDocument();
    expect(screen.getByText('₩800 / $0.00')).toBeInTheDocument();
  });

  it('shows zero pending badges when counts are zero', () => {
    render(
      <DashboardSummary
        totalHours={0}
        totalLaborCost={0}
        totalCoreExpense={{ KRW: 0, USD: 0 }}
        totalOverhead={{ KRW: 0, USD: 0 }}
        pendingTimeLogCount={0}
        pendingExpenseCount={0}
      />,
    );

    expect(screen.getByTestId('pending-timelog-badge')).toHaveTextContent('0');
    expect(screen.getByTestId('pending-expense-badge')).toHaveTextContent('0');
  });
});
