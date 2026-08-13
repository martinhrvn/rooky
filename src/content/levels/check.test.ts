import { describe } from 'vitest';

import { checkLevels } from './check';
import { expectWorldLevels } from './validate';

describe('check world', () => expectWorldLevels('check', checkLevels));
