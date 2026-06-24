import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatCurrencyTotals,
  formatMoney,
  type CurrencyTotals,
} from '@/lib/currency';

interface DashboardSummaryProps {
  totalHours: number;
  totalLaborCost: number;
  totalCoreExpense: CurrencyTotals;
  totalOverhead: CurrencyTotals;
  pendingTimeLogCount: number;
  pendingExpenseCount: number;
}

export default function DashboardSummary({
  totalHours,
  totalLaborCost,
  totalCoreExpense,
  totalOverhead,
  pendingTimeLogCount,
  pendingExpenseCount,
}: DashboardSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            승인 시간
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{totalHours}h</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            인건비
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(totalLaborCost, 'KRW')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            직접경비
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold leading-snug">
            {formatCurrencyTotals(totalCoreExpense)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            간접비
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold leading-snug">
            {formatCurrencyTotals(totalOverhead)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            미승인 타임로그
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge data-testid="pending-timelog-badge" variant="secondary" className="text-lg">
            {pendingTimeLogCount}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            미승인 경비
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge data-testid="pending-expense-badge" variant="secondary" className="text-lg">
            {pendingExpenseCount}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
