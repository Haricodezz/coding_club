import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Key. Use node --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const learningPaths = [
  {
    slug: 'intro-to-react',
    title: 'Introduction to React',
    description: 'Master the fundamentals of React, from components to state management. Perfect for beginners who want to build dynamic UIs.',
    difficulty_level: 'Beginner',
    resource_ids: [1, 2, 3],
    is_published: true,
    display_order: 10,
    banner_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80'
  },
  {
    slug: 'advanced-algorithms',
    title: 'Advanced Algorithms & Data Structures',
    description: 'Prepare for top-tier coding interviews by mastering dynamic programming, graph algorithms, and advanced data structures.',
    difficulty_level: 'Advanced',
    resource_ids: [4, 5, 6, 7],
    is_published: true,
    display_order: 20,
    banner_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80'
  },
  {
    slug: 'full-stack-nextjs',
    title: 'Full-Stack Development with Next.js',
    description: 'Learn how to build production-ready applications with Next.js App Router, Server Actions, and Supabase integration.',
    difficulty_level: 'Intermediate',
    resource_ids: [8, 9],
    is_published: true,
    display_order: 30,
    banner_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'
  },
  {
    slug: 'machine-learning-basics',
    title: 'Machine Learning 101',
    description: 'An introductory path to artificial intelligence and machine learning. Learn to build models using Python, scikit-learn, and TensorFlow.',
    difficulty_level: 'Beginner',
    resource_ids: [10, 11, 12],
    is_published: false,
    display_order: 40,
    banner_url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80'
  }
];

async function seed() {
  console.log('Seeding Learning Paths...');
  
  // First clear existing
  const { error: deleteError } = await supabase.from('cms_learning_paths').delete().neq('id', -1);
  if (deleteError) {
    console.error('Error clearing old paths:', deleteError);
  }
  
  const { data, error } = await supabase
    .from('cms_learning_paths')
    .insert(learningPaths)
    .select();

  if (error) {
    console.error('Error inserting paths:', error);
  } else {
    console.log(`Successfully seeded ${data.length} learning paths!`);
  }
}

seed();
