import { beforeEach, describe, expect, it, vi } from 'vitest';

// AsyncStorage reaches for `window` outside React Native. These tests are
// about the store's rules, not about where the bytes land, so storage is a
// stub — `vi.mock` is hoisted above the import below, which is what makes it
// take effect at all.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  },
}));

import { emptyProgress } from './schema';
import { useProgress } from './store';

const reset = () => useProgress.setState({ ...emptyProgress, hydrated: true });
const state = () => useProgress.getState();

beforeEach(reset);

describe('creating a profile', () => {
  it('makes the new profile the one playing', () => {
    const id = state().createProfile('Fox', 'fox');
    expect(state().activeProfileId).toBe(id);
    expect(state().profiles).toHaveLength(1);
  });

  it('starts them on the full set of difficulties', () => {
    state().createProfile('Fox', 'fox');
    expect(state().profiles[0].maxTier).toBe(3);
  });

  it('gives each profile its own id', () => {
    const a = state().createProfile('Fox', 'fox');
    const b = state().createProfile('Owl', 'owl');
    expect(a).not.toBe(b);
  });
});

describe('switching', () => {
  it('changes who is playing without touching anyone results', () => {
    const fox = state().createProfile('Fox', 'fox');
    const owl = state().createProfile('Owl', 'owl');

    state().recordResult('rook-t1-01', 3, 1);
    state().selectProfile(fox);

    expect(state().activeProfileId).toBe(fox);
    expect(state().results[owl]?.['rook-t1-01']?.stars).toBe(3);
    expect(state().results[fox]?.['rook-t1-01']).toBeUndefined();
  });

  it('keeps each player difficulty separate', () => {
    const fox = state().createProfile('Fox', 'fox');
    state().setMaxTier(1);
    const owl = state().createProfile('Owl', 'owl');

    expect(state().profiles.find((p) => p.id === fox)!.maxTier).toBe(1);
    expect(state().profiles.find((p) => p.id === owl)!.maxTier).toBe(3);
  });
});

describe('the profile that opens on relaunch', () => {
  it('is the last one switched to, because activeProfileId is persisted', () => {
    // This is the whole of that requirement. If `partialize` ever stops
    // emitting activeProfileId the app silently reopens on the wrong player,
    // and nothing else would catch it.
    const persisted = useProgress.persist.getOptions().partialize!({
      ...state(),
    } as never) as Record<string, unknown>;

    expect(Object.keys(persisted)).toContain('activeProfileId');
    expect(Object.keys(persisted)).toContain('profiles');
    expect(Object.keys(persisted)).toContain('results');
  });

  it('does not persist transient flags', () => {
    const persisted = useProgress.persist.getOptions().partialize!({
      ...state(),
    } as never) as Record<string, unknown>;

    expect(Object.keys(persisted)).not.toContain('hydrated');
  });
});

describe('editing a profile', () => {
  it('changes the face without touching what they have finished', () => {
    const fox = state().createProfile('Fox', 'fox');
    state().recordResult('rook-t1-01', 3, 1);

    state().setProfileAvatar(fox, 'dragon');

    expect(state().profiles[0].avatarId).toBe('dragon');
    expect(state().results[fox]?.['rook-t1-01']?.stars).toBe(3);
  });

  it('leaves the other players as they were', () => {
    const fox = state().createProfile('Fox', 'fox');
    state().createProfile('Owl', 'owl');

    state().setProfileAvatar(fox, 'dragon');

    expect(state().profiles.map((p) => p.avatarId)).toEqual(['dragon', 'owl']);
  });
});

describe('removing a profile', () => {
  it('hands play to a survivor', () => {
    const fox = state().createProfile('Fox', 'fox');
    const owl = state().createProfile('Owl', 'owl');

    state().deleteProfile(owl);
    expect(state().activeProfileId).toBe(fox);
  });

  it('takes their results with them', () => {
    const owl = state().createProfile('Owl', 'owl');
    state().recordResult('rook-t1-01', 3, 1);

    state().deleteProfile(owl);
    expect(state().results[owl]).toBeUndefined();
  });

  it('leaves nobody playing when the last one goes, which is the first-run state', () => {
    const fox = state().createProfile('Fox', 'fox');
    state().deleteProfile(fox);

    expect(state().profiles).toEqual([]);
    expect(state().activeProfileId).toBeNull();
  });

  it('leaves the others alone when it is not the active one', () => {
    const fox = state().createProfile('Fox', 'fox');
    const owl = state().createProfile('Owl', 'owl');

    state().deleteProfile(fox);
    expect(state().activeProfileId).toBe(owl);
    expect(state().profiles).toHaveLength(1);
  });
});

describe('results', () => {
  beforeEach(() => {
    reset();
    state().createProfile('Fox', 'fox');
  });

  it('keeps the best run rather than the latest', () => {
    state().recordResult('rook-t1-01', 3, 1);
    state().recordResult('rook-t1-01', 1, 9);

    const result = state().results[state().activeProfileId!]['rook-t1-01'];
    expect(result.stars).toBe(3);
    expect(result.bestMoves).toBe(1);
  });

  it('clears on reset without removing the player', () => {
    state().recordResult('rook-t1-01', 3, 1);
    state().resetProgress();

    expect(state().results[state().activeProfileId!]).toEqual({});
    expect(state().profiles).toHaveLength(1);
  });

  it('writes a whole batch for the developer panel', () => {
    state().completeLevels([
      { levelId: 'rook-t1-01', stars: 3, bestMoves: 1 },
      { levelId: 'rook-t1-02', stars: 3, bestMoves: 1 },
    ]);

    expect(Object.keys(state().results[state().activeProfileId!])).toHaveLength(2);
  });
});
