'use client';

import { HeroScene } from './HeroScene';

interface SectionHeroProps {
  title?: string;
  subtitle?: string;
  data: {
    badge?: string;
    primary_btn_text?: string;
    primary_btn_link?: string;
    secondary_btn_text?: string;
    secondary_btn_link?: string;
    editor_filename?: string;
    editor_code?: string;
  };
}

export function SectionHero({ title, subtitle, data }: SectionHeroProps) {
  const badgeText = data.badge?.includes('200 Students') ? '🎓 Open to all students' : data.badge;

  return (
    <HeroScene
      title={title}
      subtitle={subtitle}
      badge={badgeText}
      primaryBtnText={data.primary_btn_text}
      primaryBtnLink={data.primary_btn_link}
      secondaryBtnText={data.secondary_btn_text}
      secondaryBtnLink={data.secondary_btn_link}
      data={data}
    />
  );
}
