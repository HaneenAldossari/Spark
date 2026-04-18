import { generateStory } from '../src/services/GeminiService.js';

async function main() {
  console.log('--- EN test ---');
  const en = await generateStory('Refactor the auth module', 'coding', 'en');
  console.log('story:', en.story.slice(0, 100));
  console.log('choices:', en.choices.map((c) => c.slice(0, 40)));

  console.log('\n--- AR test ---');
  const ar = await generateStory('مذاكرة نظرية المترجمات', 'studying', 'ar');
  console.log('story:', ar.story.slice(0, 100));
  console.log('choices:', ar.choices.map((c) => c.slice(0, 40)));
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
