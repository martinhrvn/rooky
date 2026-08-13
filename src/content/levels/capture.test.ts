import { describe } from 'vitest';

import { captureLevels } from './capture';
import { expectWorldLevels } from './validate';

describe('capture world', () => expectWorldLevels('capture', captureLevels));
