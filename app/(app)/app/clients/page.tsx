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

interface Client {
  _id: string;
  name: string;
  clientCode: string;
  businessRegistrationNumber: string;
  contactPerson: string;
  googleDriveFolderId: string;
}

const emptyForm = {
  name: '',
  clientCode: '',
  businessRegistrationNumber: '',
  contactPerson: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    const res = await fetch('/api/clients');
    if (res.ok) {
      setClients(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadClients();
    }
    void init();
  }, [loadClients]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const url = editingId ? `/api/clients/${editingId}` : '/api/clients';
    const method = editingId ? 'PATCH' : 'POST';
    const body = editingId
      ? {
          name: form.name,
          businessRegistrationNumber: form.businessRegistrationNumber,
          contactPerson: form.contactPerson,
        }
      : form;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '저장에 실패했습니다');
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadClients();
  }

  function startEdit(client: Client) {
    setEditingId(client._id);
    setForm({
      name: client.name,
      clientCode: client.clientCode,
      businessRegistrationNumber: client.businessRegistrationNumber,
      contactPerson: client.contactPerson,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleDelete(id: string) {
    if (!confirm('이 고객을 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '삭제에 실패했습니다');
      return;
    }
    await loadClients();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">고객</h1>
        <p className="mt-1 text-muted-foreground">고객사 정보를 등록하고 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? '고객 수정' : '고객 등록'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">고객사명</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientCode">고객 코드</Label>
              <Input
                id="clientCode"
                value={form.clientCode}
                onChange={(e) =>
                  setForm({ ...form, clientCode: e.target.value.toUpperCase() })
                }
                disabled={!!editingId}
                pattern="[A-Z0-9]{2,10}"
                title="영문 대문자·숫자 2~10자"
                required={!editingId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brn">사업자등록번호</Label>
              <Input
                id="brn"
                value={form.businessRegistrationNumber}
                onChange={(e) =>
                  setForm({ ...form, businessRegistrationNumber: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">담당자</Label>
              <Input
                id="contact"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive sm:col-span-2">{error}</p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">{editingId ? '수정' : '등록'}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  취소
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>고객 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : clients.length === 0 ? (
            <p className="text-muted-foreground">등록된 고객이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>고객사명</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead>사업자번호</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client._id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.clientCode}</TableCell>
                    <TableCell>{client.businessRegistrationNumber}</TableCell>
                    <TableCell>{client.contactPerson}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(client)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(client._id)}
                      >
                        삭제
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
