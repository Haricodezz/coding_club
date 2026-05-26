import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AnimatedGridBg } from '@/components/ui/AnimatedGridBg';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: blog } = await supabase
    .from('cms_blogs')
    .select('title, summary')
    .eq('slug', slug)
    .single();

  if (!blog) return { title: 'Article Not Found' };

  return {
    title: `${blog.title} — Coding Club Blog`,
    description: blog.summary || 'Read this post on our platform.',
  };
}

export default async function BlogPostDetailedPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  
  const { data: blog } = await supabase
    .from('cms_blogs')
    .select('*, author:users(username, avatar_url)')
    .eq('slug', slug)
    .single();

  if (!blog) {
    notFound();
  }

  return (
    <div className="page-wrapper" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <AnimatedGridBg />

      <div className="container" style={{ position: 'relative', zIndex: 10, padding: '4rem 0 8rem' }}>
        
        {/* Back Link */}
        <Link href="/blogs" style={{ color: 'var(--accent-3)', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2.5rem' }}>
          &larr; Back to Journal
        </Link>

        {/* Article Container */}
        <article className="glass" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2.5rem', background: 'rgba(22, 22, 30, 0.7)' }}>
          
          {/* Tags */}
          <div className="flex gap-1 wrap" style={{ marginBottom: '1.25rem' }}>
            {(blog.tags || []).map((t: string) => (
              <span key={t} className="badge badge-easy">{t}</span>
            ))}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', marginBottom: '1.25rem', lineHeight: 1.15 }}>
            {blog.title}
          </h1>

          {/* Author / Date Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <img
              src={`/avatars/${blog.author?.avatar_url || 'avatar_0.svg'}`}
              alt={blog.author?.username || 'Author'}
              style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid var(--accent)' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{blog.author?.username || 'Club Admin'}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                Published on {blog.created_at ? new Date(blog.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Unknown Date'}
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div 
            className="article-content"
            style={{
              fontSize: '1.08rem',
              lineHeight: 1.8,
              color: '#cbd5e1',
              whiteSpace: 'pre-wrap'
            }}
          >
            {blog.content}
          </div>

        </article>

      </div>
    </div>
  );
}
