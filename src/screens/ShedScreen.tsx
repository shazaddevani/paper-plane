import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LiveCity } from '../components/LiveCity';
import { PlaneEmblem } from '../components/PlaneEmblem';
import { STICKY, StickyNote, stickyColor, stickyTilt } from '../components/StickyNote';
import { useScreenPadding } from '../components/screenPadding';
import { CoinPill, GhostButton, Label } from '../components/ui';
import { BIRO, BIRO_SOFT } from '../game/constants';
import {
  FoldPower,
  PaperSkin,
  STREAMERS,
  StreamerSkin,
  UPGRADES,
  Upgrade,
  findPaper,
  findStreamer,
  planesOnShelf,
} from '../game/catalog';
import { levelFromXp } from '../game/rewards';
import { EquippedSlots, Profile } from '../storage/profile';

type TabKey = 'paper' | 'streamer' | 'upgrade';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'paper', label: 'Planes' },
  { key: 'streamer', label: 'Streamers' },
  { key: 'upgrade', label: 'Upgrades' },
];

const TAB_COLORS = [STICKY.canary, STICKY.sky, STICKY.mint];
const TAB_TILTS = [-1.6, 1.4, -0.8];

type CatalogEntry = {
  id: string;
  name: string;
  blurb: string;
  price: number;
  levelRequired: number;
  power?: FoldPower;
  workshop?: boolean;
};

function PaperPreview({ paper, streamer }: { paper: PaperSkin; streamer: StreamerSkin }) {
  return (
    <View style={styles.preview}>
      <PlaneEmblem paper={paper} streamer={streamer} size={38} />
    </View>
  );
}

function StreamerPreview({
  paper,
  streamer,
}: {
  paper: PaperSkin;
  streamer: StreamerSkin;
}) {
  return (
    <View style={styles.preview}>
      <PlaneEmblem paper={paper} streamer={streamer} size={42} />
    </View>
  );
}

function markFor(upgrade: Upgrade): string {
  if (upgrade.effect.extraThrows) return '+1';
  if (upgrade.effect.damageScale && upgrade.effect.damageScale > 1) return 'clip';
  if (upgrade.effect.densityScale && upgrade.effect.densityScale > 1) return 'card';
  return 'light';
}

function UpgradePreview({ upgrade }: { upgrade: Upgrade }) {
  return (
    <View style={styles.preview}>
      <View style={styles.upgradeChip}>
        <Text style={styles.upgradeMark}>{markFor(upgrade)}</Text>
      </View>
    </View>
  );
}

