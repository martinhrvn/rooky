import { describe } from 'vitest';

import { knightLevels } from './knight';
import { expectWorldLevels } from './validate';

describe('knight world', () => expectWorldLevels('knight', knightLevels));
