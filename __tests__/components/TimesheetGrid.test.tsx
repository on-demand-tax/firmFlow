import { render, screen, fireEvent } from '@testing-library/react';
import TimesheetGrid, { type TimesheetGridEntry } from '@/components/TimesheetGrid';
import { MOBILE_BREAKPOINT } from '@/lib/use-media-query';

function mockViewportWidth(width: number) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches:
      query === `(max-width: ${MOBILE_BREAKPOINT - 1}px)` ? width < MOBILE_BREAKPOINT : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

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
  {
    id: '3',
    date: '2026-06-22',
    clientName: 'ABC Corp',
    projectLabel: 'Bookkeeping',
    hours: 2,
    description: 'Voucher entry',
    status: 'Rejected',
    rejectionReason: '시간 과다',
    lockedAt: '2026-06-01T00:00:00.000Z',
  },
];

describe('TimesheetGrid Layout Adaptability', () => {
  it('좁은 화면(모바일)에서 컴팩트 카드 뷰 렌더링', () => {
    mockViewportWidth(375);

    render(<TimesheetGrid viewMode="auto" entries={sampleEntries} />);
    expect(screen.getByTestId('mobile-timesheet-card-stack')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-entry-list')).not.toBeInTheDocument();
  });

  it('데스크톱 뷰포트에서 목록 뷰 렌더링', () => {
    mockViewportWidth(1440);

    render(<TimesheetGrid viewMode="auto" entries={sampleEntries} />);
    expect(screen.getByTestId('desktop-entry-list')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-timesheet-card-stack')).not.toBeInTheDocument();
  });

  it('renders entry data in mobile card view', () => {
    render(<TimesheetGrid viewMode="mobile" entries={sampleEntries} />);
    expect(screen.getByText('Review work')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
  });

  it('renders entry data in desktop list view', () => {
    render(<TimesheetGrid viewMode="desktop" entries={sampleEntries} />);
    expect(screen.getByText('Filing prep')).toBeInTheDocument();
    expect(screen.getByText(/ABC Corp — Tax Review/)).toBeInTheDocument();
  });

  it('shows rejection reason in modal when rejected badge is clicked', () => {
    render(<TimesheetGrid viewMode="desktop" entries={sampleEntries} />);
    fireEvent.click(screen.getByTitle('반려 사유 보기'));
    expect(screen.getByText('반려 사유')).toBeInTheDocument();
    expect(screen.getByText('시간 과다')).toBeInTheDocument();
  });

  it('renders locked entries with reduced opacity instead of 마감 label', () => {
    render(<TimesheetGrid viewMode="desktop" entries={sampleEntries} />);
    const lockedRow = screen.getByTitle('마감된 항목');
    expect(lockedRow).toHaveClass('opacity-50');
    expect(screen.queryByText(/\(마감\)/)).not.toBeInTheDocument();
  });
});
