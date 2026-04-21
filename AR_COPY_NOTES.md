# Arabic Copy — Style Notes

Spark's Arabic is rewritten, not translated. Target reader: an educated Saudi/Gulf user opening a polished product. Target feeling: calm authority, never hype, never clinical, never dialectal. Modern Standard Arabic, modern register — no archaic flexing, no Classical vocabulary.

## Voice

One paragraph rule: Spark is a precise instrument, not a coach. Lines should sound confident and quiet. Prefer short imperatives ("ابدأ.", "احسب.", "هيّا.") over long constructions. Never use dialect particles (يلا، بس، وش، عطها، الحين). Never use exclamations unless the emotion is genuinely earned (≤1 per screen).

## Numeral system — decision

**Hindi-Arabic numerals (٠١٢٣٤٥٦٧٨٩) are used throughout the Arabic locale prose.** This includes round counters, scores, time displays, session timings, stat rows, and all free-flowing text.

**One deliberate exception:** math equations in the Speed Math game keep Western digits (0-9) because the operators (+, −, ×, ÷, =) are rendered against the digits and mixing Arabic-Indic digits with Latin operators creates visual inconsistency. This is documented in a code comment in `SpeedMathGame.tsx`.

## Glossary — English → Arabic (use consistently)

| English | Arabic (final) | Notes |
|---|---|---|
| Focus Score | درجة التركيز | |
| Warm-up (concept) | الإحماء | never «التسخين» |
| Session | جلسة | |
| Round | جولة | |
| Task | مهمّة | |
| Category (of work) | نوع النشاط | replaces «الفئة» for the task-picker |
| Declare (step) | حدِّد المهمّة | replaces «الإعلان» |
| Warm-Up (step) | الإحماء | |
| Review (step) | المراجعة | |
| Close the loop (step) | الختام | replaces «أغلق الحلقة» |
| Return to home | العودة للرئيسيّة ← | arrow points ← in RTL |
| Start (game CTA) | هيّا | replaces «لنبدأ» |
| Start (main CTA) | ابدأ | |
| Start the session (hero) | ابدأ الجلسة | |
| Skip | تخطّي ← | |
| Help | مساعدة | no leading «؟» — the button glyph conveys help |
| Score | النتيجة | |
| Match / Different | مطابق / مختلف | n-back labels |
| Same / Mirror | متطابق / معكوس | mental-rotation labels |
| Correct answers | الإجابات الصحيحة | |
| Longest streak | أطول تتابع | |
| Mistakes | الأخطاء | |
| Avg time | متوسّط الزمن | never «معدّل الزمن» |
| Fastest | أسرع إجابة | never «الأسرع» alone |
| Found (Schulte) | الأرقام التي وصلت إليها | |
| Grid (Schulte) | حجم الشبكة | |
| Time (Schulte) | زمن الإكمال | |
| Nervous / Okay / Ready | متوتّر / لا بأس / مستعدّ | check-in; «مستعدّ» over «جاهز» |
| Ready (focus tier) | دماغك مهيَّأ. | |
| Almost (focus tier) | أنت في مرحلة الإحماء. | replaces «أوشكت على الوصول» |
| Not ready (focus tier) | دماغك يحتاج إحماءً أكثر. | |

## Punctuation

- Arabic comma ، and question mark ؟
- Arabic quote marks «» (not "", not '')
- No colon after labels («النتيجة ٠» not «النتيجة: ٠»)
- Arrow direction flips in RTL: → in EN becomes ← in AR on buttons and navigation

## Notable rewrites (reasoning)

