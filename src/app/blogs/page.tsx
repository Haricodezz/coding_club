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
  
  const { data: blogs } = await supabase
    .from('cms_blogs')
    .select('*, author:users(username, avatar_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const blogList: any[] = blogs || [];

  return (
    <div className="page-wrapper" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <AnimatedGridBg />

      <div className="container" style={{ position: 'relative', zIndex: 10, padding: '4rem 0 6rem' }}>
        
        {/* Header */}
        <div className="page-header text-center" style={{ marginBottom: '4rem' }}>
          <p className="eyebrow">📚 Coding Club Journal</p>
          <h1 style={{ fontSize: '3rem' }}>Articles & <span className="gradient-text">Insights</span></h1>
          <p style={{ maxWidth: '600px', margin: '0 auto' }}>
            Learn new concepts, deep dive into data structures, and keep track of system announcements.
          </p>
        </div>

        {/* Interactive Blogs Grid with Tag Filter */}
        <BlogListClient blogs={blogList} />

      </div>
    </div>
  );
}
