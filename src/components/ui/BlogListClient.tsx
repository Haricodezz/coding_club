'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

interface BlogListClientProps {
  blogs: any[];
}

export function BlogListClient({ blogs }: BlogListClientProps) {
  const [selectedTag, setSelectedTag] = useState<string>('All');

  // Extract all unique tags
  const tags = useMemo(() => {
    const allTags = new Set<string>();
    blogs.forEach(blog => {
      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach((tag: string) => allTags.add(tag));
      }
    });
    return ['All', ...Array.from(allTags)];
  }, [blogs]);

  // Filter blogs
  const filteredBlogs = useMemo(() => {
    if (selectedTag === 'All') return blogs;
    return blogs.filter(blog => blog.tags?.includes(selectedTag));
  }, [blogs, selectedTag]);

  return (
    <>
      {/* Horizontal Tags Filter */}
      {tags.length > 1 && (
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center' }}>
          <div 
            style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              overflowX: 'auto', 
              paddingBottom: '1rem',
              maxWidth: '100%',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
            className="hide-scrollbar"
          >
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`btn ${selectedTag === tag ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: '20px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  border: selectedTag === tag ? 'none' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Blogs Grid */}
      {filteredBlogs.length === 0 ? (
        <div className="text-center" style={{ padding: '4rem' }}>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No blog posts available for this category.</p>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: '2rem' }}>
          {filteredBlogs.map((blog, idx) => (
            <GlassCard
              key={blog.id}
              delay={idx * 100}
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: 'rgba(22, 22, 30, 0.45)'
              }}
            >
              {/* Optional image thumbnail */}
              {blog.thumbnail_url && (
                <div style={{ height: '180px', width: '100%', overflow: 'hidden', position: 'relative', borderBottom: '1px solid var(--color-border)', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
                  <img
                    src={blog.thumbnail_url}
                    alt={blog.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
              
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="flex gap-1 wrap" style={{ marginBottom: '0.75rem' }}>
                  {(blog.tags || []).map((t: string) => (
                    <span key={t} className="badge badge-easy" style={{ fontSize: '0.65rem' }}>{t}</span>
                  ))}
                </div>

                <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem', fontWeight: 700, lineHeight: 1.3 }}>
                  {blog.title}
                </h3>

                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
                  {blog.summary || 'Click below to read this article.'}
                </p>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center gap-2">
                    <img
                      src={`/avatars/${blog.author?.avatar_url || 'avatar_0.svg'}`}
                      alt={blog.author?.username || 'Author'}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--accent)' }}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#a8b3cf', fontWeight: 500 }}>
                      {blog.author?.username || 'Club Admin'}
                    </span>
                  </div>

                  <Link href={`/blogs/${blog.slug}`} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-3)' }}>
                    Read Post &rarr;
                  </Link>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </>
  );
}