export function ShedScreen({
  profile,
  onBuy,
  onEquip,
  onBack,
}: {
  profile: Profile;
  onBuy: (itemId: string, price: number) => void;
  onEquip: (slot: keyof EquippedSlots, itemId: string | null) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<TabKey>('paper');
  const info = levelFromXp(profile.xp);
  const equippedStreamer = findStreamer(profile.equipped.streamer);
  const equippedPaper = findPaper(profile.equipped.paper);

  const entries: { entry: CatalogEntry; preview: React.ReactNode }[] = useMemo(() => {
    switch (tab) {
      case 'paper':
        return planesOnShelf(info.level, profile.unlocked).map((item) => ({
          entry: item,
          preview: <PaperPreview paper={item} streamer={equippedStreamer} />,
        }));
      case 'streamer':
        return STREAMERS.map((item) => ({
          entry: item,
          preview: <StreamerPreview paper={equippedPaper} streamer={item} />,
        }));
      case 'upgrade':
      default:
        return UPGRADES.map((item) => ({
          entry: item,
          preview: <UpgradePreview upgrade={item} />,
        }));
    }
  }, [equippedPaper, equippedStreamer, info.level, profile.unlocked, tab]);

  const equippedId = profile.equipped[tab];
  const padding = useScreenPadding();

  return (
    <LiveCity>
      <ScrollView contentContainerStyle={[styles.scroll, padding]}>
        <View style={styles.header}>
          <View>
            <Label>The Shed</Label>
            <Text style={styles.title}>Spend your coins</Text>
            <Text style={styles.subtitle}>
              Level {info.level} — named folds plus three new workshop planes every level. The
              shelf does not run out.
            </Text>
          </View>
          <View style={styles.headerRight}>
            <CoinPill amount={profile.coins} />
            <GhostButton label="Back" onPress={onBack} />
          </View>
        </View>

        <View style={styles.tabs}>
          {TABS.map((item, i) => (
            <StickyNote
              key={item.key}
              color={tab === item.key ? TAB_COLORS[i] : '#F4EFE4'}
              rotate={TAB_TILTS[i]}
              onPress={() => setTab(item.key)}
              style={styles.tab}
            >
              <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </StickyNote>
          ))}
        </View>

        {tab === 'upgrade' ? (
          <StickyNote color={STICKY.pink} rotate={1.2} onPress={() => onEquip('upgrade', null)}>
            <Text style={styles.plainText}>
              {profile.equipped.upgrade ? 'Fly a plain sheet' : 'Flying a plain sheet'}
            </Text>
          </StickyNote>
        ) : null}

        <View style={styles.grid}>
          {entries.map(({ entry, preview }, i) => {
            const owned = profile.unlocked.includes(entry.id);
            const equipped = equippedId === entry.id;
            const locked = info.level < entry.levelRequired;
            const affordable = profile.coins >= entry.price;

            return (
              <StickyNote
                key={entry.id}
                color={stickyColor(i)}
                rotate={stickyTilt(i)}
                style={[styles.card, locked && styles.cardLocked]}
              >
                {preview}

                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{entry.name}</Text>
                  {entry.workshop ? (
                    <Text style={styles.workshopMark}>Workshop · level {entry.levelRequired}</Text>
                  ) : null}
                  {entry.power ? (
                    <Text style={styles.powerLabel}>
                      {entry.power.name} — {entry.power.detail}
                    </Text>
                  ) : null}
                  <Text style={styles.cardBlurb}>{entry.blurb}</Text>
                </View>

                {locked ? (
                  <View style={styles.lockRow}>
                    <Text style={styles.lockText}>Opens at level {entry.levelRequired}</Text>
                  </View>
                ) : owned ? (
                  <Pressable
                    disabled={equipped}
                    onPress={() => onEquip(tab, entry.id)}
                    style={[styles.action, equipped ? styles.actionEquipped : styles.actionEquip]}
                  >
                    <Text style={[styles.actionText, equipped && styles.actionEquippedText]}>
                      {equipped ? 'Equipped' : 'Equip'}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={!affordable}
                    onPress={() => onBuy(entry.id, entry.price)}
                    style={[styles.action, styles.actionBuy, !affordable && styles.actionDisabled]}
                  >
                    <Text style={styles.actionBuyText}>{entry.price.toLocaleString()} coins</Text>
                  </Pressable>
                )}
              </StickyNote>
            );
          })}
        </View>
      </ScrollView>
    </LiveCity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  scroll: { gap: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 8,
  },
  headerRight: { alignItems: 'flex-end', gap: 10 },
  title: { color: '#F4EFE4', fontSize: 26, fontWeight: '800', marginTop: 8, textAlign: 'left' },
  subtitle: {
    color: 'rgba(244, 239, 228, 0.72)',
    fontSize: 12,
    marginTop: 11,
    textAlign: 'left',
  },
  tabs: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  tab: { paddingRight: 4 },
  tabLabel: { ...BIRO_SOFT, fontSize: 13, fontWeight: '800' },
  tabLabelActive: { ...BIRO },
  plainText: { ...BIRO, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    flexGrow: 1,
    flexBasis: 210,
    maxWidth: 320,
    gap: 12,
  },
  cardLocked: { opacity: 0.55 },
  preview: {
    height: 70,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'visible',
  },
  upgradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1E2A44',
  },
  upgradeMark: { color: '#FFE56A', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardText: { gap: 8 },
  cardName: { ...BIRO, fontSize: 15, fontWeight: '800', textAlign: 'left' },
  workshopMark: { ...BIRO_SOFT, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  powerLabel: { ...BIRO, fontSize: 12, fontWeight: '800', textAlign: 'left', color: '#6B3A1E' },
  cardBlurb: { ...BIRO_SOFT, fontSize: 12, lineHeight: 17, textAlign: 'left' },
  action: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1E2A44',
  },
  actionBuy: { backgroundColor: '#1E2A44' },
  actionEquip: { backgroundColor: '#1E2A44' },
  actionEquipped: { backgroundColor: '#2F5A38' },
  actionDisabled: { opacity: 0.4 },
  actionText: { color: '#FFE56A', fontSize: 13, fontWeight: '800' },
  actionEquippedText: { color: '#D7F0C8' },
  actionBuyText: { color: '#FFE56A', fontSize: 13, fontWeight: '800' },
  lockRow: { paddingVertical: 10, alignItems: 'flex-start' },
  lockText: { ...BIRO_SOFT, fontSize: 12, fontWeight: '700', textAlign: 'left' },
});
