import { View } from 'react-native';

import { Halo } from '../GoalBadge';
import { pieceArt } from '../pieces';

/**
 * The chase, as an object: three pawns marching in a line, and a black queen
 * looming over them from behind.
 *
 * Its outline is a row of small things stepping up to one big one — unlike
 * the jar's rounded upright and the setup board's tilted square, which is the
 * whole of how a non-reader tells the three toys apart. It is made of the
 * pieces themselves rather than a drawn object, because what the game *is* is
 * those pieces against each other, and both sides of it use exactly these.
 * No action colour, like every toy on the shelf.
 */
export function ChaseToy({ width = 96 }: { width?: number }) {
  const Pawn = pieceArt('w', 'p');
  const Queen = pieceArt('b', 'q');
  const pawn = width * 0.36;
  const queen = width * 0.6;

  return (
    <View style={{ width, height: width * 1.05 }}>
      {/* The queen at the back, on her halo so the black set reads on the plum. */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: queen,
          height: queen,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Halo size={queen * 1.3} id="chase-toy-halo" />
        <Queen width={queen} height={queen} />
      </View>
      {/* The pawns, each a step further on and a step higher than the last:
          a march, not a row standing still. */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: i * width * 0.2 - width * 0.04, bottom: i * width * 0.08 }}
        >
          <Pawn width={pawn} height={pawn} />
        </View>
      ))}
    </View>
  );
}
