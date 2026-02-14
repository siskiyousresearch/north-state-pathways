import { getUncachableGitHubClient } from './github';
import * as fs from 'fs';
import * as path from 'path';

const REPO_NAME = 'north-state-pathways';
const ROOT_DIR = process.cwd();

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.config', '.cache', '.local', '.upm',
  '.replit', 'attached_assets'
]);

const IGNORE_FILES = new Set([
  'package-lock.json', '.replit'
]);

function getAllFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (IGNORE_FILES.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push(relativePath);
    }
  }
  return results;
}

function isBinaryFile(filePath: string): boolean {
  const binaryExts = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
    '.mp3', '.wav', '.ogg', '.mp4', '.webm',
    '.pdf', '.docx', '.xlsx', '.zip', '.tar', '.gz',
    '.woff', '.woff2', '.ttf', '.eot',
    '.bin', '.exe', '.dll', '.so'
  ]);
  return binaryExts.has(path.extname(filePath).toLowerCase());
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pushToGitHub() {
  console.log('Getting GitHub client...');
  const octokit = await getUncachableGitHubClient();

  console.log('Getting authenticated user...');
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;
  console.log(`Authenticated as: ${owner}`);

  let repoExists = false;
  let repoEmpty = false;
  try {
    await octokit.repos.get({ owner, repo: REPO_NAME });
    repoExists = true;
    try {
      await octokit.git.getRef({ owner, repo: REPO_NAME, ref: 'heads/main' });
    } catch {
      repoEmpty = true;
    }
  } catch {
    repoExists = false;
  }

  if (!repoExists) {
    console.log(`Creating repository: ${REPO_NAME}...`);
    await octokit.repos.createForAuthenticatedUser({
      name: REPO_NAME,
      description: 'North State Pathways - Education pathway platform',
      private: false,
      auto_init: false,
    });
    console.log(`Repository ${REPO_NAME} created.`);
    repoEmpty = true;
  } else {
    console.log(`Repository ${REPO_NAME} already exists.`);
  }

  if (repoEmpty) {
    console.log('Initializing empty repo with a README...');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: REPO_NAME,
      path: 'README.md',
      message: 'Initialize repository',
      content: Buffer.from('# North State Pathways\n\nEducation pathway platform\n').toString('base64'),
    });
    console.log('README created. Waiting for GitHub...');
    await sleep(2000);
  }

  console.log('Getting main branch reference...');
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo: REPO_NAME,
    ref: 'heads/main',
  });
  const latestCommitSha = ref.object.sha;

  console.log('Collecting files...');
  const files = getAllFiles(ROOT_DIR, ROOT_DIR);
  console.log(`Found ${files.length} files to push.`);

  console.log('Creating blobs...');
  const treeItems: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha: string;
  }> = [];

  const BATCH_SIZE = 5;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (filePath) => {
        const fullPath = path.join(ROOT_DIR, filePath);
        const content = fs.readFileSync(fullPath);
        const isBinary = isBinaryFile(filePath);

        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo: REPO_NAME,
          content: content.toString(isBinary ? 'base64' : 'utf-8'),
          encoding: isBinary ? 'base64' : 'utf-8',
        });

        return {
          path: filePath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );
    treeItems.push(...results);
    console.log(`  Uploaded ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} files...`);
  }

  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo: REPO_NAME,
    tree: treeItems,
  });

  console.log('Creating commit...');
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo: REPO_NAME,
    message: 'Initial commit: North State Pathways',
    tree: tree.sha,
    parents: [latestCommitSha],
  });

  console.log('Updating main branch reference...');
  await octokit.git.updateRef({
    owner,
    repo: REPO_NAME,
    ref: 'heads/main',
    sha: commit.sha,
    force: true,
  });

  console.log('Successfully pushed to GitHub!');
  console.log(`Repository URL: https://github.com/${owner}/${REPO_NAME}`);
}

pushToGitHub().catch((err) => {
  console.error('Failed to push to GitHub:', err.message || err);
  process.exit(1);
});
