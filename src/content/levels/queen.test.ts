import { describe } from 'vitest';

import { queenLevels } from './queen';
import { expectWorldLevels } from './validate';

describe('queen world', () => expectWorldLevels('queen', queenLevels));
