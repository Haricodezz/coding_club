import { AnimatedGridBg } from '@/components/ui/AnimatedGridBg';
import { HeroScene } from '@/components/cms/HeroScene';
import { SectionFeatures } from '@/components/cms/SectionFeatures';
import { SectionStats } from '@/components/cms/SectionStats';
import { SectionCTA } from '@/components/cms/SectionCTA';
import { DynamicRenderer } from '@/components/cms/DynamicRenderer';
import { AnnouncementBanner } from '@/components/cms/AnnouncementBanner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Coding Club — Learn. Compete. Grow.',
  description:
    'A competitive coding platform for students with daily challenges, live IDE, leaderboards, and curated learning resources.',
};

/* ─── Fallback content shown when CMS DB has no sections yet ─── */
function FallbackHome({ announcements = [] }: { announcements?: any[] }) {
  return (
    <>
      <HeroScene
        badge="🎓 Open for Students — Join Free"
        primaryBtnText="Get Started 🚀"
        primaryBtnLink="/login"
        secondaryBtnText="View Leaderboard"
        secondaryBtnLink="/leaderboard"
      />

      <AnnouncementBanner announcements={announcements} />

      <SectionFeatures
        title="Everything You Need to Level Up"
        subtitle="A unified platform for coding practice, competitions, and peer learning."
        cards={[
          {
            icon: '⚡',
            title: 'Daily Challenges',
            desc:
              'One curated problem every day. Solve it, earn points, and climb the leaderboard.',
          },
          {
            icon: '🖥️',
            title: 'Live IDE',
            desc:
              'Write and run code in Python, C++, Java, JS, and more — right in your browser.',
          },
          {
            icon: '🏆',
            title: 'Contests',
            desc:
              'Timed competitions synced with HackerRank. Compete with peers in real-time.',
          },
          {
            icon: '📚',
            title: 'Learning Paths',
            desc:
              'Curated resources, notes, and roadmaps to go from beginner to competitive coder.',
          },
          {
            icon: '📈',
            title: 'Leaderboard',
            desc:
              'Live rankings updated after every submission. See where you stand instantly.',
          },
          {
            icon: '🤝',
            title: 'Community',
            desc:
              'Discuss problems, share solutions, and grow together with fellow coders.',
          },
        ]}
      />

      <SectionStats
        title="Our Community by the Numbers"
        items={[
          { label: 'Active Members', value: '200+' },
          { label: 'Problems Solved', value: '4,200+' },
          { label: 'Contests Held', value: '18' },
          { label: 'Learning Resources', value: '50+' },
        ]}
      />

      <SectionCTA
        title="Ready to Start Coding?"
        subtitle="Join hundreds of students sharpening their skills every day."
        data={{
          btn_text: 'Create Free Account',
          btn_link: '/login',
        }}
      />
    </>
  );
}

/* ─── Page ─── */
export default async function HomePage() {
  let homeSections: any[] = [];
  let activeAnnouncements: any[] = [];

  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = await createServerSupabaseClient();

    const [{ data: sections }, { data: announcements }] = await Promise.all([
      supabase
        .from('cms_homepage_sections')
        .select('*')
        .eq('is_active', true)
        .order('section_order', { ascending: true }),
      supabase
        .from('cms_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);

    homeSections = sections ?? [];
    activeAnnouncements = announcements ?? [];
  } catch {
    /* Supabase unavailable — fallback content renders below */
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <AnimatedGridBg />

      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* CMS sections if they exist, otherwise full fallback */}
        {homeSections.length > 0 ? (
          <DynamicRenderer sections={homeSections} announcements={activeAnnouncements} />
        ) : (
          <FallbackHome announcements={activeAnnouncements} />
        )}
      </div>
    </div>
  );
}
