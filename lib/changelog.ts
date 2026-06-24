import packageJson from '../package.json';

export const APP_VERSION = packageJson.version;

/** Production go-live date (ISO 8601). */
export const LAUNCH_DATE = '2026-06-24';

export type ChangelogEntry = {
  date: string;
  version: string;
  title: string;
  items: string[];
};

/**
 * Release notes shown on /app/about. Newest entry first.
 * Add a row here when shipping user-visible changes.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-06-24',
    version: '0.1.0',
    title: '정식 배포 (MVP)',
    items: [
      'Google Workspace OAuth 로그인 및 역할 기반 접근 (Admin / Approver / Preparer)',
      '고객·프로젝트 등록 (10종 프로젝트 유형, Google Drive 폴더 자동 생성)',
      '타임시트·경비 입력 및 승인 워크플로',
      '월별 대시보드 (시간·인건비·경비 집계)',
      '관리자: 사용자, 기간 마감, 급여 단가',
    ],
  },
];
