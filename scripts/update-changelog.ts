import fs from 'fs';
import path from 'path';

import {
  applyCommitToChangelog,
  parseCommitMessage,
  type ChangelogData,
} from '../lib/changelog-updater';

const ROOT = path.join(__dirname, '..');
const CHANGELOG_PATH = path.join(ROOT, 'data/changelog.json');
const PACKAGE_PATH = path.join(ROOT, 'package.json');

function main() {
  const commitMsgFile = process.argv[2];
  if (!commitMsgFile) {
    console.error('Usage: update-changelog <commit-msg-file>');
    process.exit(1);
  }

  const message = fs.readFileSync(commitMsgFile, 'utf8');
  const items = parseCommitMessage(message);
  if (items.length === 0) {
    return;
  }

  const changelog = JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8')) as ChangelogData;
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8')) as { version: string };

  const result = applyCommitToChangelog(changelog.entries, items, pkg.version);
  if (!result.changed) {
    return;
  }

  fs.writeFileSync(
    CHANGELOG_PATH,
    `${JSON.stringify({ entries: result.entries }, null, 2)}\n`,
  );
  fs.writeFileSync(PACKAGE_PATH, `${JSON.stringify({ ...pkg, version: result.version }, null, 2)}\n`);
}

main();
