// Claude Code Stop hook: after each Claude turn, if the repo has changes and
// typecheck + tests pass, commit everything and push to GitHub.
// Never blocks Claude; reports one line to the user as a systemMessage.
import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, statSync, unlinkSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const extraPath = process.platform === 'win32' ? ['C:\\Program Files\\Git\\cmd', 'C:\\Program Files\\GitHub CLI'] : [];
const env = {
  ...process.env,
  PATH: [dirname(process.execPath), ...extraPath, process.env.PATH ?? ''].join(delimiter),
  GIT_TERMINAL_PROMPT: '0',
};
const NL = '\n';

const say = (msg) => process.stdout.write(JSON.stringify({ systemMessage: msg }));
const git = (args, input) => execFileSync('git', args, { cwd: repo, env, encoding: 'utf8', input }).trim();
const npm = (script) => spawnSync(`npm run -s ${script}`, { cwd: repo, env, encoding: 'utf8', shell: true }).status === 0;

const gitDir = join(repo, '.git');
if (['MERGE_HEAD', 'rebase-merge', 'rebase-apply'].some((f) => existsSync(join(gitDir, f)))) process.exit(0);

// one run at a time (the hook may be registered in more than one settings file)
const lock = join(gitDir, 'claude-auto-push.lock');
try {
  if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 10 * 60_000) unlinkSync(lock);
  closeSync(openSync(lock, 'wx'));
} catch {
  process.exit(0);
}

function main() {
  const dirty = git(['status', '--porcelain']) !== '';
  let ahead = 0;
  try {
    ahead = Number(git(['rev-list', '--count', '@{u}..HEAD']));
  } catch {
    // no upstream yet
  }
  if (!dirty && !ahead) return;

  let files = [];
  if (dirty) {
    if (!npm('typecheck')) return say('⚠ Автопуш пропущено: помилки TypeScript (npm run typecheck).');
    if (!npm('test')) return say('⚠ Автопуш пропущено: тести не пройшли (npm test).');
    git(['add', '-A']);
    files = git(['diff', '--cached', '--name-only']).split(NL).filter(Boolean);
    if (files.length) {
      const head = files.slice(0, 3).map((f) => f.split('/').pop()).join(', ') + (files.length > 3 ? ` +${files.length - 3}` : '');
      const list = files.map((f) => `- ${f}`).join(NL);
      git(['commit', '-q', '-F', '-'], `Автозбереження: ${head}${NL}${NL}${list}${NL}${NL}Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>${NL}`);
    }
  }
  git(['push', '-q', 'origin', 'HEAD']);
  const sha = git(['rev-parse', '--short', 'HEAD']);
  say(files.length ? `✅ Автопуш: ${sha} на GitHub (${files.length} файл.)` : `✅ Автопуш: ${sha} на GitHub`);
}

try {
  main();
} catch (e) {
  say(`⚠ Автопуш не вдався: ${String(e.stderr || e.message).split(NL)[0]}`);
} finally {
  try {
    unlinkSync(lock);
  } catch {
    // already gone
  }
}
