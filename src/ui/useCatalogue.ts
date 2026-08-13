import { type Catalogue, catalogueFor } from '../content';
import { useMaxTier } from '../progress/store';

/**
 * The content the active player actually sees, given their difficulty ceiling.
 *
 * Every screen goes through this rather than reaching for `WORLDS` or
 * `ALL_LEVELS` directly, so a parent capping the difficulty takes effect
 * everywhere at once instead of in the places someone remembered.
 *
 * The exception is `levelById`, which stays on the full catalogue: a level id
 * from a hidden tier must still resolve, or a stale route turns into a blank
 * screen.
 */
export const useCatalogue = (): Catalogue => catalogueFor(useMaxTier());
