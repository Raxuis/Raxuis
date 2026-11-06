import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function collectStats(username, token, request = fetch) {
  if (!token) throw new Error('GITHUB_TOKEN is required to refresh statistics');
  let cursor = null;
  let calendar;
  let followers;
  let publicRepositories;
  let totals;
  const repositoryData = [];
  let repositories = 0;
  let stars = 0;
  const seen = new Set();
  do {
    const response = await request('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'raxuis-profile' },
      body: JSON.stringify({
        query: `query($username: String!, $cursor: String) { user(login: $username) {
          followers { totalCount }
          repositories(privacy: PUBLIC, ownerAffiliations: OWNER, first: 100, after: $cursor) {
            totalCount nodes { name description isFork stargazerCount updatedAt url primaryLanguage { name } } pageInfo { hasNextPage endCursor }
          }
          contributionsCollection { totalCommitContributions totalPullRequestContributions totalIssueContributions contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } }
        } }`,
        variables: { username, cursor }
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
    const json = await response.json();
    if (json.errors?.length || !json.data?.user) throw new Error('GitHub returned incomplete data');
    const user = json.data.user;
    calendar ??= user.contributionsCollection?.contributionCalendar;
    followers ??= user.followers?.totalCount;
    publicRepositories ??= user.repositories?.totalCount;
    totals ??= user.contributionsCollection;
    const repos = user.repositories;
    if (!Array.isArray(repos?.nodes) || !repos.pageInfo) throw new Error('Missing repository data');
    for (const repo of repos.nodes) {
      if (!Number.isInteger(repo?.stargazerCount) || repo.stargazerCount < 0) throw new Error('Invalid repository data');
      if (repo.isFork) continue;
      repositories++;
      stars += repo.stargazerCount;
      repositoryData.push(repo);
    }
    if (!repos.pageInfo.hasNextPage) break;
    cursor = repos.pageInfo.endCursor;
    if (!cursor || seen.has(cursor)) throw new Error('Invalid pagination cursor');
    seen.add(cursor);
  } while (true);
  if (!Number.isInteger(calendar?.totalContributions) || !Array.isArray(calendar.weeks) || !calendar.weeks.length) throw new Error('Missing contribution calendar');
  for (const week of calendar.weeks) {
    if (!Array.isArray(week.contributionDays)) throw new Error('Invalid calendar week');
    for (const day of week.contributionDays) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isInteger(day.contributionCount) || day.contributionCount < 0) throw new Error('Invalid contribution day');
    }
  }
  if (![followers, publicRepositories, totals?.totalCommitContributions, totals?.totalPullRequestContributions, totals?.totalIssueContributions].every(n => Number.isInteger(n) && n >= 0)) throw new Error('Missing profile counts');
  return { followers, publicRepositories, repositoryData, commits: totals.totalCommitContributions, pulls: totals.totalPullRequestContributions, issues: totals.totalIssueContributions, updatedAt: new Date().toISOString().slice(0, 10), repositories, stars, contributions: calendar.totalContributions, weeks: calendar.weeks };
}

export async function refreshStats({ username, token, destination, request = fetch }) {
  try {
    const snapshot = await collectStats(username, token, request);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(`${destination}.tmp`, JSON.stringify(snapshot, null, 2) + '\n');
    await rename(`${destination}.tmp`, destination);
    return true;
  } catch (error) {
    console.warn(`Statistics refresh skipped: ${error.message}. Keeping the last valid snapshot, if available.`);
    return false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const config = JSON.parse(await readFile(path.join(root, 'profile.config.json'), 'utf8'));
  await refreshStats({ username: config.github.username, token: process.env.GITHUB_TOKEN, destination: path.join(root, 'profile/stats.json') });
}
