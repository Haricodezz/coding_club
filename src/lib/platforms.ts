// ============================================================
// External Platform Stats — Codeforces, LeetCode, HackerRank
// Used for platform integration points on leaderboard
// ============================================================

import { PlatformProfiles, PlatformStats } from '@/types';

// -----------------------------------------------
// Codeforces — Public API, no auth needed
// https://codeforces.com/apiHelp
// -----------------------------------------------
export async function fetchCodeforcesStats(handle: string) {
  try {
    const [infoRes, statusRes] = await Promise.all([
      fetch(`https://codeforces.com/api/user.info?handles=${handle}`, { next: { revalidate: 3600 } }),
      fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`, {
        next: { revalidate: 3600 },
      }),
    ]);

    if (!infoRes.ok) throw new Error('Codeforces user not found');

    const infoData = await infoRes.json();
    const user = infoData.result?.[0];

    let solved = 0;
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      // Count unique accepted problems
      const acceptedProblems = new Set<string>();
      (statusData.result || []).forEach((sub: { verdict: string; problem: { contestId: number; index: string } }) => {
        if (sub.verdict === 'OK') {
          acceptedProblems.add(`${sub.problem.contestId}-${sub.problem.index}`);
        }
      });
      solved = acceptedProblems.size;
    }

    return {
      solved,
      rating: user?.rating || 0,
      max_rating: user?.maxRating || 0,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------
// LeetCode — Public GraphQL endpoint
// -----------------------------------------------
export async function fetchLeetCodeStats(username: string) {
  try {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
          }
        }
      }
    `;

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({ query, variables: { username } }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error('LeetCode GraphQL failed');

    const data = await res.json();
    const user = data?.data?.matchedUser;
    if (!user) return null;

    const acStats = user.submitStatsGlobal?.acSubmissionNum || [];
    const allSolved = acStats.find((s: { difficulty: string; count: number }) => s.difficulty === 'All');

    return {
      solved: allSolved?.count || 0,
      ranking: user.profile?.ranking || 0,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------
// HackerRank — Limited public access; uses profile page scraping
// Falls back gracefully if API key not provided
// -----------------------------------------------
export async function fetchHackerRankStats(username: string): Promise<{ solved: number } | null> {
  try {
    // HackerRank has a semi-public stats endpoint
    const res = await fetch(
      `https://www.hackerrank.com/rest/hackers/${username}/scores_elo`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    // Response gives total score as proxy for "challenges done"
    const data = await res.json();
    return { solved: data?.total || 0 };
  } catch {
    return null;
  }
}

// -----------------------------------------------
// Calculate platform points from stats
// Formula: +1 per 50 problems solved, max 300 pts per platform
// -----------------------------------------------
export function calculatePlatformPoints(stats: PlatformStats): number {
  const cfSolved = stats.codeforces?.solved || 0;
  const lcSolved = stats.leetcode?.solved || 0;
  const hrSolved = stats.hackerrank?.solved || 0;

  const cfPoints = Math.min(Math.floor(cfSolved / 50), 300);
  const lcPoints = Math.min(Math.floor(lcSolved / 50), 300);
  const hrPoints = Math.min(Math.floor(hrSolved / 50), 300);

  return cfPoints + lcPoints + hrPoints;
}

// -----------------------------------------------
// Aggregate: fetch all platform stats for a user
// -----------------------------------------------
export async function fetchAllPlatformStats(profiles: PlatformProfiles): Promise<PlatformStats> {
  const stats: PlatformStats = {};

  const [cf, lc, hr] = await Promise.allSettled([
    profiles.codeforces_handle ? fetchCodeforcesStats(profiles.codeforces_handle) : Promise.resolve(null),
    profiles.leetcode_handle ? fetchLeetCodeStats(profiles.leetcode_handle) : Promise.resolve(null),
    profiles.hackerrank_handle ? fetchHackerRankStats(profiles.hackerrank_handle) : Promise.resolve(null),
  ]);

  if (cf.status === 'fulfilled' && cf.value) stats.codeforces = cf.value;
  if (lc.status === 'fulfilled' && lc.value) stats.leetcode = lc.value;
  if (hr.status === 'fulfilled' && hr.value) stats.hackerrank = hr.value;

  return stats;
}
