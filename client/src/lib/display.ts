/* Display helpers — every score that hits the DOM goes through here.
 * Mirrors server/src/services/ScoringService.ts §8.7 / §8.8 to keep
 * server and client in lock-step. Never display floats anywhere.
 */
import type { Lang } from './types';

export const formatScore = (n: number | null | undefined): string =>
  n == null ? '—' : String(Math.round(n));

export const formatRating = (n: number | null | undefined): string =>
  n == null ? '—' : String(Math.round(n));

export const formatPercentile = (p: number): string =>
  `Top ${Math.max(1, Math.round(p))}%`;

export function getRatingLabel(rating: number, _lang: Lang = 'en'): string {
  if (rating >= 1400) return 'Expert';
  if (rating >= 1300) return 'Advanced';
  if (rating >= 1200) return 'Competent';
  if (rating >= 1100) return 'Developing';
  return 'Beginner';
}
