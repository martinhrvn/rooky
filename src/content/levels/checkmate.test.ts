import { describe } from 'vitest';

import { checkmateLevels } from './checkmate';
import { expectWorldLevels } from './validate';

describe('checkmate world', () => expectWorldLevels('checkmate', checkmateLevels));
