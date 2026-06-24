import {
  applyCommitToChangelog,
  bumpPatchVersion,
  parseCommitMessage,
  stripConventionalPrefix,
  type ChangelogEntry,
} from '@/lib/changelog-updater';

const mvpEntry: ChangelogEntry = {
  date: '2026-06-24',
  version: '0.1.0',
  title: '정식 배포 (MVP)',
  items: ['MVP 기능'],
};

describe('stripConventionalPrefix', () => {
  it('removes conventional commit prefix', () => {
    expect(stripConventionalPrefix('feat(timesheet): 수정 버튼 추가')).toBe('수정 버튼 추가');
  });
});

describe('parseCommitMessage', () => {
  it('parses subject and bullet body lines', () => {
    expect(
      parseCommitMessage('feat: 타임시트 수정\n\n- 대기·반려 항목만\n- 상단 폼 연동'),
    ).toEqual(['타임시트 수정', '대기·반려 항목만', '상단 폼 연동']);
  });

  it('returns empty for skip marker', () => {
    expect(parseCommitMessage('wip [skip changelog]')).toEqual([]);
  });
});

describe('bumpPatchVersion', () => {
  it('increments patch segment', () => {
    expect(bumpPatchVersion('0.1.0')).toBe('0.1.1');
  });
});

describe('applyCommitToChangelog', () => {
  it('appends to same-day entry without bumping version', () => {
    const result = applyCommitToChangelog(
      [mvpEntry],
      ['비승인 항목 수정 버튼'],
      '0.1.0',
      '2026-06-24',
    );

    expect(result.changed).toBe(true);
    expect(result.version).toBe('0.1.0');
    expect(result.entries[0].items[0]).toBe('비승인 항목 수정 버튼');
    expect(result.entries[0].items[1]).toBe('MVP 기능');
  });

  it('creates a new entry and bumps version on a new day', () => {
    const result = applyCommitToChangelog(
      [mvpEntry],
      ['자동 changelog 기록'],
      '0.1.0',
      '2026-06-25',
    );

    expect(result.changed).toBe(true);
    expect(result.version).toBe('0.1.1');
    expect(result.entries[0]).toMatchObject({
      date: '2026-06-25',
      version: '0.1.1',
      title: '자동 changelog 기록',
      items: ['자동 changelog 기록'],
    });
  });

  it('skips duplicate items', () => {
    const result = applyCommitToChangelog(
      [mvpEntry],
      ['MVP 기능'],
      '0.1.0',
      '2026-06-24',
    );

    expect(result.changed).toBe(false);
  });
});
