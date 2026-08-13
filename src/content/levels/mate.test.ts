import { describe } from 'vitest';

import { mateLevels } from './mate';
import { expectWorldLevels } from './validate';

describe('mate world', () => expectWorldLevels('mate', mateLevels));
