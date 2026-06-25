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
import { tableWrapCell } from '@/lib/table-cell-styles';

interface PeriodLock {
  _id: string;
  startDate: string;
  endDate: string;
  lockedAt: string;
  note?: string;
}

type LockTab = 'monthly' | 'custom';

export default function AdminLocksPage() {
  const [locks, setLocks] = useState<PeriodLock[]>([]);
  const [tab, setTab] = useState<LockTab>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadLocks = useCallback(async () => {
    const res = await fetch('/api/period-locks');
    if (res.ok) {
      setLocks(await res.json());
    } else {
      const data = await res.json();
      setError(data.error ?? '마감 목록을 불러오지 못했습니다');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadLocks();
    }
    void init();
  }, [loadLocks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const body =
      tab === 'monthly'
        ? { year, month, note: note || undefined }
        : { startDate, endDate, note: note || undefined };

    const res = await fetch('/api/period-locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '마감 처리에 실패했습니다');
      return;
    }

    setNote('');
    await loadLocks();
  }

  async function handleDelete(id: string) {
    setError('');
    const res = await fetch(`/api/period-locks/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '마감 해제에 실패했습니다');
      return;
    }
    await loadLocks();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">기간 마감</h1>
        <p className="mt-1 text-muted-foreground">
          월별 또는 임의 기간으로 타임로그·경비를 마감합니다.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>새 마감 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button
              type="button"
              variant={tab === 'monthly' ? 'default' : 'outline'}
              onClick={() => setTab('monthly')}
            >
              월별 마감
            </Button>
            <Button
              type="button"
              variant={tab === 'custom' ? 'default' : 'outline'}
              onClick={() => setTab('custom')}
            >
              임의 기간
            </Button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {tab === 'monthly' ? (
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lock-year">연도</Label>
                  <Input
                    id="lock-year"
                    type="number"
                    min={2020}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lock-month">월</Label>
                  <Input
                    id="lock-month"
                    type="number"
                    min={1}
                    max={12}
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lock-start">시작일</Label>
                  <Input
                    id="lock-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lock-end">종료일</Label>
                  <Input
                    id="lock-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="lock-note">메모 (선택)</Label>
              <Input
                id="lock-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="마감 사유 등"
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? '처리 중...' : '마감 등록'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>마감 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : locks.length === 0 ? (
            <p className="text-muted-foreground">등록된 마감이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시작일</TableHead>
                  <TableHead>종료일</TableHead>
                  <TableHead>마감일시</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {locks.map((lock) => (
                  <TableRow key={lock._id}>
                    <TableCell>{formatDate(lock.startDate)}</TableCell>
                    <TableCell>{formatDate(lock.endDate)}</TableCell>
                    <TableCell>{new Date(lock.lockedAt).toLocaleString('ko-KR')}</TableCell>
                    <TableCell className={tableWrapCell}>{lock.note ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(lock._id)}
                      >
                        해제
                      </Button>
                    </TableCell>
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
