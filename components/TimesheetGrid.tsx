'use client';

import { useState } from 'react';

import { SimpleModal } from '@/components/app/SimpleModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { lockedEntryClass, lockedEntryTitle } from '@/lib/locked-entry-styles';
import { useIsMobile } from '@/lib/use-media-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface TimesheetGridEntry {
  id: string;
  date: string;
  clientName: string;
  projectLabel: string;
  hours: number;
  activityLabel?: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  lockedAt?: string;
  canEdit?: boolean;
}

interface TimesheetGridProps {
  entries: TimesheetGridEntry[];
  viewMode: 'auto' | 'mobile' | 'desktop';
  onEdit?: (entry: TimesheetGridEntry) => void;
}

const statusLabel: Record<TimesheetGridEntry['status'], string> = {
  Pending: '대기',
  Approved: '승인',
  Rejected: '반려',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function EntryStatusBadge({
  entry,
  onViewReject,
}: {
  entry: TimesheetGridEntry;
  onViewReject: () => void;
}) {
  if (entry.status === 'Rejected') {
    return (
      <button
        type="button"
        className="inline-flex cursor-pointer"
        onClick={onViewReject}
        title="반려 사유 보기"
      >
        <Badge variant="secondary">{statusLabel[entry.status]}</Badge>
      </button>
    );
  }

  return (
    <Badge variant={entry.status === 'Approved' ? 'default' : 'secondary'}>
      {statusLabel[entry.status]}
    </Badge>
  );
}

function RejectReasonModal({
  entry,
  onClose,
}: {
  entry: TimesheetGridEntry | null;
  onClose: () => void;
}) {
  return (
    <SimpleModal
      open={!!entry}
      title="반려 사유"
      description={
        entry
          ? `${formatFullDate(entry.date)} · ${entry.clientName} — ${entry.projectLabel}`
          : undefined
      }
      onClose={onClose}
      footer={
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
          onClick={onClose}
        >
          닫기
        </button>
      }
    >
      <p className="whitespace-pre-wrap text-sm">
        {entry?.rejectionReason?.trim() || '등록된 반려 사유가 없습니다.'}
      </p>
    </SimpleModal>
  );
}

function EntryActions({
  entry,
  onEdit,
}: {
  entry: TimesheetGridEntry;
  onEdit?: (entry: TimesheetGridEntry) => void;
}) {
  if (!entry.canEdit || !onEdit) return null;

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(entry)}>
      수정
    </Button>
  );
}

function MobileCardStack({
  entries,
  onViewReject,
  onEdit,
}: {
  entries: TimesheetGridEntry[];
  onViewReject: (entry: TimesheetGridEntry) => void;
  onEdit?: (entry: TimesheetGridEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <div data-testid="mobile-timesheet-card-stack">
        <p className="text-muted-foreground">등록된 타임로그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div data-testid="mobile-timesheet-card-stack" className="flex flex-col gap-3">
      {entries.map((entry) => (
        <Card
          key={entry.id}
          className={lockedEntryClass(entry.lockedAt)}
          title={lockedEntryTitle(entry.lockedAt)}
        >
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{formatDate(entry.date)}</span>
              <div className="flex items-center gap-1">
                <EntryActions entry={entry} onEdit={onEdit} />
                <EntryStatusBadge entry={entry} onViewReject={() => onViewReject(entry)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {entry.clientName} — {entry.projectLabel}
            </p>
            {entry.activityLabel && (
              <p className="text-sm font-medium">{entry.activityLabel}</p>
            )}
            <p className="text-sm">{entry.description}</p>
            <p className="text-sm font-semibold">{entry.hours}h</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DesktopEntryList({
  entries,
  onViewReject,
  onEdit,
}: {
  entries: TimesheetGridEntry[];
  onViewReject: (entry: TimesheetGridEntry) => void;
  onEdit?: (entry: TimesheetGridEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <div data-testid="desktop-entry-list">
        <p className="text-muted-foreground">등록된 타임로그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div data-testid="desktop-entry-list" className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>작업일</TableHead>
            <TableHead>프로젝트</TableHead>
            <TableHead>시간</TableHead>
            <TableHead>내용</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="w-[4.5rem]">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.id}
              className={lockedEntryClass(entry.lockedAt)}
              title={lockedEntryTitle(entry.lockedAt)}
            >
              <TableCell>{formatFullDate(entry.date)}</TableCell>
              <TableCell>
                {entry.clientName} — {entry.projectLabel}
              </TableCell>
              <TableCell>{entry.hours}h</TableCell>
              <TableCell>
                {entry.activityLabel && (
                  <p className="text-sm font-medium">{entry.activityLabel}</p>
                )}
                <p className="text-sm">{entry.description}</p>
              </TableCell>
              <TableCell>
                <EntryStatusBadge entry={entry} onViewReject={() => onViewReject(entry)} />
              </TableCell>
              <TableCell>
                <EntryActions entry={entry} onEdit={onEdit} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function TimesheetGrid({ entries, viewMode, onEdit }: TimesheetGridProps) {
  const isMobileAuto = useIsMobile();
  const showMobile =
    viewMode === 'mobile' || (viewMode === 'auto' && isMobileAuto);
  const [viewRejectEntry, setViewRejectEntry] = useState<TimesheetGridEntry | null>(
    null,
  );

  return (
    <>
      <RejectReasonModal
        entry={viewRejectEntry}
        onClose={() => setViewRejectEntry(null)}
      />
      {showMobile ? (
        <MobileCardStack entries={entries} onViewReject={setViewRejectEntry} onEdit={onEdit} />
      ) : (
        <DesktopEntryList entries={entries} onViewReject={setViewRejectEntry} onEdit={onEdit} />
      )}
    </>
  );
}
