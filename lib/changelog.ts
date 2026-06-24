import packageJson from '../package.json';
import changelogData from '../data/changelog.json';

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
 * `data/changelog.json` is updated automatically on each commit (see `.githooks/commit-msg`).
 */
export const CHANGELOG: ChangelogEntry[] = changelogData.entries;
