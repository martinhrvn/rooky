import { Tabs } from 'expo-router';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glyph } from '../../src/ui/IconButton';
import { Star } from '../../src/ui/Star';
import { Text } from '../../src/ui/Text';
import { strings } from '../../src/ui/strings';
import { colors, layout } from '../../src/ui/theme';

/** Big enough to be hit by a four-year-old aiming roughly. */
const ICON = 30;

/**
 * The four places in the app.
 *
 * A row of fixed icons in a fixed order is the strongest navigation there is
 * for someone who cannot read: position is learned in a sitting and never lost,
 * and it puts the path, the collection and the stickers on screen at once
 * instead of behind a door on the home screen.
 *
 * **A tab is a place; a board is not.** Everything that shows a board — Mix,
 * the campaign, Endless — lives outside this group and so opens over the bar,
 * full screen. That is not only about focus: `LevelPlayer` sizes the board off
 * the whole window height, so a bar underneath it would eat into the board
 * rather than the board making room for it. The adults' screens are outside for
 * the same structural reason and a different one — settings and the profile
 * switcher are things you go and do, not places you live.
 *
 * The bar is deliberately **uncoloured**. `theme.actions` spends jade,
 * periwinkle and coral on what a control *does*, and gold is rewards only —
 * and two of these four tabs are rewards, so colouring by meaning would put
 * gold on navigation or hand two tabs the same hue. Shape and position carry
 * identity here, which is what the reading rule asks for anyway.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          // The inset has to be added by hand. `getTabBarHeight` returns a
          // numeric `height` from this style *verbatim* and skips the inset it
          // would otherwise add — so a fixed height puts the bar flush against
          // the bottom of the screen, underneath Android's navigation buttons,
          // while the bar's own `paddingBottom: insets.bottom` squeezes the
          // icons into what is left. `layout.tabBar` is the bar proper; this is
          // the ground it stands on.
          height: layout.tabBar + insets.bottom,
          backgroundColor: colors.surface,
          // On a dark ground a shadow does nothing. Separation is the surface
          // step plus a hairline, the same as every card in the app.
          borderTopWidth: 1,
          borderTopColor: colors.surfaceEdge,
        },
        tabBarItemStyle: { paddingVertical: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={tab(strings.tabs.home, (color) => <Glyph name="home" size={ICON} color={color} />)}
      />
      <Tabs.Screen
        name="levels"
        options={tab(strings.tabs.path, (color) => <Glyph name="path" size={ICON} color={color} />)}
      />
      <Tabs.Screen
        name="achievements"
        options={tab(strings.tabs.things, (color) => (
          <Glyph name="things" size={ICON} color={color} />
        ))}
      />
      <Tabs.Screen
        name="stickers"
        options={tab(strings.tabs.stickers, () => (
          // The star keeps its gold rather than taking the tint: this is the
          // rewards tab, and gold is what a reward looks like everywhere else
          // in the app. Nothing else on the bar is allowed it.
          <Star size={ICON} id="tab-stickers" />
        ))}
      />
    </Tabs>
  );
}

/**
 * One tab's options.
 *
 * The label is a render function returning our own `Text` rather than a string
 * plus `tabBarLabelStyle` — that style prop is an ad-hoc font size, and every
 * piece of type in this app goes through `Text` so none of them can drift.
 */
const tab = (label: string, icon: (color: string) => ReactNode) => ({
  title: label,
  tabBarIcon: ({ color }: { color: string }) => icon(color),
  tabBarLabel: ({ color }: { color: string }) => (
    <Text variant="label" color={color} numberOfLines={1}>
      {label}
    </Text>
  ),
});
