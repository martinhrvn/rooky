import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useAlbum,
  useCanvasBackground,
  useCanvasPlacements,
  useProgress,
  useXp,
} from '../../src/progress/store';
import { BackgroundPicker, PICKER_INSET } from '../../src/ui/BackgroundPicker';
import { DragGhost } from '../../src/ui/DragGhost';
import { StickerCanvas } from '../../src/ui/StickerCanvas';
import { StickerTray } from '../../src/ui/StickerTray';
import { Text } from '../../src/ui/Text';
import { XpBar } from '../../src/ui/XpBar';
import { type Size, fitCanvas, visibleCentre } from '../../src/ui/canvasGeometry';
import { type Held, useCanvasRects, useDragState } from '../../src/ui/dragState';
import { strings } from '../../src/ui/strings';
import { colors, layout } from '../../src/ui/theme';

/**
 * Her stickers, and the picture she makes out of them.
 *
 * The tray along the bottom is what the album used to be — a wrapped grid of
 * everything she has won — except that now the stickers come *off* it. That is
 * the whole change: a shelf is something you look at once, and a picture is
 * something you come back to.
 *
 * Nothing on this screen can destroy anything. There is no clear button, and
 * taking a sticker off the picture never takes it out of the tray.
 */
export default function StickersScreen() {
  const album = useAlbum();
  const xp = useXp();
  const placements = useCanvasPlacements();
  const backgroundId = useCanvasBackground();

  const ensureOffer = useProgress((s) => s.ensureOffer);
  const placeSticker = useProgress((s) => s.placeSticker);
  const movePlacement = useProgress((s) => s.movePlacement);
  const transformPlacement = useProgress((s) => s.transformPlacement);
  const removePlacement = useProgress((s) => s.removePlacement);
  const setCanvasBackground = useProgress((s) => s.setCanvasBackground);

  // Nudges the root dialog into opening if one is owed. Harmless if it is
  // already up, because `ensureOffer` does nothing when an offer stands.
  //
  // Called inside the effect rather than passed as it: a store action returns
  // whatever zustand's `set` returns, and React reads an effect's return value
  // as its cleanup function — so `useEffect(ensureOffer, ...)` blows up on
  // unmount with "destroy is not a function".
  useEffect(() => {
    ensureOffer();
  }, [ensureOffer]);

  const drag = useDragState();
  const rects = useCanvasRects();

  // The room the picture has, measured; the picture itself is the largest box
  // of the fixed aspect that fits inside it. Fixed, so a composition made on a
  // phone is the same composition on a tablet.
  const [available, setAvailable] = useState<Size>({ width: 0, height: 0 });
  const box = useMemo(() => fitCanvas(available), [available]);
  useEffect(() => {
    rects.box.value = box;
  }, [box, rects.box]);

  /**
   * Which sticker the two-fingered gestures are talking to.
   *
   * Transient by design and never stored: a ring left around a sticker from
   * last week would be a state she never asked for and cannot clear without
   * knowing it is there.
   */
  const [selectedKey, setSelectedKey] = useState('');

  /**
   * What is in the air.
   *
   * Every one of the handlers below **ends the drag in the same JS tick as it
   * writes to the store**, which is the entire fix for the sticker flicking
   * back to where it started before landing where she put it. React renders
   * the placement's new home and the ghost's disappearance together; clearing
   * this from the UI thread instead put them on different frames.
   */
  const [held, setHeld] = useState<Held | null>(null);

  const liftFromTray = useCallback(
    (stickerId: string, size: number) => setHeld({ stickerId, size, rotation: 0, fromKey: '' }),
    [],
  );
  const liftFromCanvas = useCallback(
    (stickerId: string, size: number, rotation: number, fromKey: string) =>
      setHeld({ stickerId, size, rotation, fromKey }),
    [],
  );
  const cancelDrag = useCallback(() => setHeld(null), []);

  const place = useCallback(
    (stickerId: string, x: number, y: number) => {
      placeSticker(stickerId, x, y);
      setHeld(null);
    },
    [placeSticker],
  );
  const dropInMiddle = useCallback(
    (stickerId: string) => {
      // The middle of what she can see rather than of the picture: zoomed into
      // a corner, the true centre is off screen and the tap reads as a miss.
      const centre = visibleCentre(box, rects.view.value);
      placeSticker(stickerId, centre.x, centre.y);
      setHeld(null);
    },
    [placeSticker, box, rects.view],
  );
  const movePlaced = useCallback(
    (key: string, x: number, y: number) => {
      movePlacement(key, x, y);
      setHeld(null);
    },
    [movePlacement],
  );
  const removePlaced = useCallback(
    (key: string) => {
      removePlacement(key);
      setHeld(null);
      // Nothing may keep a ring around a sticker that is no longer there.
      setSelectedKey((current) => (current === key ? '' : current));
    },
    [removePlacement],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* No back arrow: this is a tab, and there is nothing under it to go
          back to. The bar is how you leave. And no bottom inset — that one
          belongs to the tab bar, which sits below this screen already. */}
      <Animated.View ref={rects.hostRef} style={styles.host}>
        <View style={styles.header}>
          <Text variant="title">{strings.stickers.title}</Text>
          <XpBar xp={xp} height={18} />
        </View>

        {/* No screen-level ScrollView: the tray scrolls inside itself, and a
            vertical scroller inside a vertical scroller is a fight. `fitCanvas`
            is what makes the rest fit without one. */}
        <View style={styles.column} onLayout={(e) => setAvailable(e.nativeEvent.layout)}>
          {/* A wrapper exactly the picture's size, so the floating control can
              be positioned against the picture's own corner. It sits beside
              the canvas rather than inside it: the canvas clips for its
              rounded corners, and everything inside it is carried by the
              viewport transform — a control that zoomed with the artwork would
              be unusable the moment she pinched. */}
          <View style={{ width: box.width, height: box.height }}>
            <StickerCanvas
              box={box}
              backgroundId={backgroundId}
              placements={placements}
              drag={drag}
              rects={rects}
              heldKey={held?.fromKey ?? ''}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              onLift={liftFromCanvas}
              onMove={movePlaced}
              onRemove={removePlaced}
              onTransform={transformPlacement}
              onCancel={cancelDrag}
            />
            {box.width > 0 ? (
              <View style={styles.picker}>
                <BackgroundPicker
                  selected={backgroundId}
                  onSelect={setCanvasBackground}
                  width={box.width}
                />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.trayRow}>
          <StickerTray
            album={album}
            drag={drag}
            rects={rects}
            heldId={held?.stickerId ?? ''}
            armed={(held?.fromKey ?? '') !== ''}
            onLift={liftFromTray}
            onPlace={place}
            onDropInMiddle={dropInMiddle}
            onCancel={cancelDrag}
          />
        </View>

        {/* Last, and above everything: the sticker that follows her finger. It
            cannot live inside the tray or the canvas, because both clip. */}
        <DragGhost held={held} drag={drag} rects={rects} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  host: { flex: 1 },
  header: {
    gap: 10,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 10,
  },
  // The canvas is centred in everything the header and the tray leave, and
  // deliberately ignores `layout.contentWidth`: that cap suits stacks of
  // cards, and this screen's picture is its board.
  column: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  picker: { position: 'absolute', right: PICKER_INSET, bottom: PICKER_INSET },
  trayRow: { paddingHorizontal: 12, paddingBottom: 8 },
});
