import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars. Use: node --env-file=.env.local seed-resources.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Step 1 — Apply schema
async function applySchema() {
  console.log('Applying schema-v4.sql...');
  const sql = readFileSync('./supabase/schema-v4.sql', 'utf8');

  // Split by statement endings (rough split, works for our clean SQL)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).throwOnError();
    if (error) {
      // Ignore "already exists" errors
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.warn('WARN:', error.message.slice(0, 120));
      }
    }
  }
  console.log('Schema applied (or already up to date).');
}

// Step 2 — Seed courses, modules, and items
async function seedData() {
  console.log('\nSeeding resource courses...');

  // Create 3 courses
  const { data: courses, error: courseErr } = await supabase
    .from('resource_courses')
    .insert([
      {
        slug: 'dsa-complete-roadmap',
        title: 'DSA Complete Roadmap',
        description: 'A comprehensive, structured roadmap to master Data Structures and Algorithms — from arrays to dynamic programming. Curated from the best free YouTube series and practice platforms.',
        banner_url: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&q=80',
        difficulty_level: 'Intermediate',
        is_published: true,
        display_order: 10,
      },
      {
        slug: 'web-dev-fundamentals',
        title: 'Full-Stack Web Dev Fundamentals',
        description: 'Build production-grade web apps from scratch. Covers HTML, CSS, JavaScript, React, Node.js, and deploying to the cloud — all using free resources.',
        banner_url: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800&q=80',
        difficulty_level: 'Beginner',
        is_published: true,
        display_order: 20,
      },
      {
        slug: 'system-design-mastery',
        title: 'System Design Mastery',
        description: 'Learn to design scalable, resilient systems. Covers load balancing, databases, caching, microservices, and real-world architecture walkthroughs.',
        banner_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
        difficulty_level: 'Advanced',
        is_published: true,
        display_order: 30,
      },
    ])
    .select();

  if (courseErr) {
    console.error('Error inserting courses:', courseErr.message);
    return;
  }
  console.log(`Created ${courses.length} courses!`);

  const dsaCourse = courses.find(c => c.slug === 'dsa-complete-roadmap');
  const webCourse = courses.find(c => c.slug === 'web-dev-fundamentals');
  const sysCourse = courses.find(c => c.slug === 'system-design-mastery');

  // Seed modules
  console.log('\nSeeding modules...');
  const { data: modules, error: modErr } = await supabase
    .from('resource_modules')
    .insert([
      // DSA
      { course_id: dsaCourse.id, title: 'Arrays & Strings', display_order: 1, description: 'Foundation of every algorithm. Master traversal, two pointers, and sliding window.' },
      { course_id: dsaCourse.id, title: 'Linked Lists', display_order: 2, description: 'Single, double, and circular linked lists with classic interview problems.' },
      { course_id: dsaCourse.id, title: 'Trees & Binary Search Trees', display_order: 3, description: 'DFS, BFS, tree traversals, and BST operations.' },
      { course_id: dsaCourse.id, title: 'Dynamic Programming', display_order: 4, description: 'Memoization, tabulation, and pattern recognition for complex optimization problems.' },
      // Web Dev
      { course_id: webCourse.id, title: 'HTML & CSS Foundations', display_order: 1, description: 'Semantic HTML5 and modern CSS including Flexbox, Grid, and animations.' },
      { course_id: webCourse.id, title: 'JavaScript Essentials', display_order: 2, description: 'ES6+, async/await, DOM manipulation, and functional programming concepts.' },
      { course_id: webCourse.id, title: 'React & Next.js', display_order: 3, description: 'Components, hooks, state management, and building full-stack apps with Next.js.' },
      // System Design
      { course_id: sysCourse.id, title: 'Scalability Fundamentals', display_order: 1, description: 'Horizontal vs vertical scaling, load balancers, and CAP theorem.' },
      { course_id: sysCourse.id, title: 'Databases & Caching', display_order: 2, description: 'SQL vs NoSQL, indexing, Redis caching, and sharding strategies.' },
    ])
    .select();

  if (modErr) {
    console.error('Error inserting modules:', modErr.message);
    return;
  }
  console.log(`Created ${modules.length} modules!`);

  // Build a lookup map by title
  const modMap = {};
  for (const m of modules) modMap[m.title] = m.id;

  // Seed resource items
  console.log('\nSeeding resource items...');
  const items = [
    // Arrays & Strings
    {
      module_id: modMap['Arrays & Strings'],
      title: 'Arrays Crash Course — Striver',
      slug: 'arrays-crash-course-striver',
      description: 'Complete array problems and patterns explained clearly. Covers basic to medium level array questions.',
      topic_name: 'Arrays',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=37E9ckMDdTk',
      estimated_duration: 60,
      difficulty: 'Beginner',
      display_order: 1,
      is_published: true,
    },
    {
      module_id: modMap['Arrays & Strings'],
      title: 'Two Pointers Pattern — NeetCode',
      slug: 'two-pointers-neetcode',
      description: 'Master the two pointers technique with LeetCode examples.',
      topic_name: 'Two Pointers',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=jzZsG8n2R9A',
      estimated_duration: 40,
      difficulty: 'Intermediate',
      display_order: 2,
      is_published: true,
    },
    {
      module_id: modMap['Arrays & Strings'],
      title: 'LeetCode Arrays Practice',
      slug: 'leetcode-arrays-practice',
      description: 'Curated list of 50 array problems to practice on LeetCode.',
      topic_name: 'Arrays',
      resource_type: 'practice',
      url: 'https://leetcode.com/tag/array/',
      display_order: 3,
      is_published: true,
    },
    // Linked Lists
    {
      module_id: modMap['Linked Lists'],
      title: 'Linked List Full Course — Striver (A2Z)',
      slug: 'linked-list-striver-a2z',
      description: 'Comprehensive coverage of singly, doubly, and circular linked lists with patterns.',
      topic_name: 'Linked Lists',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=70tx7KcMROc',
      estimated_duration: 90,
      difficulty: 'Beginner',
      display_order: 1,
      is_published: true,
    },
    // Trees
    {
      module_id: modMap['Trees & Binary Search Trees'],
      title: 'Binary Trees — Striver (Full Playlist)',
      slug: 'binary-trees-striver',
      description: 'From tree traversals to hard problems — the most complete free binary tree series.',
      topic_name: 'Binary Trees',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=1XC3p2zBK34',
      estimated_duration: 120,
      difficulty: 'Intermediate',
      display_order: 1,
      is_published: true,
    },
    {
      module_id: modMap['Trees & Binary Search Trees'],
      title: 'GeeksForGeeks — BST Docs',
      slug: 'gfg-bst-docs',
      description: 'Official GFG documentation and practice problems for Binary Search Trees.',
      topic_name: 'BST',
      resource_type: 'doc',
      url: 'https://www.geeksforgeeks.org/binary-search-tree-data-structure/',
      display_order: 2,
      is_published: true,
    },
    // DP
    {
      module_id: modMap['Dynamic Programming'],
      title: 'DP Series — Aditya Verma',
      slug: 'dp-aditya-verma',
      description: 'The most popular free DP series in Hindi+English. Pattern-based teaching that makes DP intuitive.',
      topic_name: 'Dynamic Programming',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=nqowUJzG-iM&list=PL_z_8CaSLPWekqhdCPmFohncHwz8TY2Go',
      estimated_duration: 180,
      difficulty: 'Advanced',
      display_order: 1,
      is_published: true,
    },
    // HTML & CSS
    {
      module_id: modMap['HTML & CSS Foundations'],
      title: 'HTML Full Course — freeCodeCamp',
      slug: 'html-full-course-freecodecamp',
      description: 'Complete beginners HTML course. Build real webpages from scratch.',
      topic_name: 'HTML',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=kUMe1FH4CHE',
      estimated_duration: 120,
      difficulty: 'Beginner',
      display_order: 1,
      is_published: true,
    },
    {
      module_id: modMap['HTML & CSS Foundations'],
      title: 'MDN Web Docs — HTML Reference',
      slug: 'mdn-html-reference',
      description: 'The official HTML reference and tutorials from Mozilla. Bookmark this permanently.',
      topic_name: 'HTML',
      resource_type: 'doc',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
      display_order: 2,
      is_published: true,
    },
    // JavaScript
    {
      module_id: modMap['JavaScript Essentials'],
      title: 'JavaScript Full Course — Namaste JS',
      slug: 'namaste-javascript',
      description: 'The most in-depth free JavaScript course covering execution context, closures, prototypes, and async.',
      topic_name: 'JavaScript',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=pN6jk0uUrD8&list=PLlasXeu85E9cQ32gLCvAvr9vNaUccPVNP',
      estimated_duration: 300,
      difficulty: 'Intermediate',
      display_order: 1,
      is_published: true,
    },
    // React
    {
      module_id: modMap['React & Next.js'],
      title: 'React Course — Chai aur Code',
      slug: 'react-chai-aur-code',
      description: 'Production-focused React course with hooks, routing, and project-based learning.',
      topic_name: 'React',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=FxgM9k1rg0Q&list=PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige',
      estimated_duration: 240,
      difficulty: 'Intermediate',
      display_order: 1,
      is_published: true,
    },
    // System Design
    {
      module_id: modMap['Scalability Fundamentals'],
      title: 'System Design Primer — GitHub Repo',
      slug: 'system-design-primer-github',
      description: 'The most starred system design resource on GitHub. Comprehensive notes, diagrams, and examples.',
      topic_name: 'Scalability',
      resource_type: 'github',
      url: 'https://github.com/donnemartin/system-design-primer',
      display_order: 1,
      is_published: true,
    },
    {
      module_id: modMap['Scalability Fundamentals'],
      title: 'System Design Interview — ByteByteGo',
      slug: 'system-design-bytebytego',
      description: 'Visual, animated system design videos covering real-world architectures.',
      topic_name: 'Architecture',
      resource_type: 'youtube',
      url: 'https://www.youtube.com/watch?v=i7twT3x5yv8',
      estimated_duration: 60,
      difficulty: 'Advanced',
      display_order: 2,
      is_published: true,
    },
    {
      module_id: modMap['Databases & Caching'],
      title: 'SQL vs NoSQL Explained',
      slug: 'sql-vs-nosql-explained',
      description: 'Clear comparison with when to use each, backed by real-world examples.',
      topic_name: 'Databases',
      resource_type: 'article',
      url: 'https://www.mongodb.com/nosql-explained/nosql-vs-sql',
      display_order: 1,
      is_published: true,
    },
  ];

  const { data: insertedItems, error: itemErr } = await supabase
    .from('resource_items')
    .insert(items)
    .select();

  if (itemErr) {
    console.error('Error inserting items:', itemErr.message);
    return;
  }
  console.log(`Created ${insertedItems.length} resource items!`);

  console.log('\n✅ All done! The Resources Hub is seeded with real data.');
  console.log('  Navigate to /resources to see the student view.');
  console.log('  Navigate to /admin/resources to manage courses in the admin panel.');
}

async function run() {
  // We skip applySchema() here — run the SQL directly in Supabase Dashboard
  // Just seed data
  await seedData();
}

run().catch(console.error);
