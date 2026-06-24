import { render, screen, fireEvent } from '@testing-library/react';
import {
  TimesheetForm,
  validateTimesheetForm,
  type TimesheetFormValues,
} from '@/components/app/TimesheetForm';
import { TIMELOG_HOURS_RANGE_MESSAGE } from '@/lib/timelog-hours';

const projects = [
  { value: 'proj-1', label: 'Audit 2026', clientId: 'client-1', clientName: 'ABC Corp' },
];

const baseValues: TimesheetFormValues = {
  date: '2026-06-20',
  clientId: 'client-1',
  projectId: 'proj-1',
  hours: 4,
  description: 'Review work',
};

describe('validateTimesheetForm', () => {
  it('rejects hours greater than 24', () => {
    expect(validateTimesheetForm({ ...baseValues, hours: 25 })).toBe(
      TIMELOG_HOURS_RANGE_MESSAGE,
    );
  });

  it('accepts valid hours', () => {
    expect(validateTimesheetForm(baseValues)).toBeNull();
  });
});

describe('TimesheetForm', () => {
  it('shows validation error when hours exceed 24 on submit', async () => {
    const onSubmit = jest.fn();
    render(<TimesheetForm projects={projects} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('작업일'), {
      target: { value: '2026-06-20' },
    });
    fireEvent.change(screen.getByLabelText('프로젝트'), {
      target: { value: 'proj-1' },
    });
    fireEvent.change(screen.getByLabelText('시간'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('작업 내용'), {
      target: { value: 'Too many hours' },
    });

    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    expect(await screen.findByText(TIMELOG_HOURS_RANGE_MESSAGE)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
