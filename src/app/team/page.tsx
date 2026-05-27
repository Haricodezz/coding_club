'use client';

import { useEffect, useState, useMemo } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import type { CmsTeamMember, CmsTeamSettings } from '@/types/cms';

// ------------------------------------------------------------------
// Helper Components
// ------------------------------------------------------------------

function SocialLinks({ member }: { member: CmsTeamMember }) {
  const [copied, setCopied] = useState(false);

  if (!member.contact_visible) return null;

  const handleDiscord = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (member.discord_handle) {
      navigator.clipboard.writeText(member.discord_handle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsAppUrl = member.whatsapp_number 
    ? `https://wa.me/${member.whatsapp_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${member.name}, I'd like to connect regarding CodingClub.`)}`
    : '#';

  return (
    <div className="flex gap-2 items-center flex-wrap mt-3" onClick={e => e.stopPropagation()}>
      {member.github_url && (
        <a href={member.github_url} target="_blank" rel="noreferrer" className="team-social-icon" aria-label="GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
      )}
      {member.linkedin_url && (
        <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="team-social-icon" aria-label="LinkedIn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      )}
      {member.email && (
        <a href={`mailto:${member.email}`} className="team-social-icon" aria-label="Email">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </a>
      )}
      {member.whatsapp_number && (
        <a href={whatsAppUrl} target="_blank" rel="noreferrer" className="team-social-icon" style={{ color: '#25D366' }} aria-label="WhatsApp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        </a>
      )}
      {member.discord_handle && (
        <button onClick={handleDiscord} className="team-social-icon" style={{ color: '#5865F2' }} aria-label="Discord">
          {copied ? (
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Copied!</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
          )}
        </button>
      )}
      {member.website_url && (
        <a href={member.website_url} target="_blank" rel="noreferrer" className="team-social-icon" aria-label="Website">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        </a>
      )}
    </div>
  );
}

function TeamMemberModal({ member, onClose }: { member: CmsTeamMember, onClose: () => void }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div className="team-modal-backdrop" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(5px)'
    }}>
      <div className="team-modal-content card glass animate-fade-in" onClick={e => e.stopPropagation()} style={{
        maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative', padding: 0
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)',
          border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
        }}>✕</button>

        {/* Modal Header & Cover */}
        <div style={{ 
          height: '150px', 
          background: member.background_cover_url ? `url(${member.background_cover_url}) center/cover` : 'var(--gradient-primary)',
          borderRadius: 'var(--radius) var(--radius) 0 0'
        }} />
        
        <div style={{ padding: '0 2rem 2rem 2rem', marginTop: '-50px' }}>
          <img src={member.avatar_url || '/avatars/avatar_0.svg'} alt={member.name} style={{
            width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--color-surface)',
            objectFit: 'cover', background: 'var(--color-surface)', marginBottom: '1rem'
          }} />
          
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h2 style={{ margin: 0, fontSize: '2rem' }}>{member.name}</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--brand-primary)', fontWeight: 600 }}>
                {member.title ? `${member.title} · ${member.role}` : member.role}
              </p>
              {member.department && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{member.department}</p>}
            </div>
            
            <SocialLinks member={member} />
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>About</h4>
            <div style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {member.bio || 'No biography available.'}
            </div>
          </div>

          {member.expertise_tags && member.expertise_tags.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Expertise & Skills</h4>
              <div className="flex gap-2 flex-wrap">
                {member.expertise_tags.map(tag => (
                  <span key={tag} className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--color-border)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main Page Component
// ------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'order', label: 'Default Ordering' },
  { value: 'name', label: 'Alphabetical' },
  { value: 'join_date', label: 'Join Date' }
];

export default function TeamPage() {
  const [members, setMembers] = useState<CmsTeamMember[]>([]);
  const [settings, setSettings] = useState<CmsTeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState('order');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMember, setSelectedMember] = useState<CmsTeamMember | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const supabase = getSupabase();
        
        // Fetch public members
        const { data: teamData, error: teamErr } = await (supabase as any)
          .from('cms_team_members')
          .select('*')
          .eq('is_active', true)
          .eq('is_archived', false)
          .order('display_order', { ascending: true });

        if (teamErr) {
          console.warn('Could not fetch team members. Please ensure migration is run:', teamErr.message || teamErr);
        } else {
          setMembers(teamData || []);
        }

        // Fetch settings
        const { data: settingsData, error: settingsErr } = await (supabase as any)
          .from('cms_team_settings')
          .select('*')
          .single();

        if (settingsErr && settingsErr.code !== 'PGRST116') {
          console.warn('Could not fetch team settings:', settingsErr.message || settingsErr);
        } else if (settingsData) {
          setSettings(settingsData);
        }
        
      } catch (err: any) {
        console.error('Error fetching team:', err?.message || err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const filtered = useMemo(() => {
    let result = [...members];

    if (filterRole !== 'all') {
      result = result.filter(m => m.role === filterRole || (filterRole === 'leadership' && ['super_admin', 'president', 'vice_president'].includes(m.role)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q) ||
        (m.expertise_tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'join_date') {
      result.sort((a, b) => new Date(a.join_date || '').getTime() - new Date(b.join_date || '').getTime());
    } else {
      result.sort((a, b) => a.display_order - b.display_order);
    }

    return result;
  }, [members, filterRole, sortBy, searchQuery]);

  const featuredMembers = members.filter(m => settings?.featured_member_ids?.includes(m.id)) || [];

  return (
    <>
      <title>{settings?.page_title || 'Meet the Team'} — CodingClub</title>

      <div className="team-page" id="main-content">

        {/* ── Hero ── */}
        <section className="team-hero" style={{ background: settings?.hero_bg_url ? `linear-gradient(to bottom, rgba(0,0,0,0.8), var(--bg-default)), url(${settings.hero_bg_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="team-hero-bg" aria-hidden="true" />
          <div className="container team-hero-content animate-fade-in">
            <div className="team-hero-badge">Our People</div>
            <h1 className="team-hero-title">
              {settings?.page_title ? (
                <>
                  {settings.page_title.split('Team')[0]} <span className="team-hero-gradient">Team</span>
                </>
              ) : (
                <>Meet the <span className="team-hero-gradient">CodingClub</span> Team</>
              )}
            </h1>
            <p className="team-hero-subtitle">
              {settings?.page_description || 'The passionate people behind the platform — mentors, moderators, content creators, and builders.'}
            </p>

            <div className="team-stats-bar" style={{ marginTop: '2rem' }}>
              <div className="team-stat">
                <span className="team-stat-value">{loading ? '—' : members.length}</span>
                <span className="team-stat-label">Active Members</span>
              </div>
              <div className="team-stat-divider" />
              <div className="team-stat">
                <span className="team-stat-value">{loading ? '—' : [...new Set(members.flatMap(m => m.expertise_tags || []))].length}</span>
                <span className="team-stat-label">Expertise Domains</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Filter Bar ── */}
        <section className="team-filters-section">
          <div className="container team-filters">
            <div className="team-search-wrapper">
              <svg className="team-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                className="team-search-input"
                placeholder="Search by name, role, skill..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="team-role-filters" role="group">
              {[
                { value: 'all', label: 'All' },
                { value: 'leadership', label: 'Leadership' },
                { value: 'mentor', label: 'Mentors' },
                { value: 'team', label: 'Core Team' },
              ].map(f => (
                <button
                  key={f.value}
                  className={`team-filter-pill${filterRole === f.value ? ' active' : ''}`}
                  onClick={() => setFilterRole(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select className="team-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ── Member Grid ── */}
        <section className="team-grid-section" style={{ minHeight: '50vh' }}>
          <div className="container">
            {loading ? (
              <div className="team-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="team-card team-card--skeleton">
                    <div className="skeleton-box" style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 1rem' }} />
                    <div className="skeleton-box" style={{ height: 20, marginBottom: 8, width: '60%', margin: '0 auto 8px' }} />
                    <div className="skeleton-box" style={{ height: 14, width: '40%', margin: '0 auto' }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="team-empty" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔍</span>
                <p style={{ fontSize: '1.2rem' }}>No team members found matching your search.</p>
              </div>
            ) : (
              <div className="team-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {filtered.map(member => {
                  const isLeadership = ['super_admin', 'president', 'vice_president'].includes(member.role);
                  
                  return (
                    <article
                      key={member.id}
                      className="team-card animate-fade-in"
                      onClick={() => setSelectedMember(member)}
                      style={{ 
                        cursor: 'pointer', 
                        padding: '2rem 1.5rem', 
                        background: 'var(--color-surface)',
                        border: isLeadership ? '1px solid var(--brand-primary)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                        position: 'relative', overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* Decorative Background for Leadership */}
                      {isLeadership && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--gradient-primary)' }} />
                      )}

                      <img
                        src={member.avatar_url || '/avatars/avatar_0.svg'}
                        alt={member.name}
                        style={{ 
                          width: 120, height: 120, borderRadius: '50%', objectFit: 'cover',
                          border: `3px solid ${isLeadership ? 'var(--brand-primary)' : 'var(--color-surface-2)'}`,
                          marginBottom: '1rem'
                        }}
                      />

                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{member.name}</h3>
                      <p style={{ margin: '0.25rem 0 1rem 0', color: isLeadership ? 'var(--brand-primary)' : 'var(--text-secondary)', fontWeight: isLeadership ? 600 : 400, fontSize: '0.95rem' }}>
                        {member.title || member.role.replace('_', ' ').toUpperCase()}
                      </p>

                      {member.expertise_tags && member.expertise_tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-center" style={{ marginBottom: '1.5rem' }}>
                          {member.expertise_tags.slice(0, 3).map(tag => (
                            <span key={tag} className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                              {tag}
                            </span>
                          ))}
                          {member.expertise_tags.length > 3 && (
                            <span className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--color-surface-2)' }}>
                              +{member.expertise_tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div style={{ marginTop: 'auto', width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <SocialLinks member={member} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Join CTA ── */}
        <section className="team-cta-section" style={{ padding: '6rem 0', background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
          <div className="container" style={{ textAlign: 'center', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Want to be part of the team?
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
              Contribute problems, write blogs, help moderate, or mentor students. We're always looking for passionate people to join our mission of democratizing tech education.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/blogs" className="btn btn-primary btn-lg">Write a Blog</Link>
              <Link href="/practice" className="btn btn-ghost btn-lg" style={{ border: '1px solid var(--color-border)' }}>Contribute Problems</Link>
            </div>
          </div>
        </section>

      </div>

      {selectedMember && (
        <TeamMemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </>
  );
}
