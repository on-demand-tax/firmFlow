'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ExpiringDocument = {
  _id: string;
  title: string;
  expiry: {
    label: string | null;
    status: string;
  };
};

export function ExpiringDocumentsCard() {
  const [items, setItems] = useState<ExpiringDocument[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch('/api/documents/expiring?withinDays=30');
      if (!res.ok) return;
      const data: ExpiringDocument[] = await res.json();
      if (!cancelled) {
        setItems(data.slice(0, 5));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">만료 임박 문서</CardTitle>
        <Link href="/app/documents?expiring=1" className="text-sm text-primary hover:underline">
          전체 보기
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item._id} className="flex items-center justify-between gap-3">
            <Link href="/app/documents" className="truncate text-sm font-medium hover:underline">
              {item.title}
            </Link>
            {item.expiry.label ? <Badge variant="secondary">{item.expiry.label}</Badge> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
