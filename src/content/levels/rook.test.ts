import { describe } from 'vitest';

import { rookLevels } from './rook';
import { expectWorldLevels } from './validate';

describe('rook world', () => expectWorldLevels('rook', rookLevels));
