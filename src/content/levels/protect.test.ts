import { describe } from 'vitest';

import { protectLevels } from './protect';
import { expectWorldLevels } from './validate';

describe('protect world', () => expectWorldLevels('protect', protectLevels));
