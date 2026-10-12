"""
Composes the game's background music into assets/sfx/music.wav: a calm,
seamless loop of soft chords, a plucked pattern, a light bell melody and a
gentle bass, in C major at an easy walking pace.

Every note that runs past the end of the loop is wrapped back onto the start,
so the last bar flows straight into the first with no click or gap. Change the
progression or tempo below and run:

    python3 tools/makeMusic.py
"""

import math
import os
import random
import struct
import wave

RATE = 22050
BPM = 80
BEAT = 60 / BPM
BARS = 8
LENGTH = int(round(BARS * 4 * BEAT * RATE))
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx', 'music.wav')

NOTE_INDEX = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def freq(name):
    """'A4' -> 440 Hz."""
    pitch, octave = name[:-1], int(name[-1])
    semis = NOTE_INDEX[pitch] + (octave - 4) * 12 - 9
    return 440.0 * (2 ** (semis / 12))


# One chord per bar: pad voicing, bass root, and the tones the pluck walks over.
PROGRESSION = [
    (['C4', 'E4', 'G4', 'B4'], 'C2', ['C4', 'G4', 'E5', 'G4', 'B4', 'G4', 'E5', 'G4']),
    (['A3', 'C4', 'E4', 'G4'], 'A1', ['A3', 'E4', 'C5', 'E4', 'G4', 'E4', 'C5', 'E4']),
    (['F3', 'A3', 'C4', 'E4'], 'F1', ['F3', 'C4', 'A4', 'C4', 'E4', 'C4', 'A4', 'C4']),
    (['G3', 'B3', 'D4', 'E4'], 'G1', ['G3', 'D4', 'B4', 'D4', 'E4', 'D4', 'B4', 'D4']),
    (['C4', 'E4', 'G4', 'B4'], 'C2', ['C4', 'G4', 'E5', 'G4', 'B4', 'G4', 'E5', 'G4']),
    (['E3', 'G3', 'B3', 'D4'], 'E2', ['E3', 'B3', 'G4', 'B3', 'D4', 'B3', 'G4', 'B3']),
    (['F3', 'A3', 'C4', 'E4'], 'F1', ['F3', 'C4', 'A4', 'C4', 'E4', 'C4', 'A4', 'C4']),
    (['G3', 'C4', 'D4', 'F4'], 'G1', ['G3', 'D4', 'C5', 'D4', 'B4', 'D4', 'G4', 'D4']),
]

# A few bell notes on the chord tones: (bar, beat, note).
MELODY = [
    (0, 0, 'E5'), (0, 2.5, 'G5'),
    (1, 1, 'E5'), (1, 3, 'C5'),
    (2, 0, 'A4'), (2, 2, 'C5'),
    (3, 1.5, 'D5'), (3, 3, 'B4'),
    (4, 0, 'G5'), (4, 2, 'E5'),
    (5, 1, 'G5'), (5, 2.5, 'B4'),
    (6, 0, 'A4'), (6, 2, 'C5'), (6, 3, 'E5'),
    (7, 1, 'D5'), (7, 3, 'G4'),
]

buffer = [0.0] * LENGTH


def add_note(start_s, f, seconds, gain, attack, decay=None, partials=((1, 1.0),), detune=0.0, release=0.0):
    """Mix a note into the loop, wrapping anything past the end onto the start."""
    start = int(start_s * RATE)
    n = int((seconds + release) * RATE)
    two_pi = 2 * math.pi
    for i in range(n):
        t = i / RATE
        if t < attack:
            amp = t / attack
        elif decay is not None:
            amp = math.exp(-(t - attack) / decay)
        else:
            amp = 1.0
        if release and t > seconds:
            amp *= max(0.0, 1 - (t - seconds) / release)
        if amp < 1e-4:
            continue
        v = 0.0
        for mult, weight in partials:
            v += weight * math.sin(two_pi * f * mult * t)
            if detune:
                v += weight * math.sin(two_pi * f * mult * (1 + detune) * t)
        buffer[(start + i) % LENGTH] += v * amp * gain


def main():
    rng = random.Random(3)
    bar_s = 4 * BEAT
    for bar, (pad, bass, pluck) in enumerate(PROGRESSION):
        t0 = bar * bar_s
        # Pad: slow swell, two slightly detuned sines per note for warmth.
        for note in pad:
            add_note(t0, freq(note), bar_s, 0.045, attack=0.9, partials=((1, 1.0), (2, 0.08)),
                     detune=0.003, release=1.1)
        # Bass: soft roots on beats 1 and 3.
        for beat in (0, 2):
            add_note(t0 + beat * BEAT, freq(bass), 1.6, 0.16, attack=0.02, decay=0.7,
                     partials=((1, 1.0), (2, 0.25)))
        # Pluck: gentle eighth notes, a little uneven so it breathes.
        for k, note in enumerate(pluck):
            gain = 0.07 * (1.0 if k % 2 == 0 else 0.72) * rng.uniform(0.9, 1.05)
            add_note(t0 + k * BEAT / 2, freq(note), 0.9, gain, attack=0.006, decay=0.32,
                     partials=((1, 1.0), (3, 0.12), (4, 0.04)))

    # Bell melody, soft and round.
    for bar, beat, note in MELODY:
        add_note(bar * bar_s + beat * BEAT, freq(note), 2.0, 0.06, attack=0.01, decay=0.9,
                 partials=((1, 1.0), (2, 0.18), (3, 0.05)))

    peak = max(abs(s) for s in buffer) or 1.0
    scale = 0.62 / peak
    frames = b''.join(struct.pack('<h', int(max(-1, min(1, s * scale)) * 32767)) for s in buffer)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with wave.open(OUT, 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(frames)
    print(f'music.wav: {LENGTH / RATE:.2f}s loop, {BPM} bpm, {BARS} bars')


if __name__ == '__main__':
    main()
