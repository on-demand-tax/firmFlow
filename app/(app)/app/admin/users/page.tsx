'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  email: string;
  name: string;
  role: 'Admin' | 'Approver' | 'Preparer';
  status: 'Active' | 'OnLeave' | 'Terminated';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      setUsers(await res.json());
    } else {
      const data = await res.json();
      setError(data.error ?? '사용자 목록을 불러오지 못했습니다');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadUsers();
    }
    void init();
  }, [loadUsers]);

  async function handleUpdate(userId: string, role: User['role'], status: User['status']) {
    setSavingId(userId);
    setError('');

    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, status }),
    });

    setSavingId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '저장에 실패했습니다');
      return;
    }

    await loadUsers();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">사용자 관리</h1>
        <p className="mt-1 text-muted-foreground">역할과 계정 상태를 관리합니다.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow
                    key={`${user._id}:${user.role}:${user.status}`}
                    user={user}
                    saving={savingId === user._id}
                    onSave={handleUpdate}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  saving,
  onSave,
}: {
  user: User;
  saving: boolean;
  onSave: (id: string, role: User['role'], status: User['status']) => void;
}) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);

  const changed = role !== user.role || status !== user.status;

  return (
    <TableRow>
      <TableCell>{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <select
          aria-label={`${user.name} 역할`}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as User['role'])}
        >
          <option value="Preparer">작성자</option>
          <option value="Approver">승인자</option>
          <option value="Admin">관리자</option>
        </select>
      </TableCell>
      <TableCell>
        <select
          aria-label={`${user.name} 상태`}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as User['status'])}
        >
          <option value="Active">활성</option>
          <option value="OnLeave">휴직</option>
          <option value="Terminated">퇴사</option>
        </select>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          disabled={!changed || saving}
          onClick={() => onSave(user._id, role, status)}
        >
          {saving ? '저장 중...' : '저장'}
        </Button>
      </TableCell>
    </TableRow>
  );
}
