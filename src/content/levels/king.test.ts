import { describe } from 'vitest';

import { kingLevels } from './king';
import { expectWorldLevels } from './validate';

describe('king world', () => expectWorldLevels('king', kingLevels));
