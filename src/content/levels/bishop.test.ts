import { describe } from 'vitest';

import { bishopLevels } from './bishop';
import { expectWorldLevels } from './validate';

describe('bishop world', () => expectWorldLevels('bishop', bishopLevels));
