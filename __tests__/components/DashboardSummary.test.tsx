import { render, screen } from '@testing-library/react';
import DashboardSummary from '@/components/app/DashboardSummary';

describe('DashboardSummary', () => {
  it('renders pending count badge from props', () => {
    render(
      <DashboardSummary
        totalHours={120}
        totalLaborCost={6000}
        totalCoreExpense={2500}
        totalOverhead={800}
        pendingTimeLogCount={3}
        pendingExpenseCount={2}
      />,
    );

    expect(screen.getByTestId('pending-timelog-badge')).toHaveTextContent('3');
    expect(screen.getByTestId('pending-expense-badge')).toHaveTextContent('2');
    expect(screen.getByText('120h')).toBeInTheDocument();
    expect(screen.getByText('6,000원')).toBeInTheDocument();
  });

  it('shows zero pending badges when counts are zero', () => {
    render(
      <DashboardSummary
        totalHours={0}
        totalLaborCost={0}
        totalCoreExpense={0}
        totalOverhead={0}
        pendingTimeLogCount={0}
        pendingExpenseCount={0}
      />,
    );

    expect(screen.getByTestId('pending-timelog-badge')).toHaveTextContent('0');
    expect(screen.getByTestId('pending-expense-badge')).toHaveTextContent('0');
  });
});
