import { render, screen, waitFor } from '@testing-library/react';

import { Sidebar } from '@/components/app/Sidebar';
import { getNavItemsForRole } from '@/lib/nav-items';

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/app',
}));

const originalFetch = global.fetch;

describe('Sidebar', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('shows approvals badge when pending count is greater than zero', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ timeLogs: 2, expenses: 1, total: 3 }),
    }) as jest.Mock;

    render(
      <Sidebar
        userName="Approver User"
        role="Approver"
        navItems={getNavItemsForRole('Approver')}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('nav-approvals-badge')).toHaveTextContent('3');
    });
  });

  it('hides approvals badge when pending count is zero', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ timeLogs: 0, expenses: 0, total: 0 }),
    }) as jest.Mock;

    render(
      <Sidebar
        userName="Approver User"
        role="Approver"
        navItems={getNavItemsForRole('Approver')}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/approvals/pending-count');
    });

    expect(screen.queryByTestId('nav-approvals-badge')).not.toBeInTheDocument();
  });

  it('does not fetch pending count for Preparer', async () => {
    global.fetch = jest.fn();

    render(
      <Sidebar
        userName="Preparer User"
        role="Preparer"
        navItems={getNavItemsForRole('Preparer')}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
