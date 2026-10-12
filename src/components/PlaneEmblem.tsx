import React from 'react';
import { View } from 'react-native';

import { PaperSkin, StreamerSkin } from '../game/catalog';
import { PaperDart, dartSpan } from './PaperDart';
import { StreamerTail } from './StreamerTail';

/** The equipped plane, drawn at any size for menus and shop rows. */
export function PlaneEmblem({
  paper,
  streamer,
  size = 64,
  showStreamer = true,
}: {
  paper: PaperSkin;
  streamer?: StreamerSkin;
  size?: number;
  showStreamer?: boolean;
}) {
  const length = size * 1.55;
  const span = dartSpan(length, paper.foldKind);

  return (
    <View style={{ width: size * 2.05, height: size, justifyContent: 'center', overflow: 'visible' }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.48,
          top: size / 2 - span,
          overflow: 'visible',
        }}
      >
        {showStreamer && streamer ? <StreamerTail streamer={streamer} length={length} /> : null}
        <PaperDart paper={paper} length={length} />
      </View>
    </View>
  );
}
