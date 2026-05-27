'use client';

import { useEffect, useState, useMemo } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

interface TeamMember {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  branch: string | null;
  academic_year: number | null;
  platform_profiles: Record<string, any> | null;
  created_at: string | null;
  // derived
  blogCount?: number;
  problemCount?: number;
  expertise?: string[];
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Founder', color: '#f59e0b' },
  team:        { label: 'Core Team', color: '#8b5cf6' },
  mentor:      { label: 'Mentor', color: '#06b6d4' },
  moderator:   { label: 'Moderator', color: '#10b981' },
};

const SORT_OPTIONS = [
  { value: 'join_date', label: 'Join Date' },
  { value: 'name', label: 'Alphabetical' },
  { value: 'contributions', label: 'Contributions' },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState('join_date');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [stats, setStats] = useState({ members: 0, blogs: 0, problems: 0 });

  useEffect(() => {
    async function fetchTeam() {
      try {
        const supabase = getSupabase();

        // Fetch all team/admin members
        const { data: teamData } = await supabase
          .from('users')
          .select('id, username, full_name, avatar_url, role, bio, branch, academic_year, platform_profiles, created_at')
          .in('role', ['super_admin', 'team'])
          .order('created_at', { ascending: true });

        if (!teamData || teamData.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch blog counts per member
        const { data: blogData } = await supabase
          .from('cms_blogs')
          .select('author_id')
          .eq('is_published', true);

        // Fetch problem counts per member (question_bank)
        const { data: problemData } = await (supabase as any)
          .from('question_bank')
          .select('created_by')
          .eq('is_published', true);

        const blogCounts: Record<string, number> = {};
        (blogData || []).forEach((b: any) => {
          if (b.author_id) blogCounts[b.author_id] = (blogCounts[b.author_id] || 0) + 1;
        });

        const problemCounts: Record<string, number> = {};
        (problemData || []).forEach((p: any) => {
          if (p.created_by) problemCounts[p.created_by] = (problemCounts[p.created_by] || 0) + 1;
        });

        // Derive expertise tags from platform_profiles / branch
        function getExpertise(m: any): string[] {
          const tags: string[] = [];
          const pp = m.platform_profiles || {};
          if (pp.leetcode_username) tags.push('DSA');
          if (pp.github) tags.push('Open Source');
          if (m.branch) {
            const b = m.branch.toLowerCase();
            if (b.includes('cs') || b.includes('it') || b.includes('cse')) tags.push('Software Dev');
            if (b.includes('ai') || b.includes('ml') || b.includes('data')) tags.push('AI/ML');
          }
          if ((problemCounts[m.id] || 0) > 0) tags.push('Problem Setter');
          if ((blogCounts[m.id] || 0) > 2) tags.push('Content Creator');
          return tags.slice(0, 4);
        }

        const enriched: TeamMember[] = teamData.map((m: any) => ({
          ...m,
          blogCount: blogCounts[m.id] || 0,
          problemCount: problemCounts[m.id] || 0,
          expertise: getExpertise(m),
        }));

        setMembers(enriched);
        setStats({
          members: enriched.length,
          blogs: Object.values(blogCounts).reduce((a, b) => a + b, 0),
          problems: Object.values(problemCounts).reduce((a, b) => a + b, 0),
        });
      } catch (err) {
        console.error('Error fetching team:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const filtered = useMemo(() => {
    let result = [...members];

    if (filterRole !== 'all') {
      result = result.filter(m => m.role === filterRole);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        (m.full_name || '').toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.branch || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'name') {
      result.sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username));
    } else if (sortBy === 'contributions') {
      result.sort((a, b) => ((b.blogCount || 0) + (b.problemCount || 0)) - ((a.blogCount || 0) + (a.problemCount || 0)));
    } else {
      result.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
    }

    return result;
  }, [members, filterRole, sortBy, searchQuery]);

  const roleInfo = (role: string) => ROLE_LABELS[role] || { label: role, color: '#6c63ff' };

  return (
    <>
      {/* SEO */}
      <title>Meet the Team — CodingClub</title>

      <div className="team-page" id="main-content">

        {/* ── Hero ── */}
        <section className="team-hero">
          <div className="team-hero-bg" aria-hidden="true" />
          <div className="container team-hero-content">
            <div className="team-hero-badge">Our People</div>
            <h1 className="team-hero-title">
              Meet the <span className="team-hero-gradient">CodingClub</span> Team
            </h1>
            <p className="team-hero-subtitle">
              The passionate people behind the platform — mentors, moderators, content creators, and builders.
            </p>

            {/* Stats */}
            <div className="team-stats-bar">
              <div className="team-stat">
                <span className="team-stat-value">{loading ? '—' : stats.members}</span>
                <span className="team-stat-label">Team Members</span>
              </div>
              <div className="team-stat-divider" />
              <div className="team-stat">
                <span className="team-stat-value">{loading ? '—' : stats.problems}</span>
                <span className="team-stat-label">Problems Created</span>
              </div>
              <div className="team-stat-divider" />
              <div className="team-stat">
                <span className="team-stat-value">{loading ? '—' : stats.blogs}</span>
                <span className="team-stat-label">Blogs Published</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Filter Bar ── */}
        <section className="team-filters-section">
          <div className="container team-filters">
            {/* Search */}
            <div className="team-search-wrapper">
              <svg className="team-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                className="team-search-input"
                placeholder="Search by name, username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search team members"
              />
            </div>

            {/* Role filter pills */}
            <div className="team-role-filters" role="group" aria-label="Filter by role">
              {[
                { value: 'all', label: 'All' },
                { value: 'super_admin', label: 'Founders' },
                { value: 'team', label: 'Core Team' },
              ].map(f => (
                <button
                  key={f.value}
                  className={`team-filter-pill${filterRole === f.value ? ' active' : ''}`}
                  onClick={() => setFilterRole(f.value)}
                  aria-pressed={filterRole === f.value}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              className="team-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              aria-label="Sort team members"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── Member Grid ── */}
        <section className="team-grid-section">
          <div className="container">
            {loading ? (
              <div className="team-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="team-card team-card--skeleton" aria-hidden="true">
                    <div className="skeleton-box" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1rem' }} />
                    <div className="skeleton-box" style={{ height: 16, marginBottom: 8, width: '60%', margin: '0 auto 8px' }} />
                    <div className="skeleton-box" style={{ height: 12, width: '40%', margin: '0 auto' }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="team-empty">
                <span style={{ fontSize: '3rem' }}>🔍</span>
                <p>No team members found matching your search.</p>
              </div>
            ) : (
              <div className="team-grid">
                {filtered.map(member => {
                  const role = roleInfo(member.role);
                  const isHovered = hoveredId === member.id;
                  const pp = member.platform_profiles || {};
                  const joinYear = member.created_at ? new Date(member.created_at).getFullYear() : '—';

                  return (
                    <article
                      key={member.id}
                      className={`team-card${isHovered ? ' team-card--hovered' : ''}`}
                      onMouseEnter={() => setHoveredId(member.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      aria-label={`Team member: ${member.full_name || member.username}`}
                    >
                      {/* Role badge */}
                      <div className="team-card-role-badge" style={{ background: `${role.color}22`, color: role.color, borderColor: `${role.color}44` }}>
                        {role.label}
                      </div>

                      {/* Avatar */}
                      <div className="team-card-avatar-wrapper" style={{ borderColor: role.color }}>
                        <img
                          src={`/avatars/${member.avatar_url || 'avatar_0.svg'}`}
                          alt={member.full_name || member.username}
                          width={80}
                          height={80}
                          className="team-card-avatar"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/avatars/avatar_0.svg'; }}
                        />
                      </div>

                      {/* Name */}
                      <h3 className="team-card-name">{member.full_name || member.username}</h3>
                      <p className="team-card-username">@{member.username}</p>

                      {/* Expertise tags */}
                      {member.expertise && member.expertise.length > 0 && (
                        <div className="team-card-tags">
                          {member.expertise.map(tag => (
                            <span key={tag} className="team-card-tag">{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Contribution stats */}
                      <div className="team-card-stats">
                        <div className="team-card-stat">
                          <span className="team-card-stat-val">{member.problemCount || 0}</span>
                          <span className="team-card-stat-lbl">Problems</span>
                        </div>
                        <div className="team-card-stat-divider" />
                        <div className="team-card-stat">
                          <span className="team-card-stat-val">{member.blogCount || 0}</span>
                          <span className="team-card-stat-lbl">Blogs</span>
                        </div>
                        <div className="team-card-stat-divider" />
                        <div className="team-card-stat">
                          <span className="team-card-stat-val">{joinYear}</span>
                          <span className="team-card-stat-lbl">Joined</span>
                        </div>
                      </div>

                      {/* Hover expanded section */}
                      <div className={`team-card-expanded${isHovered ? ' team-card-expanded--visible' : ''}`}>
                        {member.bio && (
                          <p className="team-card-bio">{member.bio}</p>
                        )}

                        {/* Social links */}
                        <div className="team-card-socials">
                          {pp.github && (
                            <a href={`https://github.com/${pp.github}`} target="_blank" rel="noopener noreferrer" className="team-card-social" aria-label="GitHub">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            </a>
                          )}
                          {pp.linkedin && (
                            <a href={`https://linkedin.com/in/${pp.linkedin}`} target="_blank" rel="noopener noreferrer" className="team-card-social" aria-label="LinkedIn">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            </a>
                          )}
                          {pp.twitter && (
                            <a href={`https://twitter.com/${pp.twitter}`} target="_blank" rel="noopener noreferrer" className="team-card-social" aria-label="Twitter/X">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zM17.083 20.001h1.834L7.017 4.126H5.054L17.083 20.001z"/></svg>
                            </a>
                          )}
                          <Link href={`/profile/${member.username}`} className="team-card-social team-card-social--profile" aria-label="View profile">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Profile
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Join CTA ── */}
        <section className="team-cta-section">
          <div className="container team-cta">
            <div className="team-cta-card">
              <h2 className="team-cta-title">Want to be part of the team?</h2>
              <p className="team-cta-subtitle">
                Contribute problems, write blogs, help moderate, or mentor students. We're always looking for passionate people.
              </p>
              <div className="team-cta-steps">
                <div className="team-cta-step">
                  <span className="team-cta-step-num">01</span>
                  <span>Write a blog post or contribute a problem</span>
                </div>
                <div className="team-cta-step">
                  <span className="team-cta-step-num">02</span>
                  <span>Stay active on the leaderboard & community</span>
                </div>
                <div className="team-cta-step">
                  <span className="team-cta-step-num">03</span>
                  <span>Apply or get nominated by an existing member</span>
                </div>
              </div>
              <div className="team-cta-actions">
                <Link href="/blogs" className="btn btn-primary">
                  Write a Blog
                </Link>
                <Link href="/leaderboard" className="btn btn-ghost" style={{ border: '1px solid var(--color-border)' }}>
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
