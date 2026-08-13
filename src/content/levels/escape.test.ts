import { describe } from 'vitest';

import { escapeLevels } from './escape';
import { expectWorldLevels } from './validate';

describe('escape world', () => expectWorldLevels('escape', escapeLevels));
