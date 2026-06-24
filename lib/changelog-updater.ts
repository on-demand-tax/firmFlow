import { getSeoulDateKey } from '@/lib/dates';

export type ChangelogEntry = {
  date: string;
  version: string;
  title: string;
  items: string[];
};

export type ChangelogData = {
  entries: ChangelogEntry[];
};

const CONVENTIONAL_PREFIX = /^(?:\w+)(?:\([^)]+\))?!?:\s*(.+)$/;

/** 커밋 메시지 첫 줄에서 conventional prefix 제거 */
export function stripConventionalPrefix(subject: string): string {
  const trimmed = subject.trim();
  const match = CONVENTIONAL_PREFIX.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

/** 커밋 메시지 파일 내용 → 변경 이력 항목 (첫 줄 + 본문 `-` 목록) */
export function parseCommitMessage(content: string): string[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const first = stripConventionalPrefix(lines[0]);
  if (!first || first.includes('[skip changelog]')) return [];

  const bodyItems = lines
    .slice(1)
    .filter((line) => line.startsWith('-'))
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter(Boolean);

  return [first, ...bodyItems];
}

export function bumpPatchVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    return '0.1.1';
  }
  const patch = Number(match[3]) + 1;
  return `${match[1]}.${match[2]}.${patch}`;
}

export type ApplyCommitResult = {
  entries: ChangelogEntry[];
  version: string;
  changed: boolean;
};

/**
 * 커밋 메시지 항목을 changelog에 반영.
 * - 같은 날(서울) 최신 엔트리가 있으면 items에 추가 (중복 제외), 버전 유지
 * - 새 날짜면 patch 버전 올리고 새 엔트리 추가
 */
export function applyCommitToChangelog(
  entries: ChangelogEntry[],
  items: string[],
  currentVersion: string,
  today: string = getSeoulDateKey(new Date()),
): ApplyCommitResult {
  if (items.length === 0) {
    return { entries, version: currentVersion, changed: false };
  }

  const newItems = items.filter(
    (item) => !entries.some((entry) => entry.items.includes(item)),
  );
  if (newItems.length === 0) {
    return { entries, version: currentVersion, changed: false };
  }

  const [head, ...rest] = entries;

  if (head?.date === today) {
    return {
      entries: [{ ...head, items: [...newItems, ...head.items] }, ...rest],
      version: currentVersion,
      changed: true,
    };
  }

  const nextVersion = bumpPatchVersion(currentVersion);
  const title = newItems[0];

  return {
    entries: [
      {
        date: today,
        version: nextVersion,
        title,
        items: newItems,
      },
      ...entries,
    ],
    version: nextVersion,
    changed: true,
  };
}
