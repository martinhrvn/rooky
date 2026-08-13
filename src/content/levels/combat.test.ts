import { describe } from 'vitest';

import { combatLevels } from './combat';
import { expectWorldLevels } from './validate';

describe('combat world', () => expectWorldLevels('combat', combatLevels));
