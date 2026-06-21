import { render, screen } from '@testing-library/react';
import TimesheetGrid, { type TimesheetGridEntry } from '@/components/TimesheetGrid';

const sampleEntries: TimesheetGridEntry[] = [
  {
    id: '1',
    date: '2026-06-20',
    clientName: 'ABC Corp',
    projectLabel: 'Audit 2026',
    hours: 4,
    description: 'Review work',
    status: 'Pending',
  },
  {
    id: '2',
    date: '2026-06-21',
    clientName: 'ABC Corp',
    projectLabel: 'Tax Review',
    hours: 6,
    description: 'Filing prep',
    status: 'Approved',
  },
];

describe('TimesheetGrid Layout Adaptability', () => {
  it('좁은 화면(모바일)에서 컴팩트 카드 뷰 렌더링', () => {
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<TimesheetGrid viewMode="auto" entries={sampleEntries} />);
    expect(screen.getByTestId('mobile-timesheet-card-stack')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-matrix-grid-view')).not.toBeInTheDocument();
  });

  it('데스크톱 뷰포트에서 매트릭스 그리드 뷰 렌더링', () => {
    global.innerWidth = 1440;
    global.dispatchEvent(new Event('resize'));

    render(<TimesheetGrid viewMode="auto" entries={sampleEntries} />);
    expect(screen.getByTestId('desktop-matrix-grid-view')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-timesheet-card-stack')).not.toBeInTheDocument();
  });

  it('renders entry data in mobile card view', () => {
    render(<TimesheetGrid viewMode="mobile" entries={sampleEntries} />);
    expect(screen.getByText('Review work')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
  });

  it('renders entry data in desktop matrix view', () => {
    render(<TimesheetGrid viewMode="desktop" entries={sampleEntries} />);
    expect(screen.getByText('Filing prep')).toBeInTheDocument();
    expect(screen.getByText('ABC Corp — Tax Review')).toBeInTheDocument();
  });
});
