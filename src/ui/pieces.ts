/**
 * Piece artwork.
 *
 * Cburnett set, CC-BY-SA 3.0 — see ASSETS.md for attribution. Real chess
 * pieces rather than characters, so what she learns here reads the same on a
 * physical board.
 */

import type React from 'react';
import type { SvgProps } from 'react-native-svg';

import type { Color, PieceType } from '../chess/types';

import bb from '../../assets/pieces/bb.svg';
import bk from '../../assets/pieces/bk.svg';
import bn from '../../assets/pieces/bn.svg';
import bp from '../../assets/pieces/bp.svg';
import bq from '../../assets/pieces/bq.svg';
import br from '../../assets/pieces/br.svg';
import wb from '../../assets/pieces/wb.svg';
import wk from '../../assets/pieces/wk.svg';
import wn from '../../assets/pieces/wn.svg';
import wp from '../../assets/pieces/wp.svg';
import wq from '../../assets/pieces/wq.svg';
import wr from '../../assets/pieces/wr.svg';

const ART: Record<Color, Record<PieceType, React.FC<SvgProps>>> = {
  w: { k: wk, q: wq, r: wr, b: wb, n: wn, p: wp },
  b: { k: bk, q: bq, r: br, b: bb, n: bn, p: bp },
};

export const pieceArt = (color: Color, type: PieceType): React.FC<SvgProps> => ART[color][type];
