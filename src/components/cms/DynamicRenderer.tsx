'use client';

import { SectionHero } from './SectionHero';
import { SectionFeatures } from './SectionFeatures';
import { SectionStats } from './SectionStats';
import { SectionCTA } from './SectionCTA';
import { AnnouncementBanner } from './AnnouncementBanner';
import type { CmsHomepageSection } from '@/types/cms';

interface DynamicRendererProps {
  sections: CmsHomepageSection[];
  announcements?: any[];
}

export function DynamicRenderer({ sections, announcements = [] }: DynamicRendererProps) {
  // Sort sections by section_order
  const sortedSections = [...sections]
    .filter(s => s.is_active)
    .sort((a, b) => a.section_order - b.section_order);

  return (
    <>
      {sortedSections.map((section) => {
        switch (section.section_key) {
          case 'hero':
            return (
              <div key={section.id}>
                <SectionHero
                  title={section.section_title}
                  subtitle={section.section_subtitle}
                  data={section.content_data}
                />
                
                {/* Render announcements immediately after the Hero section */}
                {announcements.length > 0 && <AnnouncementBanner announcements={announcements} />}
              </div>
            );
          case 'features':
            return (
              <SectionFeatures
                key={section.id}
                title={section.section_title}
                subtitle={section.section_subtitle}
                cards={section.content_data?.cards}
              />
            );
          case 'stats':
            return (
              <SectionStats
                key={section.id}
                title={section.section_title}
                subtitle={section.section_subtitle}
                items={section.content_data?.stats}
              />
            );
          case 'cta':
            return (
              <SectionCTA
                key={section.id}
                title={section.section_title}
                subtitle={section.section_subtitle}
                data={section.content_data}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
