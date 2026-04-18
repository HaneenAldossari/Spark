import { en, type Strings } from './en';
import { ar } from './ar';
import type { Lang } from '../lib/types';

export const catalogues: Record<Lang, Strings> = { en, ar };
export type { Strings };
