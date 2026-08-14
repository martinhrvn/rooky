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

import { OFFER_SIZE } from './offer';
import { emptyProgress } from './schema';
import { useProgress } from './store';
import { XP_PER_STICKER } from './xp';

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

  it('persists every reward record', () => {
    // Same failure mode as activeProfileId: anything missing here is silently
    // forgotten on relaunch, and a child would simply find her album empty.
    const persisted = useProgress.persist.getOptions().partialize!({
      ...state(),
    } as never) as Record<string, unknown>;

    for (const key of ['xp', 'counters', 'streaks', 'earned', 'album', 'pending']) {
      expect(Object.keys(persisted), key).toContain(key);
    }
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

describe('tallies', () => {
  beforeEach(() => {
    reset();
    state().createProfile('Fox', 'fox');
  });

  const counters = () => state().counters[state().activeProfileId!] ?? {};
  const streaks = () => state().streaks[state().activeProfileId!] ?? {};

  it('adds up and never goes down', () => {
    state().bump(['moved:n', 'took:n']);
    state().bump(['moved:n']);

    expect(counters()['moved:n']).toBe(2);
    expect(counters()['took:n']).toBe(1);
  });

  it('keeps one player\'s tallies out of the other\'s', () => {
    const fox = state().activeProfileId!;
    state().bump(['moved:n']);

    const owl = state().createProfile('Owl', 'owl');
    state().bump(['moved:n']);

    expect(state().counters[fox]['moved:n']).toBe(1);
    expect(state().counters[owl]['moved:n']).toBe(1);
  });

  it('runs a streak up and back to zero', () => {
    state().extendStreak('tries');
    state().extendStreak('tries');
    expect(streaks().tries).toBe(2);

    state().resetStreak('tries');
    expect(streaks().tries).toBe(0);
  });
});

describe('settling a level', () => {
  beforeEach(() => {
    reset();
    state().createProfile('Fox', 'fox');
  });

  const xp = () => state().xp[state().activeProfileId!] ?? 0;
  const album = () => state().album[state().activeProfileId!] ?? [];
  const pending = () => state().pending[state().activeProfileId!] ?? [];

  it('pays the level and reports it', () => {
    const settlement = state().settle(30);

    expect(settlement.xp).toBe(30);
    expect(xp()).toBe(30);
  });

  it('pays an achievement on top, once', () => {
    state().bump(Array(5).fill('taken'));

    const first = state().settle(0);
    expect(first.achievements.map((a) => a.id)).toContain('taken@5');
    expect(first.xp).toBeGreaterThan(0);

    // The rule that stops rewarding failure becoming a way to farm the bar.
    const again = state().settle(0);
    expect(again.achievements).toHaveLength(0);
    expect(again.xp).toBe(0);
  });

  it('offers a choice once the bar is full', () => {
    state().settle(XP_PER_STICKER);

    expect(pending()).toHaveLength(OFFER_SIZE);
    expect(album()).toHaveLength(0);
  });

  it('offers nothing before the bar is full', () => {
    state().settle(XP_PER_STICKER - 1);
    expect(pending()).toHaveLength(0);
  });

  it('reports two fills when one award crosses two boundaries', () => {
    // A big achievement bonus landing on top of a level's XP.
    expect(state().settle(XP_PER_STICKER * 2).fills).toBe(2);
  });
});

describe('choosing a sticker', () => {
  beforeEach(() => {
    reset();
    state().createProfile('Fox', 'fox');
  });

  const album = () => state().album[state().activeProfileId!] ?? [];
  const pending = () => state().pending[state().activeProfileId!] ?? [];

  it('puts the chosen one in the album and clears the offer', () => {
    state().settle(XP_PER_STICKER);
    const chosen = pending()[0];

    state().chooseSticker(chosen);

    expect(album()).toEqual([chosen]);
    expect(pending()).toHaveLength(0);
  });

  it('ignores one that was not on offer', () => {
    state().settle(XP_PER_STICKER);
    state().chooseSticker('not-offered');

    expect(album()).toHaveLength(0);
    expect(pending()).toHaveLength(OFFER_SIZE);
  });

  it('offers again while another is still owed', () => {
    state().settle(XP_PER_STICKER * 2);
    state().chooseSticker(pending()[0]);

    state().ensureOffer();
    expect(pending()).toHaveLength(OFFER_SIZE);

    state().chooseSticker(pending()[0]);
    state().ensureOffer();
    expect(album()).toHaveLength(2);
    expect(pending()).toHaveLength(0);
  });

  it('never offers one she already owns', () => {
    state().settle(XP_PER_STICKER * 3);

    const seen = new Set<string>();
    for (let i = 0; i < 3; i += 1) {
      state().ensureOffer();
      for (const id of pending()) expect(seen.has(id)).toBe(false);
      const chosen = pending()[0];
      seen.add(chosen);
      state().chooseSticker(chosen);
    }
  });

  it('still owes the sticker after the app is killed mid-choice', () => {
    // The dialog is driven entirely by persisted state, so this is the whole
    // of "it comes back". `pending` is dropped to simulate being killed before
    // the offer was written; the XP and the album are what survive, and the
    // shortfall between them is what says one is still owed.
    state().settle(XP_PER_STICKER);
    const fox = state().activeProfileId!;

    useProgress.setState({
      pending: {},
      lastSettlement: null,
      xp: { [fox]: XP_PER_STICKER },
      album: { [fox]: [] },
    });

    state().ensureOffer();
    expect(pending()).toHaveLength(OFFER_SIZE);
  });

  it('keeps the same offer across a reload', () => {
    // The offer is derived from how many she already has, not from a random
    // roll, so force-quitting cannot re-roll it and nothing is lost if she
    // wanders off mid-choice.
    state().settle(XP_PER_STICKER);
    const offered = [...pending()];

    useProgress.setState({ pending: {} });
    state().ensureOffer();

    expect(pending()).toEqual(offered);
  });
});

describe('a reset clears the rewards too', () => {
  it('takes the XP, the album and the tallies with it', () => {
    reset();
    const fox = state().createProfile('Fox', 'fox');
    state().bump(['moved:n']);
    state().settle(XP_PER_STICKER);
    state().chooseSticker(state().pending[fox][0]);

    state().resetProgress();

    expect(state().xp[fox]).toBe(0);
    expect(state().album[fox]).toEqual([]);
    expect(state().counters[fox]).toEqual({});
    expect(state().earned[fox]).toEqual({});
    expect(state().profiles).toHaveLength(1);
  });

  it('leaves nothing behind when a profile is deleted', () => {
    reset();
    const fox = state().createProfile('Fox', 'fox');
    state().settle(XP_PER_STICKER);

    state().deleteProfile(fox);

    for (const record of [state().xp, state().album, state().counters, state().pending]) {
      expect(Object.keys(record)).not.toContain(fox);
    }
  });
});
