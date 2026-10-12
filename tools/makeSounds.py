"""
Synthesises the game's sound effects into assets/sfx as small mono WAV files.

Everything is generated from noise and sine waves, so the sounds are original
and can be tweaked by editing this file and running:

    python3 tools/makeSounds.py
"""

import math
import os
import random
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx')


def write(name, samples, peak=0.7):
    top = max(1e-9, max(abs(s) for s in samples))
    scale = peak / top
    frames = b''.join(struct.pack('<h', int(max(-1, min(1, s * scale)) * 32767)) for s in samples)
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(frames)
    print(f'{name}: {len(samples) / RATE:.2f}s')


def noise(n, rng):
    return [rng.uniform(-1, 1) for _ in range(n)]


def lowpass(samples, cutoff_at):
    """One-pole low-pass; cutoff_at(i) gives the cutoff in Hz for sample i."""
    out = []
    y = 0.0
    for i, x in enumerate(samples):
        c = cutoff_at(i)
        a = 1 - math.exp(-2 * math.pi * c / RATE)
        y += a * (x - y)
        out.append(y)
    return out


def highpass(samples, cutoff):
    low = lowpass(samples, lambda _i: cutoff)
    return [x - l for x, l in zip(samples, low)]


def env(n, attack, release, curve=2.0):
    out = []
    for i in range(n):
        t = i / RATE
        if t < attack:
            out.append(t / attack)
        else:
            out.append(max(0.0, 1 - (t - attack) / release) ** curve)
    return out


def mix(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] if i < len(t) else 0 for t in tracks) for i in range(n)]


def tone(freq, seconds, decay, shape='sine', start=0.0):
    n = int(seconds * RATE)
    lead = int(start * RATE)
    out = [0.0] * lead
    for i in range(n):
        t = i / RATE
        phase = 2 * math.pi * freq * t
        if shape == 'triangle':
            v = 2 / math.pi * math.asin(math.sin(phase))
        else:
            v = math.sin(phase)
        attack = min(1.0, t / 0.004)
        out.append(v * attack * math.exp(-t / decay))
    return out


def whoosh(rng):
    n = int(0.42 * RATE)
    sweep = lambda i: 500 + 2600 * math.sin(math.pi * i / n)
    body = lowpass(noise(n, rng), sweep)
    shaped = [s * e for s, e in zip(body, env(n, 0.12, 0.30, 1.6))]
    return highpass(shaped, 180)


def pop(rng):
    n = int(0.16 * RATE)
    burst = highpass(noise(n, rng), 900)
    snap = [s * math.exp(-(i / RATE) / 0.018) for i, s in enumerate(burst)]
    thump = tone(140, 0.12, 0.03)
    return mix(snap, [t * 0.5 for t in thump])


def crunch(rng):
    n = int(0.22 * RATE)
    out = [0.0] * n
    for _ in range(9):
        at = rng.randint(0, int(0.14 * RATE))
        length = rng.randint(int(0.012 * RATE), int(0.04 * RATE))
        grain = lowpass(noise(length, rng), lambda _i: rng.uniform(1400, 3200))
        gain = rng.uniform(0.4, 1.0)
        for i, g in enumerate(grain):
            if at + i < n:
                out[at + i] += g * gain * math.exp(-i / (length * 0.45))
    return highpass(out, 150)


def clink(rng):
    partials = [(2630, 0.16), (3910, 0.11), (5270, 0.08), (6950, 0.05)]
    ring = mix(*[[v * (1 - k * 0.18) for v in tone(f, 0.5, d)] for k, (f, d) in enumerate(partials)])
    tick = highpass(noise(int(0.01 * RATE), rng), 3000)
    return mix(ring, [t * 0.6 for t in tick])


def knock(rng, low=190, decay=0.06):
    body = tone(low, 0.25, decay)
    over = tone(low * 2.7, 0.2, decay * 0.5)
    click = lowpass(noise(int(0.015 * RATE), rng), lambda _i: 2500)
    return mix(body, [o * 0.35 for o in over], [c * 0.5 for c in click])


def chime():
    a = tone(1046.5, 0.7, 0.28)
    b = tone(1568.0, 0.7, 0.22, start=0.06)
    c = tone(2093.0, 0.5, 0.14, start=0.06)
    return mix(a, [x * 0.8 for x in b], [x * 0.3 for x in c])


def fanfare():
    notes = [523.25, 659.25, 783.99, 1046.5]
    parts = []
    for k, f in enumerate(notes):
        last = k == len(notes) - 1
        parts.append(tone(f, 0.9 if last else 0.25, 0.35 if last else 0.09, 'triangle', start=k * 0.11))
        parts.append([x * 0.25 for x in tone(f * 2, 0.6 if last else 0.2, 0.12, start=k * 0.11)])
    return mix(*parts)


def crumple(rng):
    n = int(0.3 * RATE)
    out = [0.0] * n
    for _ in range(14):
        at = rng.randint(0, int(0.22 * RATE))
        length = rng.randint(int(0.006 * RATE), int(0.025 * RATE))
        grain = highpass(noise(length, rng), 1800)
        gain = rng.uniform(0.2, 0.8)
        for i, g in enumerate(grain):
            if at + i < n:
                out[at + i] += g * gain * math.exp(-i / (length * 0.4))
    return lowpass(out, lambda _i: 6000)


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = random.Random(7)
    write('throw.wav', whoosh(rng), 0.55)
    write('pop.wav', pop(rng), 0.85)
    write('crunch.wav', crunch(rng), 0.6)
    write('glass.wav', clink(rng), 0.5)
    write('wood.wav', knock(rng), 0.7)
    write('brick.wav', knock(rng, low=110, decay=0.05), 0.75)
    write('hoop.wav', chime(), 0.45)
    write('clear.wav', fanfare(), 0.5)
    write('crumple.wav', crumple(rng), 0.45)


if __name__ == '__main__':
    main()