- **Hero H1**: «أشعل دماغك» → «حمِّ دماغك» — "أشعل" is violent/combustive, "حمِّ" (warm/prep) matches the brand promise.
- **Hero subtitle**: dropped «سبارك تهيئة ذهنية…». Starts with the offer directly: «خمس دقائق. أربع خطوات.» Feels sharper.
- **"Not category" heading**: the English em-dash construction ("A new category — not a better timer") was calqued; rewrote as two sentences: «سبارك ليس مؤقّتًا. إنه فئة جديدة.»
- **Problem headline**: «لستَ كسولًا. دماغك عالقٌ عصبيًّا.» → «ليست كسلًا. دماغك يحتاج وقتًا ليشتغل.» — drops the accusation and the clinical "neurologically stuck".
- **Motivation lines** (between games): stripped dialect — «عطها كل شي» became «أعطِها كلّ ما لديك». Dropped exclamations; confident MSA.
- **Check-in options**: «جاهز» → «مستعدّ» — warmer, less gym-coded.
- **Focus-Score «almost» tier**: «أوشكت على الوصول. جولةٌ إضافيّة واحدة كفيلة بصقلك.» → «أنت في مرحلة الإحماء. جولة إضافيّة ستشحذك أكثر.» — removes stiff literary constructions, more natural rhythm.
- **Stroop color buttons**: now render in Arabic (أحمر/أزرق/أخضر/برتقالي) when AR is selected, instead of English.
- **Game names**: «جدول شولتي» → «جدول شولته» (correct transliteration of German "Schulte"), «الذاكرة النشطة» → «الذاكرة الحيّة» (more natural).
- **Schulte hint**: «اعثر على الأرقام بالترتيب.» → «من ١ فصاعدًا، بأقصى سرعة.» — tighter, more confident.
- **Speed Math hint**: «مسائل بسيطة. أجِب بسرعة.» → «احسب. بسرعة.» — two words do the job.
- **Navon hint**: «اختر الحرف الصغير.» → «الحرف الصغير، لا الكبير.» — adds the contrast that's the whole point of the game.

## RTL artifacts fixed

- **Help button**: removed leading `?` glyph (was rendering on the wrong side in RTL, looked like «؟ مساعدة»). Help label is now just «مساعدة» — the in-game button's circle icon conveys its meaning.
- **Skip button**: now «تخطّي ←» with correct RTL-pointing arrow.
- **Exit button**: «خروج ✕» — × renders to the right of the word in RTL (natural leading position for close icons).
- **Arrows**: `→` in EN flipped to `←` in AR across all button CTAs, navigation links, and "return to home" links.
- **Countdown digits (3-2-1-انطلِق)**: converted to Hindi-Arabic ٣-٢-١-انطلِق for consistency.
- **Round counters**: «الجولة ١ من ١٥» (word «من» replaces the slash, feels natural).
- **Score labels**: «النتيجة ٠» (no colon, Hindi-Arabic digit).
- **Language toggle**: in EN view shows «ع» (single letter, cleaner than «AR»); in AR view shows «EN».

## Files touched

- `client/src/i18n/ar.ts` — full catalogue rewrite
- `client/src/pages/Welcome.tsx` — inline Arabic for stat cards, problem cards, phase cards (now with `timeAr` field so `0:10 → 5:00` becomes `٠:١٠ ← ٥:٠٠`), compare rows, neuroscience blurb
- `client/src/components/Layout.tsx` — language toggle shows «ع»
- `client/src/components/games/games.types.ts` — GAME_META `ar` entries rewritten (game names + rules + explainers)
- `client/src/components/games/GameShell.tsx` — skip/confirm/cancel Arabic
- `client/src/components/games/SchulteGame.tsx` — local TEXT + removed `?` prefix
- `client/src/components/games/NBackGame.tsx` — local TEXT + removed `?` prefix
- `client/src/components/games/StroopGame.tsx` — local TEXT, Arabic color names, `toAr` numeral conversion for round/score
- `client/src/components/games/SpeedMathGame.tsx` — local TEXT, `toAr` for round/score (math equations stay Western per spec)
- `client/src/components/games/NavonGame.tsx` — local TEXT + removed `?` prefix
- `client/src/components/games/MentalRotationGame.tsx` — local TEXT + removed `?` prefix
- `client/src/components/session/GamePreviewScreen.tsx` — subtitle/heading/CTA
- `client/src/components/session/GameTransition.tsx` — «هيّا» CTA
- `client/src/components/session/GameGauntlet.tsx` — motivation array rewritten
- `client/src/components/session/PrimeScreen.tsx` — Arabic digits for 3-2-1 + «انطلِق»
- `client/src/components/session/CheckInScreen.tsx` — heading + «مستعدّ»
- `client/src/components/session/FocusScoreScreen.tsx` — tier messages + «العودة للرئيسيّة ←»
- `client/src/components/session/GameResultCard.tsx` — per-game end messages + stat labels

## TODO for a native reviewer

A Saudi/Gulf copywriter should pass over these files once before launch:
- `ar.ts` welcome section — hero line, heroSub, notHead
- `GameResultCard.tsx` — the three-tier per-game messages (30 strings)
- `Welcome.tsx` — the four neuroscience cards + the compare rows

Nothing here is grammatically wrong, but a native reviewer will spot rhythm/flow improvements that I can't reliably see. Estimate: 20-30 minutes of review.
