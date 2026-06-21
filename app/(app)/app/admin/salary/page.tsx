'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface SalaryEntry {
  effectiveDate: string;
  baseSalary: number;
  hourlyBillableRate: number;
}

export default function AdminSalaryPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [salaryTable, setSalaryTable] = useState<SalaryEntry[]>([]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [hourlyBillableRate, setHourlyBillableRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data: User[] = await res.json();
      setUsers(data);
      if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0]._id);
      }
    }
    setLoading(false);
  }, [selectedUserId]);

  const loadSalary = useCallback(async (userId: string) => {
    if (!userId) return;
    const res = await fetch(`/api/users/${userId}/salary`);
    if (res.ok) {
      const data = await res.json();
      setSalaryTable(data.salaryTable ?? []);
    } else {
      const data = await res.json();
      setError(data.error ?? '급여 이력을 불러오지 못했습니다');
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUserId) {
      void loadSalary(selectedUserId);
    }
  }, [selectedUserId, loadSalary]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch(`/api/users/${selectedUserId}/salary`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        effectiveDate,
        baseSalary: Number(baseSalary),
        hourlyBillableRate: Number(hourlyBillableRate),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '저장에 실패했습니다');
      return;
    }

    const data = await res.json();
    setSalaryTable(data.salaryTable ?? []);
    setEffectiveDate('');
    setBaseSalary('');
    setHourlyBillableRate('');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">급여 단가</h1>
        <p className="mt-1 text-muted-foreground">
          직원별 시간당 청구 단가 이력을 관리합니다. (추가만 가능)
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>직원 선택</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : (
            <select
              aria-label="직원 선택"
              className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>단가 이력 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="salary-date">적용 시작일</Label>
                <Input
                  id="salary-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-salary">기본급</Label>
                <Input
                  id="base-salary"
                  type="number"
                  min={0}
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly-rate">시간당 청구 단가</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  min={0}
                  value={hourlyBillableRate}
                  onChange={(e) => setHourlyBillableRate(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting || !selectedUserId}>
              {submitting ? '저장 중...' : '이력 추가'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>급여 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {salaryTable.length === 0 ? (
            <p className="text-muted-foreground">등록된 급여 이력이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>적용 시작일</TableHead>
                  <TableHead>기본급</TableHead>
                  <TableHead>시간당 단가</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryTable.map((entry) => (
                  <TableRow key={entry.effectiveDate}>
                    <TableCell>{formatDate(entry.effectiveDate)}</TableCell>
                    <TableCell>{entry.baseSalary.toLocaleString('ko-KR')}원</TableCell>
                    <TableCell>{entry.hourlyBillableRate.toLocaleString('ko-KR')}원</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
