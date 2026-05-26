import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Key. Use node --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const events = [
  {
    title: 'Spring Coding Hackathon',
    description: 'Join us for a 48-hour coding marathon! Build amazing projects, meet other developers, and win great prizes.',
    thumbnail_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
    event_date: '2026-06-15T09:00:00Z',
    location: 'Main Campus Library / Online',
    registration_link: 'https://lu.ma/hackathon',
    is_published: true
  },
  {
    title: 'Intro to React Workshop',
    description: 'A hands-on workshop covering the basics of React, Hooks, and Component design.',
    thumbnail_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    event_date: '2026-07-10T14:00:00Z',
    location: 'CS Building Room 402',
    registration_link: 'https://lu.ma/react-workshop',
    is_published: true
  },
  {
    title: 'Alumni Tech Panel',
    description: 'Hear from our alumni working at top tech companies about their journey and advice for students.',
    thumbnail_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    event_date: '2026-08-05T18:00:00Z',
    location: 'Virtual Zoom Event',
    registration_link: 'https://zoom.us/webinar/register/12345',
    is_published: true
  }
];

const teamMembers = [
  {
    name: 'Alice Chen',
    role: 'President',
    avatar_url: 'https://i.pravatar.cc/150?u=alice',
    github_url: 'https://github.com/alice',
    linkedin_url: 'https://linkedin.com/in/alice',
    bio: 'CS Senior passionate about web development and community building.',
    display_order: 1,
    is_active: true
  },
  {
    name: 'Bob Smith',
    role: 'Vice President',
    avatar_url: 'https://i.pravatar.cc/150?u=bob',
    github_url: 'https://github.com/bob',
    linkedin_url: 'https://linkedin.com/in/bob',
    bio: 'AI enthusiast and competitive programmer.',
    display_order: 2,
    is_active: true
  },
  {
    name: 'Charlie Davis',
    role: 'Event Coordinator',
    avatar_url: 'https://i.pravatar.cc/150?u=charlie',
    github_url: 'https://github.com/charlie',
    bio: 'Organizing the best hackathons and workshops.',
    display_order: 3,
    is_active: true
  }
];

const announcements = [
  {
    title: 'Welcome to the New Platform!',
    content: 'We have completely revamped our club platform. Explore learning paths, solve daily challenges, and track your progress on the leaderboard!',
    type: 'success',
    is_active: true
  },
  {
    title: 'Upcoming Server Maintenance',
    content: 'The platform will be down for scheduled maintenance on Sunday from 2 AM to 4 AM.',
    type: 'warning',
    is_active: true
  }
];

async function seed() {
  console.log('Seeding other CMS data...');
  
  // Seed Events
  const { data: eData, error: eErr } = await supabase.from('cms_events').insert(events).select();
  if (eErr) console.error('Error inserting events:', eErr);
  else console.log(`Seeded ${eData.length} events!`);

  // Seed Team
  const { data: tData, error: tErr } = await supabase.from('cms_team_members').insert(teamMembers).select();
  if (tErr) console.error('Error inserting team members:', tErr);
  else console.log(`Seeded ${tData.length} team members!`);

  // Seed Announcements
  const { data: aData, error: aErr } = await supabase.from('cms_announcements').insert(announcements).select();
  if (aErr) console.error('Error inserting announcements:', aErr);
  else console.log(`Seeded ${aData.length} announcements!`);
}

seed();
