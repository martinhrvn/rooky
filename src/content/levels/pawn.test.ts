import { describe } from 'vitest';

import { pawnLevels } from './pawn';
import { expectWorldLevels } from './validate';

describe('pawn world', () => expectWorldLevels('pawn', pawnLevels));
