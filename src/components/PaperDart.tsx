import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, Line, Path } from 'react-native-svg';

import { FoldKind, PaperSkin } from '../game/catalog';

/**
 * Top-down paper darts, the silhouette people actually recognize.
 * CSS triangles vanish on iOS, so every surface is an SVG path.
 *
 * ViewBox is 100×40, nose pointing right, crease on y = 20.
 */

export function dartSpan(length: number, _fold: FoldKind): number {
  // ViewBox is 100×40. Keep the layout box in the same ratio so the dart
  // is not letterboxed or stretched when the fold changes.
  void _fold;
  return length * 0.2;
}

type FoldShape = {
  /** Full dart, including the notch that makes the folded body. */
  body: string;
  /** Darker lower wing + belly. */
  shade: string;
  /** Inner fold that forms the fuselage. */
  spine: string;
};

function shapeFor(fold: FoldKind): FoldShape {
  switch (fold) {
    case 'glider':
      return {
        body: 'M 3 3.5 L 36 6 L 97 20 L 36 34 L 3 36.5 L 3 23.2 L 50 20 L 3 16.8 Z',
        shade: 'M 3 20 L 50 20 L 3 23.2 L 3 36.5 L 36 34 L 97 20 Z',
        spine: 'M 10 20 L 97 20',
      };
    case 'arrow':
      return {
        body: 'M 1 18.4 L 22 11 L 99 20 L 22 29 L 1 21.6 L 1 20.7 L 54 20 L 1 19.3 Z',
        shade: 'M 1 20 L 54 20 L 1 20.7 L 1 21.6 L 22 29 L 99 20 Z',
        spine: 'M 4 20 L 99 20',
      };
    case 'wide':
      return {
        body: 'M 6 1.5 L 28 4 L 92 20 L 28 36 L 6 38.5 L 6 24 L 38 20 L 6 16 Z',
        shade: 'M 6 20 L 38 20 L 6 24 L 6 38.5 L 28 36 L 92 20 Z',
        spine: 'M 10 20 L 92 20',
      };
    case 'bulldog':
      return {
        body: 'M 4 7 L 24 9 L 86 20 L 24 31 L 4 33 L 4 24.4 L 34 20 L 4 15.6 Z',
        shade: 'M 4 20 L 34 20 L 4 24.4 L 4 33 L 24 31 L 86 20 Z',
        spine: 'M 8 20 L 86 20',
      };
    case 'delta':
      return {
        body: 'M 4 5 L 100 20 L 4 35 L 4 23.6 L 46 20 L 4 16.4 Z',
        shade: 'M 4 20 L 46 20 L 4 23.6 L 4 35 L 100 20 Z',
        spine: 'M 8 20 L 100 20',
      };
    default:
      return {
        body: 'M 4 6 L 30 7.5 L 98 20 L 30 32.5 L 4 34 L 4 23.8 L 44 20 L 4 16.2 Z',
        shade: 'M 4 20 L 44 20 L 4 23.8 L 4 34 L 30 32.5 L 98 20 Z',
        spine: 'M 8 20 L 98 20',
      };
  }
}

function edgeColor(paper: PaperSkin): string {
  const hex = paper.sheet.replace('#', '');
  if (hex.length < 6) return paper.crease;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  return lum < 90 ? '#A8A8B4' : paper.crease;
}

function PatternMarks({
  paper,
  clipId,
}: {
  paper: PaperSkin;
  clipId: string;
}) {
  if (paper.pattern === 'ruled') {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Line x1="18" y1="10" x2="78" y2="17" stroke="#8FB4D8" strokeWidth="0.55" opacity="0.75" />
        <Line x1="16" y1="14" x2="72" y2="19.2" stroke="#8FB4D8" strokeWidth="0.45" opacity="0.5" />
        <Line x1="18" y1="24" x2="70" y2="21.4" stroke="#8FB4D8" strokeWidth="0.4" opacity="0.4" />
      </G>
    );
  }
  if (paper.pattern === 'grid') {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Line x1="20" y1="9" x2="80" y2="16.5" stroke="#7EA08C" strokeWidth="0.4" opacity="0.5" />
        <Line x1="18" y1="14" x2="74" y2="19" stroke="#7EA08C" strokeWidth="0.35" opacity="0.4" />
        <Line x1="32" y1="7" x2="40" y2="33" stroke="#7EA08C" strokeWidth="0.35" opacity="0.4" />
        <Line x1="48" y1="9" x2="54" y2="31" stroke="#7EA08C" strokeWidth="0.3" opacity="0.35" />
        <Line x1="64" y1="12" x2="68" y2="28" stroke="#7EA08C" strokeWidth="0.3" opacity="0.3" />
      </G>
    );
  }
  if (paper.pattern === 'stripes' && paper.stripe) {
    return (
      <G clipPath={`url(#${clipId})`}>
        <Line
          x1="16"
          y1="11"
          x2="82"
          y2="18.5"
          stroke={paper.stripe}
          strokeWidth="2.3"
          opacity="0.85"
        />
        <Line
          x1="18"
          y1="16"
          x2="76"
          y2="20"
          stroke={paper.sheet}
          strokeWidth="1.4"
          opacity="0.75"
        />
      </G>
    );
  }
  return null;
}

export function PaperDart({
  paper,
  length,
  showRules = true,
}: {
  paper: PaperSkin;
  length: number;
  showRules?: boolean;
}) {
  const span = dartSpan(length, paper.foldKind);
  const height = span * 2;
  const shape = shapeFor(paper.foldKind);
  const clipId = `wing${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const edge = edgeColor(paper);

  return (
    <View style={{ width: length, height, overflow: 'visible' }}>
      <Svg width={length} height={height} viewBox="0 0 100 40">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={shape.body} />
          </ClipPath>
        </Defs>

        <G transform="translate(1.6, 1.8)">
          <Path d={shape.body} fill="#1B1013" opacity="0.22" />
        </G>

        <Path d={shape.body} fill={paper.sheet} />
        <Path d={shape.shade} fill={paper.fold} />

        {showRules ? <PatternMarks paper={paper} clipId={clipId} /> : null}

        <Path
          d={shape.body}
          fill="none"
          stroke={edge}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <Path
          d={shape.spine}
          fill="none"
          stroke={edge}
          strokeWidth="0.85"
          strokeLinecap="round"
        />
        <Line
          x1="8"
          y1="20"
          x2="40"
          y2="16.4"
          stroke={paper.sheet}
          strokeWidth="0.45"
          opacity="0.55"
        />
      </Svg>
    </View>
  );
}

/** A folded wad — used when a dart hits the grass, not a squashed scale. */
export function CrumpledDart({
  paper,
  length,
}: {
  paper: PaperSkin;
  length: number;
}) {
  const span = dartSpan(length, paper.foldKind);
  const height = span * 2;
  const edge = edgeColor(paper);

  return (
    <View style={{ width: length, height, overflow: 'visible' }}>
      <Svg width={length} height={height} viewBox="0 0 100 40">
        <Path
          d="M 18 16 L 34 8 L 58 10 L 78 18 L 84 26 L 62 34 L 36 33 L 16 24 Z"
          fill={paper.sheet}
        />
        <Path d="M 28 18 L 56 14 L 72 24 L 48 30 Z" fill={paper.fold} />
        <Path
          d="M 18 16 L 34 8 L 58 10 L 78 18 L 84 26 L 62 34 L 36 33 L 16 24 Z"
          fill="none"
          stroke={edge}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <Path
          d="M 30 20 L 52 17 L 66 24"
          fill="none"
          stroke={edge}
          strokeWidth="0.7"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
