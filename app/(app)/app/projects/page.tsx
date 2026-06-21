'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClientOption {
  value: string;
  label: string;
}

interface Project {
  _id: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  projectName: string;
  status: 'Active' | 'Completed';
}

const emptyForm = {
  clientId: '',
  projectName: '',
  status: 'Active' as 'Active' | 'Completed',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [projectsRes, clientsRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/clients'),
    ]);
    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }
    if (clientsRes.ok) {
      setClients(await clientsRes.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadData();
    }
    void init();
  }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const url = editingId ? `/api/projects/${editingId}` : '/api/projects';
    const method = editingId ? 'PATCH' : 'POST';
    const body = editingId
      ? { projectName: form.projectName, status: form.status }
      : { clientId: form.clientId, projectName: form.projectName };

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
    await loadData();
  }

  function startEdit(project: Project) {
    setEditingId(project._id);
    setForm({
      clientId: project.clientId,
      projectName: project.projectName,
      status: project.status,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleDelete(id: string) {
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '삭제에 실패했습니다');
      return;
    }
    await loadData();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">프로젝트</h1>
        <p className="mt-1 text-muted-foreground">고객별 프로젝트를 등록하고 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? '프로젝트 수정' : '프로젝트 등록'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">고객</Label>
              <Select
                value={form.clientId}
                onValueChange={(value) =>
                  value && setForm({ ...form, clientId: value })
                }
                disabled={!!editingId}
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="고객 선택" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">프로젝트명</Label>
              <Input
                id="projectName"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                required
              />
            </div>
            {editingId && (
              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    value &&
                    setForm({ ...form, status: value as 'Active' | 'Completed' })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">진행 중</SelectItem>
                    <SelectItem value="Completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
          <CardTitle>프로젝트 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : projects.length === 0 ? (
            <p className="text-muted-foreground">등록된 프로젝트가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로젝트명</TableHead>
                  <TableHead>고객</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project._id}>
                    <TableCell>{project.projectName}</TableCell>
                    <TableCell>{project.clientName}</TableCell>
                    <TableCell>
                      {project.status === 'Active' ? '진행 중' : '완료'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(project)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(project._id)}
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
