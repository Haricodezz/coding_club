import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedGridBg } from '@/components/ui/AnimatedGridBg';
import { BlogListClient } from '@/components/ui/BlogListClient';
import type { CmsBlog } from '@/types/cms';

export const metadata = {
  title: 'Blog & News — Coding Club',
  description: 'Stay updated with tutorials, competitive coding tricks, algorithms, and event announcements.',
};

export default async function PublicBlogsPage() {
  const supabase = await createServerSupabaseClient();
  const sb = supabase as any;
  
  // Get current session for CTA
  const { data: { session } } = await supabase.auth.getSession();

  const { data: blogs } = await supabase
    .from('cms_blogs')
    .select('*, author:users(username, avatar_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  // Get featured user-submitted blogs
  const { data: featuredUserBlogs } = await sb
    .from('user_blogs')
    .select('id, title, slug, summary, tags, cover_image, is_featured, created_at, author:users!user_blogs_author_id_fkey(username, avatar_url)')
    .eq('status', 'approved')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(3);

  // Get recent approved user blogs
  const { data: recentUserBlogs } = await sb
    .from('user_blogs')
    .select('id, title, slug, summary, tags, cover_image, created_at, author:users!user_blogs_author_id_fkey(username, avatar_url)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(6);

  const blogList: any[] = blogs || [];

  return (
    <div className="page-wrapper" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <AnimatedGridBg />

      <div className="container" style={{ position: 'relative', zIndex: 10, padding: '4rem 0 6rem' }}>
        
        {/* Header */}
        <div className="page-header text-center" style={{ marginBottom: '3rem' }}>
          <p className="eyebrow">📚 Coding Club Journal</p>
          <h1 style={{ fontSize: '3rem' }}>Articles & <span className="gradient-text">Insights</span></h1>
          <p style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            Learn new concepts, deep dive into data structures, and keep track of system announcements.
          </p>

          {/* Write CTA for logged-in users */}
          {session && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/blogs/write" className="btn btn-primary">
                ✍️ Write a Blog
              </Link>
              <Link href="/blogs/my-blogs" className="btn btn-ghost">
                📚 My Blogs
              </Link>
            </div>
          )}
          {!session && (
            <Link href="/login" className="btn btn-secondary">
              Sign in to write a blog →
            </Link>
          )}
        </div>

        {/* Featured Community Blogs */}
        {featuredUserBlogs && featuredUserBlogs.length > 0 && (
          <div style={{ marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Featured Community Posts</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {featuredUserBlogs.map((blog: any) => (
                <Link
                  key={blog.id}
                  href={`/blogs/${blog.slug}`}
                  className="card"
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderColor: 'rgba(245,158,11,0.25)' }}
                >
                  {blog.cover_image && (
                    <img src={blog.cover_image} alt={blog.title} style={{ borderRadius: '8px', height: '140px', objectFit: 'cover', width: '100%' }} />
                  )}
                  <div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: '99px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 700 }}>⭐ Featured</span>
                    </div>
                    <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 0.25rem', fontWeight: 700 }}>{blog.title}</h3>
                    {blog.summary && <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{blog.summary}</p>}
                    <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0.5rem 0 0' }}>by @{blog.author?.username || 'student'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Blogs Grid with Tag Filter */}
        <BlogListClient blogs={blogList} />

      </div>
    </div>
  );
}

