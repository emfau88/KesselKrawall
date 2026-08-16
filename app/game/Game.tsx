"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArtSprite,
  BackdropImage,
  ITEM_ART,
  ITEM_PROJECTILE_ART,
  OPPONENT_ART,
  OPPONENT_CAULDRON_ART,
  preloadArtAssets,
  UiIcon,
  type ArtAsset,
  type UiAsset,
} from "./ArtSprite";
import {
  createCombatBeats,
  createEmptyCombatStatuses,
  getCombatBeatSoundCue,
  getCombatBeatTiming,
  getImportantCombatMessage,
  isStatusTick,
  selectContributionVfxEvent,
  type CombatBeatTier,
  type CombatContribution,
  type CombatSideStatus,
  type CombatStatusSnapshot,
  type TimedCombatStatus,
} from "./combatPresentation";
import {
  createCombatActivationTimeline,
  getCombatCooldownState,
  type CombatActivationTimeline,
} from "./combatCooldownTimeline";
import {
  createFloatingCombatNumbers,
  mergeFloatingCombatNumbers,
  pruneExpiredFloatingNumbers,
  type FloatingCombatNumber,
} from "./combatFloatingNumbers";
import { getItemInsights, type ItemInsights } from "./itemInsights";
import {
  campaignText,
  familyText,
  formatDecimal,
  I18nProvider,
  itemDescription,
  itemName,
  opponentText,
  translate,
  translateCombatAmount,
  translateCombatLabel,
  translateGameError,
  useI18n,
  type Language,
} from "./i18n";
import {
  activateGameAudio,
  playCombatSound,
  playGameSound,
  preloadGameAudio,
  resolveCombatSound,
  resolveGameAudioScene,
  setCombatSoundsEnabled as setCombatSoundsPlaybackEnabled,
  setGameAudioScene,
  stopGameAudio,
} from "./audio";
import {
  CAMPAIGNS,
  getCampaign,
  getCampaignFamilies,
  LEGACY_FAMILIES,
} from "./campaigns";
import { FAMILY_META, ITEM_BY_ID } from "./data";
import {
  advancePresentationFrame,
  CLOCK_PAINT_INTERVAL_MS,
  interpolateVisibleBattleTime,
  PresentationScheduler,
} from "./presentationTimeline";
import {
  getItemCooldownMs,
  getKesselHeatDamageMultiplier,
  KESSEL_HEAT_START_MS,
  POISON_BURST_THRESHOLD,
  simulateBattle,
} from "./simulation";
import {
  advanceAfterBattle,
  beginBattle,
  buyOffer,
  createInitialState,
  enterOpeningShop,
  getBattleReward,
  getCurrentOpponent,
  getFamilyWeights,
  getPowerBreakdown,
  getPowerValue,
  getPurchaseMergePreview,
  getRoundReward,
  getSellValue,
  isOpeningDefeatProtected,
  RESERVE_UNLOCK_ROUND,
  rerollShop,
  resetRun,
  selectOrSwapSlot,
  sellReserve,
  sellSlot,
  showBattleResult,
  swapSlotWithReserve,
} from "./state";
import {
  createEmptyProgress,
  hasCompletedCampaign,
  loadPlayerProgress,
  loadStoredGame,
  persistGame,
  persistPlayerProgress,
  recordCampaignVictory,
} from "./storage";
import type {
  Board,
  CampaignId,
  CombatEvent,
  CombatEventKind,
  CombatResult,
  Family,
  GameState,
  ItemCombatStats,
  ItemDefinition,
  ItemLevel,
  LegacyFamily,
  OpponentDefinition,
  PlayerProgress,
  Side,
} from "./types";

const ROMAN_LEVEL = ["", "I", "II", "III"] as const;
const BUILD_HASH = process.env.NEXT_PUBLIC_BUILD_SHA ?? "local";
const COMBAT_SOUNDS_STORAGE_KEY = "kessel-krawall:combat-sounds";
const SHARED_COMBAT_PRELOAD_ASSETS = [
  "vfx-fire",
  "vfx-fire-projectile",
  "vfx-dragon-tooth-projectile",
  "vfx-ember-core-projectile",
  "vfx-cinder-berry-projectile",
  "vfx-poison",
  "vfx-poison-projectile",
  "vfx-nightwing-projectile",
  "vfx-witch-eye-projectile",
  "vfx-venom-bulb-projectile",
  "vfx-shield",
  "vfx-ward-bloom",
  "vfx-gold-spoon-projectile",
  "vfx-moon-salt-projectile",
  "vfx-impact",
] as const satisfies readonly ArtAsset[];

const CAMPAIGN_PRELOAD_ASSETS: Record<CampaignId, readonly ArtAsset[]> = {
  "grand-tournament": [
  "cauldron-zischbert",
  "cauldron-moor-martha",
  "cauldron-schild-siggi",
  "cauldron-knister-klara",
  "cauldron-tox-toni",
  "cauldron-broesel-berta",
  "cauldron-meisterin-mirea",
  "cauldron-boss",
  ],
  "frostbound-vault": [
    "cauldron-reif-rudi",
    "cauldron-hall-hanne",
    "cauldron-eis-elsa",
    "cauldron-takt-tilda",
    "cauldron-splitter-sven",
    "cauldron-resonanz-rosa",
    "cauldron-archivarin-aeva",
    "cauldron-chronokessel",
    "vfx-frost-shard-projectile",
    "vfx-ice-bell-projectile",
    "vfx-rime-clock-projectile",
    "vfx-mirror-shard-projectile",
    "vfx-echo-bell-projectile",
    "vfx-time-thread-projectile",
    "vfx-frost-stasis",
    "vfx-echo-afterimage",
  ],
};
type AppScreen = "menu" | "cabinet" | "game";

interface BattleView {
  beatId: string;
  time: number;
  eventDuration: number;
  shotStaggerMs: number;
  playerHp: number;
  playerShield: number;
  enemyHp: number;
  enemyShield: number;
  activeUids: string[];
  event: CombatEvent | null;
  eventLabel: string | null;
  eventAmount: string | null;
  tier: CombatBeatTier | null;
  contributions: CombatContribution[];
  focusedContributionId: string | null;
  landedContributionIds: string[];
  impactEvent: CombatEvent | null;
  impactContributionId: string | null;
  statuses: CombatStatusSnapshot;
  impactLanded: boolean;
}

interface MergeNotice {
  label: string;
  art: ArtAsset;
  family: Family;
  fromLevel: ItemLevel;
  toLevel: ItemLevel;
  valueLabel: string;
  oldValue: number;
  newValue: number;
  oldCooldown: number;
  newCooldown: number;
  powerBefore: number;
  powerAfter: number;
  bonus: string | null;
  targetArea: "board" | "reserve";
  step: number;
  total: number;
}

interface GoldTransferEffect {
  id: number;
  kind: "spend" | "earn";
  amount: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  hud: { x: number; y: number };
}

interface EventSource {
  itemId: string;
  name: string;
  art: ArtAsset;
  family: Family;
  slot: number;
  side: Side;
  cadenceLabel: string;
}

interface VfxTiming {
  chargeMs: number;
  flightMs: number;
  impactAtMs: number;
  impactMs: number;
}

interface VfxGeometry {
  style: CSSProperties;
}

type WebkitFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "portrait") => Promise<void>;
};

function familyClass(family: Family): string {
  return `family-${family}`;
}

const FAMILY_ICON: Record<Family, UiAsset> = {
  fire: "family-fire",
  poison: "family-poison",
  guard: "family-guard",
  frost: "family-frost",
  echo: "family-echo",
};

function eventIcon(kind: CombatEventKind): UiAsset {
  switch (kind) {
    case "poison":
    case "poisonBurst":
      return "status-poison";
    case "burn":
      return "status-burn";
    case "heal":
      return "status-heal";
    case "shield":
    case "cleanse":
    case "synergy":
      return "shield";
    case "frost":
      return "speed";
    case "echo":
      return "power";
    case "boss":
      return "status-rage";
    default:
      return "battle";
  }
}

function mergeValueLabel(
  definition: ItemDefinition,
  language: Language,
): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  switch (definition.effect) {
    case "poison":
      return t("poisonStacks");
    case "shield":
    case "shieldDamage":
      return t("shield");
    case "heal":
    case "hybrid":
      return t("healing");
    default:
      return t("damage");
  }
}

function mergeBonusLabel(
  definition: ItemDefinition,
  level: ItemLevel,
  language: Language,
): string | null {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  if (level !== 3) return null;
  switch (definition.levelThreeBonus) {
    case "burn":
      return t("newBurn");
    case "cleansePoison":
      return t("newCleanse");
    case "overhealShield":
      return t("newOverheal");
    default:
      return t("maxLevel");
  }
}

function getMergeDurationMs(level: ItemLevel): number {
  return getMergeMotionDurationMs(level) + 350;
}

function getMergeMotionDurationMs(level: ItemLevel): number {
  return level === 3 ? 2_100 : 1_700;
}

function findEventSource(
  event: CombatEvent | null,
  playerBoard: Board,
  enemyBoard: Board,
  language: Language,
): EventSource | null {
  if (!event) return null;
  const board = event.actor === "player" ? playerBoard : enemyBoard;
  const slot = board.findIndex((instance) => instance?.uid === event.sourceUid);
  const instance = slot >= 0 ? board[slot] : null;
  if (!instance) return null;
  const definition = ITEM_BY_ID[instance.itemId];
  return {
    itemId: definition.id,
    name: itemName(definition, language),
    art: ITEM_ART[definition.id],
    family: definition.family,
    slot,
    side: event.actor,
    cadenceLabel:
      definition.trigger?.type === "onGuardedHit"
        ? translate(language, "counterCooldown", {
            time: formatCooldown(getItemCooldownMs(board, slot), language),
          })
        : definition.trigger?.type === "emergency"
          ? translate(language, "emergencyOnce", {
              percent: Math.round(definition.trigger.threshold * 100),
            })
          : definition.trigger?.type === "ramp"
            ? translate(language, "growsStronger", {
                time: formatCooldown(getItemCooldownMs(board, slot), language),
              })
            : translate(language, "everyCadence", {
                time: formatCooldown(getItemCooldownMs(board, slot), language),
              }),
  };
}

function formatCooldown(milliseconds: number, language: Language): string {
  return `${formatDecimal(milliseconds / 1_000, language)}${
    language === "en" ? "s" : " s"
  }`;
}

function formatEffectDuration(
  milliseconds: number,
  language: Language,
): string {
  if (milliseconds < 1_000) return language === "en" ? "<1s" : "<1 s";
  return `${formatDecimal(Math.ceil(milliseconds / 100) / 10, language)}${
    language === "en" ? "s" : " s"
  }`;
}

function TimedStatusBadge({
  label,
  asset,
  status,
  battleTime,
  className,
}: {
  label: string;
  asset: UiAsset;
  status: TimedCombatStatus;
  battleTime: number;
  className: string;
}) {
  const { language, t } = useI18n();
  const remaining = Math.max(0, status.expiresAt - battleTime);
  if (status.stacks <= 0 || remaining <= 0) return null;

  const untilTick = Math.max(0, status.nextTickAt - battleTime);
  const progress = status.interval > 0
    ? Math.max(0, Math.min(1, 1 - untilTick / status.interval))
    : 0;
  const description =
    label === t("poison")
      ? t("poisonDescription", {
          stacks: status.stacks,
          threshold: POISON_BURST_THRESHOLD,
          damage: Math.ceil(status.stacks / 2),
          tick: formatEffectDuration(untilTick, language),
        })
      : t("timedStatusDescription", {
          label,
          stacks: status.stacks,
          remaining: formatEffectDuration(remaining, language),
          tick: formatEffectDuration(untilTick, language),
        });
  const style = {
    "--status-progress": `${progress * 100}%`,
  } as CSSProperties;

  return (
    <span
      className={`combat-status ${className}`}
      style={style}
      title={description}
      aria-label={description}
    >
      <span className="status-icon-shell">
        <UiIcon asset={asset} className="status-icon" />
      </span>
      <span className="status-value">
        <b>{status.stacks}</b>
        <small>{label}</small>
      </span>
      <span className="status-timing" aria-hidden="true">
        <small>{t("tickTime", { time: formatEffectDuration(untilTick, language) })}</small>
        <i className="status-progress">
          <span />
        </i>
      </span>
    </span>
  );
}

function CombatStatusRow({
  status,
  shield,
  battleTime,
}: {
  status: CombatSideStatus;
  shield: number;
  battleTime: number;
}) {
  const { t } = useI18n();
  return (
    <div className="combat-status-row" aria-label={t("activeCombatEffects")}>
      {shield > 0 && (
        <span
          className="combat-status status-shield"
          title={t("shieldDescription", { shield })}
          aria-label={t("shieldAria", { shield })}
        >
          <span className="status-icon-shell">
            <UiIcon asset="shield" className="status-icon" />
          </span>
          <span className="status-value">
            <b>{shield}</b>
            <small>{t("shield")}</small>
          </span>
          <small className="status-duration">{t("remains")}</small>
        </span>
      )}
      <TimedStatusBadge
        label={t("poison")}
        asset="status-poison"
        status={status.poison}
        battleTime={battleTime}
        className="status-poison"
      />
      <TimedStatusBadge
        label={t("burn")}
        asset="status-burn"
        status={status.burn}
        battleTime={battleTime}
        className="status-burn"
      />
      {status.rage && (
        <span
          className="combat-status status-rage"
          title={t("rageDescription")}
          aria-label={t("rageAria")}
        >
          <span className="status-icon-shell">
            <UiIcon asset="status-rage" className="status-icon" />
          </span>
          <span className="status-value">
            <b>+25%</b>
            <small>{t("rage")}</small>
          </span>
          <small className="status-duration">{t("permanent")}</small>
        </span>
      )}
      {status.timeFracture && (
        <span
          className="combat-status status-time-fracture"
          title={t("timeFractureDescription")}
          aria-label={t("timeFractureAria")}
        >
          <span className="status-icon-shell">
            <UiIcon asset="speed" className="status-icon" />
          </span>
          <span className="status-value">
            <b>+15%</b>
            <small>{t("timeFracture")}</small>
          </span>
          <small className="status-duration">{t("permanent")}</small>
        </span>
      )}
    </div>
  );
}

function HealthBar({
  hp,
  maxHp,
  shield,
  label,
  status,
  battleTime,
  showStatuses,
}: {
  hp: number;
  maxHp: number;
  shield: number;
  label: string;
  status: CombatSideStatus;
  battleTime: number;
  showStatuses: boolean;
}) {
  const { t } = useI18n();
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const healthHue = Math.round(hpPercent * 1.15);
  const healthColor = `hsl(${healthHue} 72% 50%)`;
  return (
    <div className="health-cluster" aria-label={t("healthAria", { label, hp, shield })}>
      <div className="health-meta">
        <UiIcon asset="health" className="health-icon" />
        <span>{label}</span>
        <strong>{Math.max(0, hp)} / {maxHp}</strong>
        {shield > 0 && (
          <span className="shield-value">
            <UiIcon asset="shield" className="health-icon" />
            {shield}
          </span>
        )}
      </div>
      <div className="health-track">
        <span
          style={{
            width: `${hpPercent}%`,
            backgroundColor: healthColor,
            color: healthColor,
          }}
        />
      </div>
      {showStatuses && (
        <CombatStatusRow
          status={status}
          shield={shield}
          battleTime={battleTime}
        />
      )}
    </div>
  );
}

function CombatFloatingNumberLayer({
  numbers,
}: {
  numbers: readonly FloatingCombatNumber[];
}) {
  const { t } = useI18n();
  if (numbers.length === 0) return null;

  return (
    <div className="combat-number-layer" aria-hidden="true">
      {numbers.map((number) => (
        <span
          className={`combat-floating-number is-${number.type} ${
            number.hitCount > 1 ? "is-bundle" : ""
          }`}
          data-floating-number={number.id}
          data-number-type={number.type}
          data-hit-count={number.hitCount}
          data-created-at={number.createdAt}
          data-expires-at={number.expiresAt}
          key={number.id}
          style={
            {
              "--number-lifetime": `${number.expiresAt - number.createdAt}ms`,
            } as CSSProperties
          }
        >
          <strong>
            {number.type === "damage" ||
            number.type === "poison" ||
            number.type === "burn"
              ? "−"
              : "+"}
            {number.value}
          </strong>
          <small>
            {number.hitCount > 1 ? `${number.hitCount}× ` : ""}
            {t(
              number.type === "damage"
                ? "hit"
                : number.type === "heal"
                  ? "healing"
                  : number.type,
            )}
          </small>
        </span>
      ))}
    </div>
  );
}

function CauldronBoard({
  board,
  side,
  cauldronAsset,
  cauldronVariant,
  selectedSlot,
  activeUids = [],
  hitKind,
  interactive,
  onSlot,
  compact = false,
  showCauldron = true,
  combatActive = false,
  combatTime = 0,
  activationTimesByUid = new Map(),
  floatingNumbers = [],
  insightTargetSlots = [],
  insightSourceSlots = [],
}: {
  board: Board;
  side: "player" | "enemy";
  cauldronAsset: ArtAsset;
  cauldronVariant?: string;
  selectedSlot: number | null;
  activeUids: readonly string[];
  hitKind: CombatEventKind | null;
  interactive: boolean;
  onSlot?: (slot: number) => void;
  compact?: boolean;
  showCauldron?: boolean;
  combatActive?: boolean;
  combatTime?: number;
  activationTimesByUid?: CombatActivationTimeline;
  floatingNumbers?: readonly FloatingCombatNumber[];
  insightTargetSlots?: readonly number[];
  insightSourceSlots?: readonly number[];
}) {
  const { language, t } = useI18n();
  const reactionKey = `${hitKind ?? "idle"}-${
    activeUids.join("-") || "rest"
  }`;

  return (
    <div
      className={[
        "cauldron-board",
        compact ? "is-compact" : "",
        showCauldron ? "" : "without-cauldron",
        hitKind ? `is-reacting reaction-${hitKind}` : "",
      ].join(" ")}
      data-side={side}
      data-cauldron-variant={cauldronVariant}
    >
      {showCauldron && (
        <div
          className="cauldron"
          aria-hidden="true"
        >
          <span className="cauldron-aura" />
          <ArtSprite
            key={reactionKey}
            asset={cauldronAsset}
            className="cauldron-art"
          />
          {cauldronVariant && (
            <>
              <span className="cauldron-character-effect effect-one" />
              <span className="cauldron-character-effect effect-two" />
              <span className="cauldron-particle-field">
                <i className="cauldron-particle particle-one" />
                <i className="cauldron-particle particle-two" />
                <i className="cauldron-particle particle-three" />
                <i className="cauldron-particle particle-four" />
                <i className="cauldron-particle particle-five" />
                <i className="cauldron-particle particle-six" />
              </span>
            </>
          )}
          {!cauldronVariant && (
            <>
              <span className="cauldron-steam steam-one" />
              <span className="cauldron-steam steam-two" />
            </>
          )}
        </div>
      )}
      <CombatFloatingNumberLayer numbers={floatingNumbers} />
      <div className="slot-arc">
        {board.map((instance, slot) => {
          const definition = instance ? ITEM_BY_ID[instance.itemId] : null;
          const rawCooldown =
            definition && combatActive ? getItemCooldownMs(board, slot) : 0;
          // The simulation schedules actions on a 100 ms raster.
          const cooldown =
            rawCooldown > 0 ? Math.round(rawCooldown / 100) * 100 : 0;
          const baseCooldown =
            definition && instance
              ? definition.cooldown[instance.level - 1] * 1000
              : 0;
          const isHasted =
            definition !== null &&
            combatActive &&
            rawCooldown > 0 &&
            rawCooldown < baseCooldown - 1;
          const isInsightTarget = insightTargetSlots.includes(slot);
          const isInsightSource = insightSourceSlots.includes(slot);
          const trigger = definition?.trigger;
          const activationTimes =
            instance && combatActive
              ? activationTimesByUid.get(instance.uid) ?? []
              : [];
          const cooldownState = getCombatCooldownState({
            battleTime: combatTime,
            activationTimes,
            fallbackCooldown: cooldown,
            startsReady: trigger?.type === "onGuardedHit",
          });
          const emergencyUsed =
            trigger?.type === "emergency" &&
            cooldownState.lastActivationAt !== null;
          const cooldownProgress =
            cooldown <= 0 || trigger?.type === "emergency"
              ? 0
              : cooldownState.progress;
          const cadenceLabel =
            trigger?.type === "onGuardedHit"
              ? t("counterCadence", {
                  time: formatCooldown(cooldown, language),
                })
              : trigger?.type === "emergency"
                ? t("emergencyLife", {
                    percent: Math.round(trigger.threshold * 100),
                    used: emergencyUsed ? t("alreadyTriggered") : "",
                  })
                : cooldown > 0
                  ? t("everyCadence", {
                      time: formatCooldown(cooldown, language),
                    })
                  : "";
          const slotLabel = definition
            ? t("slotItem", {
                slot: slot + 1,
                item: itemName(definition, language),
                level: instance!.level,
                cadence: cadenceLabel
                  ? t("cadenceSuffix", { cadence: cadenceLabel })
                  : "",
                haste: isHasted ? t("permanentlyHastedSuffix") : "",
              })
            : t("slotEmpty", { slot: slot + 1 });
          const insightLabel = isInsightTarget
            ? t("affectsSelectedSuffix")
            : isInsightSource
              ? t("benefitsSelectedSuffix")
              : "";
          const content = (
            <>
              {definition ? (
                <>
                  <ArtSprite
                    asset={ITEM_ART[definition.id]}
                    className="item-icon"
                  />
                  <span className="item-level">{ROMAN_LEVEL[instance!.level]}</span>
                  <span className={`item-family-dot ${familyClass(definition.family)}`} />
                  {combatActive && trigger?.type === "onGuardedHit" && (
                    <span
                      className="slot-trigger-badge is-reactive"
                      title={t("counterCooldown", {
                        time: formatCooldown(cooldown, language),
                      })}
                      aria-hidden="true"
                    >
                      <UiIcon asset="speed" className="slot-trigger-icon" />
                    </span>
                  )}
                  {combatActive && trigger?.type === "emergency" && (
                    <span
                      className={`slot-trigger-badge is-emergency ${
                        emergencyUsed ? "is-used" : ""
                      }`}
                      title={
                        emergencyUsed
                          ? t("emergencyUsed")
                          : t("emergencyAvailable", {
                              percent: Math.round(trigger.threshold * 100),
                            })
                      }
                      aria-hidden="true"
                    >
                      {emergencyUsed ? "✓" : "1×"}
                    </span>
                  )}
                  {isHasted && (
                    <span
                      className="slot-haste-badge"
                      title={t("permanentlyHasted")}
                      aria-hidden="true"
                    >
                      <UiIcon asset="speed" className="slot-haste-icon" />
                    </span>
                  )}
                </>
              ) : (
                <span className="empty-plus" aria-hidden="true">+</span>
              )}
            </>
          );
          const className = [
            "board-slot",
            instance ? "is-filled" : "is-empty",
            combatActive && instance ? "is-cooling" : "",
            selectedSlot === slot ? "is-selected" : "",
            isInsightTarget ? "is-insight-target" : "",
            isInsightSource ? "is-insight-source" : "",
            instance && activeUids.includes(instance.uid) ? "is-active" : "",
            definition ? familyClass(definition.family) : "",
          ].join(" ");
          const slotStyle =
            definition && combatActive && trigger?.type !== "emergency"
            ? ({
                "--cooldown-progress": `${cooldownProgress * 100}%`,
                "--cooldown-color": FAMILY_META[definition.family].color,
              } as CSSProperties)
            : undefined;

          return interactive ? (
            <button
              key={slot}
              type="button"
              className={className}
              data-slot={slot}
              data-audio="manual"
              onClick={() => onSlot?.(slot)}
              aria-label={`${slotLabel}${insightLabel}`}
              aria-pressed={selectedSlot === slot}
              style={slotStyle}
            >
              {content}
              {definition && combatActive && trigger?.type !== "emergency" && (
                <span className="cooldown-fill" aria-hidden="true" />
              )}
            </button>
          ) : (
            <div
              key={slot}
              className={className}
              data-slot={slot}
              aria-label={`${slotLabel}${insightLabel}`}
              style={slotStyle}
            >
              {content}
              {definition && combatActive && trigger?.type !== "emergency" && (
                <span className="cooldown-fill" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReservePocket({
  item,
  selected,
  onClick,
}: {
  item: GameState["reserve"];
  selected: boolean;
  onClick: () => void;
}) {
  const { language, t } = useI18n();
  const definition = item ? ITEM_BY_ID[item.itemId] : null;
  const label = definition
    ? t("reserveItemAria", {
        item: itemName(definition, language),
        level: item!.level,
      })
    : t("reserveEmptyAria");

  return (
    <div className="reserve-pocket">
      <span className="reserve-pocket-label" aria-hidden="true">
        {t("reserve")}
        <small>{t("passive")}</small>
      </span>
      <button
        type="button"
        className={[
          "board-slot",
          "reserve-slot",
          item ? "is-filled" : "is-empty",
          selected ? "is-selected" : "",
          definition ? familyClass(definition.family) : "",
        ].join(" ")}
        onClick={onClick}
        aria-label={label}
        aria-pressed={selected}
        data-audio="manual"
        data-testid="reserve-slot"
      >
        {definition ? (
          <>
            <ArtSprite
              asset={ITEM_ART[definition.id]}
              className="item-icon"
            />
            <span className="item-level">{ROMAN_LEVEL[item!.level]}</span>
            <span className={`item-family-dot ${familyClass(definition.family)}`} />
          </>
        ) : (
          <span className="empty-plus" aria-hidden="true">+</span>
        )}
      </button>
    </div>
  );
}

function SynergyStrip({
  board,
  families,
}: {
  board: Board;
  families: readonly Family[];
}) {
  const { language, t } = useI18n();
  const weights = getFamilyWeights(board);
  return (
    <div className="synergy-strip" aria-label={t("familySynergies")}>
      {families.map((family) => {
        const rawMeta = FAMILY_META[family];
        const meta = {
          ...rawMeta,
          ...familyText(family, language, rawMeta),
        };
        const active = weights[family] >= 3;
        const shownWeight = Math.min(weights[family], 3);
        return (
          <div
            key={family}
            className={`synergy-pill ${familyClass(family)} ${active ? "is-active" : ""}`}
            title={meta.shortBonus}
            aria-label={`${meta.name}: ${shownWeight}/3. ${
              active
                ? t("familyAriaActive", { bonus: meta.shortBonus })
                : t("familyAriaMissing", { count: 3 - shownWeight })
            }`}
          >
            <span className="synergy-heading">
              <UiIcon asset={FAMILY_ICON[family]} className="synergy-icon" />
              <b>{meta.name}</b>
              <strong>{shownWeight}/3</strong>
            </span>
            <span className="synergy-bonus">
              {active
                ? meta.shortBonus
                : t("missingToBonus", { count: 3 - shownWeight })}
            </span>
            <span className="synergy-progress" aria-hidden="true">
              <i style={{ width: `${(shownWeight / 3) * 100}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OpponentPreparationCard({
  opponent,
  power,
  variant,
}: {
  opponent: OpponentDefinition;
  power: number;
  variant: number;
}) {
  const { language, t } = useI18n();
  const localizedOpponent = opponentText(opponent, language);
  return (
    <details className="next-opponent-card">
      <summary>
        <span className="prep-opponent-emblem" aria-hidden="true">
          <ArtSprite
            asset={OPPONENT_ART[opponent.id]}
            className="prep-opponent-portrait"
          />
          {opponent.rank !== "regular" && (
            <UiIcon asset="elite" className="prep-opponent-rank" />
          )}
        </span>
        <span className="prep-opponent-copy">
          <span className="eyebrow">
            {t("nextOpponent")}
            {opponent.rank === "boss"
              ? " · BOSS"
              : opponent.rank === "elite"
                ? " · ELITE"
                : ""}
          </span>
          <strong>{localizedOpponent.name}</strong>
          <small>{localizedOpponent.title}</small>
        </span>
        <span className="prep-details-label">
          {t("details")} <i aria-hidden="true">⌄</i>
        </span>
      </summary>
      <div className="prep-opponent-details">
        <div className="prep-opponent-meta">
          <span>
            <UiIcon asset="health" className="prep-stat-icon" />
            {opponent.baseHp} {language === "en" ? "HP" : "LP"}
          </span>
          <span>
            <UiIcon asset="power" className="prep-stat-icon" />
            ≈ {power}
          </span>
          <span>
            {t("variant", {
              current: variant + 1,
              total: 1 + (opponent.boardVariants?.length ?? 0),
            })}
          </span>
        </div>
        <p>{localizedOpponent.threat}</p>
        <ul>
          {opponent.board.map((instance, slot) => {
            const definition = instance
              ? ITEM_BY_ID[instance.itemId]
              : null;
            return (
              <li key={slot}>
                <span>{t("slot", { slot: slot + 1 })}</span>
                {definition ? (
                  <>
                    <ArtSprite
                      asset={ITEM_ART[definition.id]}
                      className="prep-detail-item"
                    />
                    <strong>
                      {itemName(definition, language)} {ROMAN_LEVEL[instance!.level]}
                    </strong>
                    <small>
                      {itemDescription(definition, instance!.level, language)}
                    </small>
                  </>
                ) : (
                  <em>{t("empty")}</em>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

function offerSynergyLabel(
  board: Board,
  family: Family,
  language: Language,
): string {
  const current = Math.min(getFamilyWeights(board)[family], 3);
  const familyName = familyText(family, language, FAMILY_META[family]).name;
  if (current >= 3) {
    return translate(language, "synergyActive", { family: familyName });
  }
  if (current === 2) {
    return translate(language, "activatesSynergy", { family: familyName });
  }
  return translate(language, "synergyProgress", {
    family: familyName,
    current,
    next: current + 1,
  });
}

function StatsList({ stats }: { stats: ItemCombatStats[] }) {
  const { language, t } = useI18n();
  const meaningful = stats.filter(
    (stat) =>
      stat.triggers > 0 ||
      stat.totalDamage > 0 ||
      stat.healing > 0 ||
      stat.shield > 0,
  );
  if (meaningful.length === 0) {
    return <p className="empty-stats">{t("noActions")}</p>;
  }
  const sorted = [...meaningful].sort(
    (left, right) =>
      right.totalDamage - left.totalDamage ||
      right.healing + right.shield - (left.healing + left.shield) ||
      right.triggers - left.triggers,
  );
  const strongestValue = Math.max(
    1,
    ...sorted.map((stat) =>
      Math.max(stat.totalDamage, stat.healing, stat.shield),
    ),
  );
  const topDamageUid = sorted.find((stat) => stat.totalDamage > 0)?.uid;

  return (
    <div className="stats-list">
      <div className="stats-heading">
        <span>{t("battleContributions")}</span>
        <small>{t("strongestIngredientFirst")}</small>
      </div>
      {sorted.map((stat) => {
        const definition = ITEM_BY_ID[stat.itemId];
        const primaryValue =
          stat.totalDamage > 0
            ? stat.totalDamage
            : stat.healing > 0
              ? stat.healing
              : stat.shield;
        const primaryLabel =
          stat.totalDamage > 0
            ? t("damage")
            : stat.healing > 0
              ? t("healing")
              : t("shield");
        const details = [t("triggered", { count: stat.triggers })];
        if (stat.shieldDamage > 0) {
          if (stat.hpDamage > 0) {
            details.push(`${stat.hpDamage} ${language === "en" ? "HP" : "LP"}`);
          }
          details.push(`${stat.shieldDamage} ${t("shield")}`);
        }
        if (stat.totalDamage > 0 && stat.healing > 0) {
          details.push(`+${stat.healing} ${t("healing")}`);
        }
        if (stat.totalDamage > 0 && stat.shield > 0) {
          details.push(`+${stat.shield} ${t("shield")}`);
        }
        if (stat.poisonApplied > 0) {
          details.push(`${stat.poisonApplied} ${t("poison")}`);
        }
        const barWidth = Math.max(
          8,
          Math.round((primaryValue / strongestValue) * 100),
        );

        return (
          <div
            className={`stat-row ${
              stat.uid === topDamageUid ? "is-top-damage" : ""
            }`}
            key={stat.uid}
            style={{
              "--stat-color": FAMILY_META[definition.family].color,
            } as CSSProperties}
          >
            <span className="stat-icon" aria-hidden="true">
              <ArtSprite
                asset={ITEM_ART[definition.id]}
                className="stat-item-art"
              />
            </span>
            <span className="stat-name">
              {itemName(definition, language)} {ROMAN_LEVEL[stat.level]}
              <small>{details.join(" · ")}</small>
            </span>
            <span className="stat-primary">
              <b>{primaryValue}</b>
              <small>{primaryLabel}</small>
            </span>
            <span className="stat-bar" aria-hidden="true">
              <i style={{ width: `${barWidth}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function getVfxTiming(
  duration: number,
  event: CombatEvent,
): VfxTiming {
  const total = Math.max(150, duration);
  const travels = event.actor !== event.target && !isStatusTick(event);

  if (!travels) {
    const impactAtMs = Math.round(total * 0.28);
    return {
      chargeMs: impactAtMs,
      flightMs: 0,
      impactAtMs,
      impactMs: total - impactAtMs,
    };
  }

  const chargeMs = Math.round(total * 0.22);
  // Give the projectile ten percent more readable travel time without
  // changing the complete VFX window or any simulated combat timing.
  const flightMs = Math.round(total * 0.55);
  const impactAtMs = chargeMs + flightMs;
  return {
    chargeMs,
    flightMs,
    impactAtMs,
    impactMs: Math.max(30, total - impactAtMs),
  };
}

function quadraticPoint(
  from: number,
  control: number,
  to: number,
  progress: number,
): number {
  const inverse = 1 - progress;
  return (
    inverse * inverse * from +
    2 * inverse * progress * control +
    progress * progress * to
  );
}

function quadraticAngle(
  fromX: number,
  fromY: number,
  controlX: number,
  controlY: number,
  toX: number,
  toY: number,
  progress: number,
): number {
  const inverse = 1 - progress;
  const tangentX =
    2 * inverse * (controlX - fromX) +
    2 * progress * (toX - controlX);
  const tangentY =
    2 * inverse * (controlY - fromY) +
    2 * progress * (toY - controlY);
  return Math.atan2(tangentY, tangentX) * (180 / Math.PI);
}

function ItemInspectorCard({
  item,
  definition,
  insights,
  inReserve,
  onClose,
  onSell,
}: {
  item: NonNullable<GameState["reserve"]>;
  definition: ItemDefinition;
  insights: ItemInsights;
  inReserve: boolean;
  onClose: () => void;
  onSell: (element: HTMLButtonElement) => void;
}) {
  const { language, t } = useI18n();
  const family = familyText(
    definition.family,
    language,
    FAMILY_META[definition.family],
  );
  const localizedItemName = itemName(definition, language);
  return (
    <section
      className={`item-inspector ${familyClass(definition.family)}`}
      aria-label={t("itemDetails", { item: localizedItemName })}
      data-testid="item-inspector"
    >
      <span className="inspector-icon" aria-hidden="true">
        <ArtSprite
          asset={ITEM_ART[definition.id]}
          className="inspector-item-art"
        />
      </span>
      <div className="inspector-heading">
        <span className="inspector-family">
          <UiIcon
            asset={FAMILY_ICON[definition.family]}
            className="inspector-family-icon"
          />
          {family.name} · {t("level", { level: ROMAN_LEVEL[item.level] })}
        </span>
        <strong>{localizedItemName}</strong>
        <p>{itemDescription(definition, item.level, language)}</p>
      </div>
      <button
        type="button"
        className="inspector-close"
        onClick={onClose}
        aria-label={t("closeItemDetails")}
        data-audio="manual"
      >
        ×
      </button>

      <div className="inspector-facts">
        <div className={`inspector-fact ${insights.cadence.active ? "is-active" : ""}`}>
          <UiIcon asset="speed" className="inspector-fact-icon" />
          <span>{t("cadence")}</span>
          <b>{insights.cadence.headline}</b>
          <small>{insights.cadence.detail}</small>
        </div>
        <div className={`inspector-fact ${insights.synergy.active ? "is-active" : ""}`}>
          <UiIcon
            asset={FAMILY_ICON[definition.family]}
            className="inspector-fact-icon"
          />
          <span>{t("synergy")}</span>
          <b>{insights.synergy.headline}</b>
          <small>{insights.synergy.detail}</small>
        </div>
      </div>

      <div className="inspector-influences">
        <div className={`inspector-influence ${insights.affects.active ? "is-active" : ""}`}>
          <span><i aria-hidden="true">→</i> {t("affects")}</span>
          <b>{insights.affects.headline}</b>
          <small>{insights.affects.detail}</small>
        </div>
        <div className={`inspector-influence ${insights.benefits.active ? "is-active" : ""}`}>
          <span><i aria-hidden="true">←</i> {t("benefits")}</span>
          <b>{insights.benefits.headline}</b>
          <small>{insights.benefits.detail}</small>
        </div>
      </div>

      <div className="inspector-actions">
        <small>
          {inReserve
            ? t("reserveUseHint")
            : t("swapHint")}
        </small>
        <button
          type="button"
          className="sell-button"
          onClick={(event) => onSell(event.currentTarget)}
          data-audio="manual"
        >
          {t("sell")} <b>+{getSellValue(item)}</b>
        </button>
      </div>
    </section>
  );
}

function BattleVfx({
  event,
  events,
  source,
  duration,
  tier,
  delayMs,
  layerIndex,
  onImpact,
}: {
  event: CombatEvent;
  events: readonly CombatEvent[];
  source: EventSource | null;
  duration: number;
  tier: CombatBeatTier;
  delayMs: number;
  layerIndex: number;
  onImpact: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<VfxGeometry | null>(null);
  const sourceFamily = source?.family;
  const sourceSlot = source?.slot;
  const isSelfEffect = event.actor === event.target;
  const isTargetEffect = event.kind === "frost";
  const statusTick = isStatusTick(event);
  const hasFrostStasis = events.some((candidate) => candidate.kind === "frost");
  const hasEchoAfterimage = events.some((candidate) => candidate.kind === "echo");
  const hasSelfBenefit =
    !isSelfEffect &&
    events.some(
      (candidate) =>
        candidate.actor === candidate.target &&
        (candidate.kind === "shield" ||
          candidate.kind === "heal" ||
          candidate.kind === "cleanse" ||
          candidate.kind === "synergy"),
    );
  const poisonEffect =
    event.kind === "poison" ||
    event.kind === "poisonBurst" ||
    sourceFamily === "poison";
  const defensiveEffect =
    event.kind === "shield" ||
    event.kind === "synergy" ||
    event.kind === "echo" ||
    event.kind === "cleanse" ||
    event.kind === "heal";
  const itemProjectile = source
    ? ITEM_PROJECTILE_ART[source.itemId]
    : undefined;
  const usesItemProjectile =
    !statusTick &&
    ((isSelfEffect || defensiveEffect)
      ? source?.itemId === "gold-spoon"
      : Boolean(itemProjectile));
  const projectile: ArtAsset = event.kind === "frost"
    ? "vfx-frost-stasis"
    : event.kind === "echo"
      ? "vfx-echo-afterimage"
      : usesItemProjectile && itemProjectile
        ? itemProjectile
        : statusTick
      ? poisonEffect
        ? "vfx-poison"
        : "vfx-fire"
      : isSelfEffect || defensiveEffect
        ? "vfx-ward-bloom"
        : poisonEffect
          ? "vfx-poison-projectile"
          : sourceFamily === "guard"
            ? "vfx-shield"
            : "vfx-fire-projectile";
  const projectileClass = event.kind === "frost"
    ? "projectile-system projectile-frost-stasis"
    : event.kind === "echo"
      ? "projectile-system projectile-echo-afterimage"
      : usesItemProjectile && source
        ? `projectile-item projectile-item-${source.itemId}`
        : statusTick
      ? "projectile-status"
      : isSelfEffect || defensiveEffect
        ? "projectile-ward"
        : poisonEffect
          ? "projectile-poison"
          : sourceFamily === "guard"
            ? "projectile-guard"
            : "projectile-fire";
  const timing = getVfxTiming(duration, event);
  const effectStyle = {
    "--event-duration": `${Math.max(120, duration)}ms`,
    "--shot-delay": `${delayMs}ms`,
    "--charge-duration": `${timing.chargeMs}ms`,
    "--flight-duration": `${timing.flightMs}ms`,
    "--impact-delay": `${delayMs + timing.impactAtMs}ms`,
    "--impact-duration": `${timing.impactMs}ms`,
    zIndex: 7 + layerIndex,
    ...geometry?.style,
  } as CSSProperties;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const arena = container?.parentElement;
    if (!container || !arena) return;

    const sourceSelector = sourceSlot !== undefined
      ? `.cauldron-board[data-side="${event.actor}"] .board-slot[data-slot="${sourceSlot}"]`
      : `.cauldron-board[data-side="${event.actor}"] .cauldron`;
    const actorElement = arena.querySelector<HTMLElement>(
      `.cauldron-board[data-side="${event.actor}"] .cauldron`,
    );
    const opponentSide = event.actor === "player" ? "enemy" : "player";
    const opponentElement = arena.querySelector<HTMLElement>(
      `.cauldron-board[data-side="${opponentSide}"] .cauldron`,
    );
    const sourceElement =
      arena.querySelector<HTMLElement>(sourceSelector) ??
      actorElement;
    const targetElement = event.target === event.actor
      ? actorElement
      : opponentElement;
    if (!sourceElement || !targetElement || !actorElement || !opponentElement) {
      return;
    }

    const arenaRect = arena.getBoundingClientRect();
    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const actorRect = actorElement.getBoundingClientRect();
    const opponentRect = opponentElement.getBoundingClientRect();
    const fromX = sourceRect.left + sourceRect.width / 2 - arenaRect.left;
    const fromY = sourceRect.top + sourceRect.height / 2 - arenaRect.top;
    const toX = targetRect.left + targetRect.width / 2 - arenaRect.left;
    const toY = targetRect.top + targetRect.height * 0.52 - arenaRect.top;
    const centerX = arenaRect.width / 2;
    const nearCenter = Math.abs(fromX - centerX) < arenaRect.width * 0.05;
    const curveDirection = nearCenter
      ? event.actor === "player"
        ? 1
        : -1
      : fromX < centerX
        ? -1
        : 1;
    const curveStrength =
      Math.min(88, arenaRect.width * 0.075) *
      (sourceFamily === "poison" ? 1.22 : 1);
    const controlX = Math.max(
      24,
      Math.min(
        arenaRect.width - 24,
        (fromX + toX) / 2 + curveDirection * curveStrength,
      ),
    );
    const controlY =
      (fromY + toY) / 2 +
      (event.actor === "player" ? -1 : 1) *
        Math.min(34, arenaRect.height * 0.035);
    const point = (progress: number) => ({
      x: quadraticPoint(fromX, controlX, toX, progress),
      y: quadraticPoint(fromY, controlY, toY, progress),
    });
    const point25 = point(0.25);
    const point50 = point(0.5);
    const point75 = point(0.75);
    const angle = (progress: number) =>
      quadraticAngle(
        fromX,
        fromY,
        controlX,
        controlY,
        toX,
        toY,
        progress,
      );
    const style = {
      "--from-x": `${fromX}px`,
      "--from-y": `${fromY}px`,
      "--point-25-x": `${point25.x}px`,
      "--point-25-y": `${point25.y}px`,
      "--point-50-x": `${point50.x}px`,
      "--point-50-y": `${point50.y}px`,
      "--point-75-x": `${point75.x}px`,
      "--point-75-y": `${point75.y}px`,
      "--to-x": `${toX}px`,
      "--to-y": `${toY}px`,
      "--actor-x": `${actorRect.left + actorRect.width / 2 - arenaRect.left}px`,
      "--actor-y": `${actorRect.top + actorRect.height * 0.52 - arenaRect.top}px`,
      "--opponent-x": `${opponentRect.left + opponentRect.width / 2 - arenaRect.left}px`,
      "--opponent-y": `${opponentRect.top + opponentRect.height * 0.52 - arenaRect.top}px`,
      "--angle-0": `${angle(0)}deg`,
      "--angle-25": `${angle(0.25)}deg`,
      "--angle-50": `${angle(0.5)}deg`,
      "--angle-75": `${angle(0.75)}deg`,
      "--angle-100": `${angle(1)}deg`,
    } as CSSProperties;

    setGeometry({
      style,
    });
  }, [
    event.actor,
    event.sourceUid,
    event.target,
    sourceFamily,
    sourceSlot,
  ]);

  return (
    <div
      ref={containerRef}
      className={[
        "arena-vfx",
        geometry ? "is-anchored" : "",
        `vfx-${event.kind}`,
        `from-${event.actor}`,
        `to-${event.target}`,
        `tier-${tier}`,
        source ? familyClass(source.family) : "",
        source ? `source-slot-${source.slot}` : "",
        statusTick
          ? "is-status-tick"
          : isTargetEffect
            ? "is-target-effect"
          : isSelfEffect
            ? "is-self-effect"
            : "is-projectile",
      ].join(" ")}
      style={effectStyle}
      aria-hidden="true"
    >
      <ArtSprite
        asset={projectile}
        className={`battle-projectile ${projectileClass}`}
      />
      {hasSelfBenefit && (
        <ArtSprite
          asset="vfx-ward-bloom"
          className="battle-side-effect side-effect-self-benefit"
        />
      )}
      {hasFrostStasis && event.kind !== "frost" && (
        <ArtSprite
          asset="vfx-frost-stasis"
          className="battle-side-effect side-effect-frost-stasis"
        />
      )}
      {hasEchoAfterimage && event.kind !== "echo" && (
        <ArtSprite
          asset="vfx-echo-afterimage"
          className="battle-side-effect side-effect-echo-afterimage"
        />
      )}
      <ArtSprite asset="vfx-impact" className="battle-impact" />
      <span
        className="battle-impact-trigger"
        onAnimationStart={onImpact}
      />
      {tier !== "ambient" && (
        <span className="vfx-particle particle-one" />
      )}
      {tier === "hero" && (
        <>
          <span className="vfx-particle particle-two" />
          <span className="vfx-particle particle-three" />
          <span className="vfx-particle particle-four" />
        </>
      )}
    </div>
  );
}

function BattleVolleyVfx({
  beatId,
  contributions,
  playerBoard,
  enemyBoard,
  shotDurationMs,
  shotStaggerMs,
  tier,
  onImpact,
}: {
  beatId: string;
  contributions: CombatContribution[];
  playerBoard: Board;
  enemyBoard: Board;
  shotDurationMs: number;
  shotStaggerMs: number;
  tier: CombatBeatTier;
  onImpact: (beatId: string, contributionId: string) => void;
}) {
  const { language } = useI18n();
  return contributions.map((contribution, index) => (
    <BattleVfx
      key={contribution.id}
      event={selectContributionVfxEvent(contribution)}
      events={contribution.events}
      source={findEventSource(
        contribution.event,
        playerBoard,
        enemyBoard,
        language,
      )}
      duration={shotDurationMs}
      tier={tier}
      delayMs={index * shotStaggerMs}
      layerIndex={index}
      onImpact={() => onImpact(beatId, contribution.id)}
    />
  ));
}

function createBattleViewState(
  combat: CombatResult,
  final = false,
): BattleView {
  return {
    beatId: final ? "finished" : "opening",
    time: final ? combat.duration : 0,
    eventDuration: 0,
    shotStaggerMs: 0,
    playerHp: final ? combat.finalPlayerHp : combat.playerMaxHp,
    playerShield: final ? combat.finalPlayerShield : 0,
    enemyHp: final ? combat.finalEnemyHp : combat.enemyMaxHp,
    enemyShield: final ? combat.finalEnemyShield : 0,
    activeUids: [],
    event: null,
    eventLabel: null,
    eventAmount: null,
    tier: null,
    contributions: [],
    focusedContributionId: null,
    landedContributionIds: [],
    impactEvent: null,
    impactContributionId: null,
    statuses: createEmptyCombatStatuses(),
    impactLanded: true,
  };
}

function GameContent() {
  const { language, setLanguage, t } = useI18n();
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [screen, setScreen] = useState<AppScreen>("menu");
  const [progress, setProgress] = useState<PlayerProgress>(() =>
    createEmptyProgress(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [hasStoredRun, setHasStoredRun] = useState(false);
  const [confirmNewRun, setConfirmNewRun] = useState(false);
  const [requestedCampaign, setRequestedCampaign] = useState<CampaignId>(
    "grand-tournament",
  );
  const [selectedLegacyFamily, setSelectedLegacyFamily] =
    useState<LegacyFamily>("fire");
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [audioActivated, setAudioActivated] = useState(false);
  const [combatSoundsEnabled, setCombatSoundsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return (
        window.localStorage.getItem(COMBAT_SOUNDS_STORAGE_KEY) !== "off"
      );
    } catch {
      return true;
    }
  });
  const [feedback, setFeedback] = useState(() => t("prepareCauldron"));
  const [mergeNotices, setMergeNotices] = useState<MergeNotice[]>([]);
  const [busy, setBusy] = useState(false);
  const [combat, setCombat] = useState<CombatResult | null>(null);
  const [battleView, setBattleView] = useState<BattleView | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<
    FloatingCombatNumber[]
  >([]);
  const [battleClock, setBattleClock] = useState(0);
  const [battleEnding, setBattleEnding] = useState<CombatResult["reason"] | null>(null);
  const [combatPaused, setCombatPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showPowerHelp, setShowPowerHelp] = useState(false);
  const [reserveSelected, setReserveSelected] = useState(false);
  const [goldTransfers, setGoldTransfers] = useState<GoldTransferEffect[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const combatPausedRef = useRef(combatPaused);
  const pausedAnimationsRef = useRef<Animation[]>([]);
  const impactHandlerRef = useRef<
    (beatId: string, contributionId: string) => void
  >(() => undefined);
  const speedRef = useRef(speed);
  const shellRef = useRef<HTMLElement>(null);
  const goldStatusRef = useRef<HTMLDivElement>(null);
  const goldTransferIdRef = useRef(0);
  const goldTransferTimersRef = useRef<Set<number>>(new Set());
  const confirmNewRunRef = useRef<HTMLButtonElement>(null);
  const mergeNotice = mergeNotices[0] ?? null;

  const campaign = useMemo(() => getCampaign(game.campaignId), [game.campaignId]);
  const localizedCampaign = useMemo(
    () => campaignText(campaign, language),
    [campaign, language],
  );
  const maxRounds = campaign.opponents.length;
  const opponent = useMemo(() => getCurrentOpponent(game), [game]);
  const localizedOpponent = useMemo(
    () => opponentText(opponent, language),
    [language, opponent],
  );
  const combatActivationTimes = useMemo(
    () => ({
      player: combat
        ? createCombatActivationTimeline(combat.events, game.board, "player")
        : new Map<string, readonly number[]>(),
      enemy: combat
        ? createCombatActivationTimeline(combat.events, opponent.board, "enemy")
        : new Map<string, readonly number[]>(),
    }),
    [combat, game.board, opponent.board],
  );
  const selectedItem = reserveSelected
    ? game.reserve
    : game.selectedSlot === null
      ? null
      : game.board[game.selectedSlot];
  const selectedDefinition = selectedItem
    ? ITEM_BY_ID[selectedItem.itemId]
    : null;
  const selectedInsights = selectedItem
    ? getItemInsights(
        game.board,
        selectedItem,
        reserveSelected ? null : game.selectedSlot,
        language,
      )
    : null;
  const playerPowerBreakdown = getPowerBreakdown(game.board);
  const playerPower = playerPowerBreakdown.total;
  const enemyPower = getPowerValue(opponent.board);
  const handleBattleVfxImpact = useCallback(
    (beatId: string, contributionId: string) => {
      impactHandlerRef.current(beatId, contributionId);
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        let storedProgress = loadPlayerProgress(window.localStorage);
        const parsed = loadStoredGame(window.localStorage);
        if (parsed) {
          const restoredSpeed = parsed.round === 1 ? 1 : 2;
          speedRef.current = restoredSpeed;
          setSpeed(restoredSpeed);
          setGame(parsed);
          setHasStoredRun(true);
          if (
            parsed.phase === "victory" &&
            !hasCompletedCampaign(storedProgress, parsed.campaignId)
          ) {
            storedProgress = recordCampaignVictory(
              storedProgress,
              parsed.campaignId,
              parsed.seals,
              getPowerValue(parsed.board),
            );
            persistPlayerProgress(window.localStorage, storedProgress);
          }
          if (parsed.pendingBattle) {
            setCombat(parsed.pendingBattle);
            setBattleView(
              createBattleViewState(
                parsed.pendingBattle,
                parsed.phase === "result",
              ),
            );
            setBattleClock(
              parsed.phase === "result" ? parsed.pendingBattle.duration : 0,
            );
          }
        }
        setProgress(storedProgress);
      } catch {
        // A blocked or corrupted local store must never block the game.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void preloadArtAssets([
      ...SHARED_COMBAT_PRELOAD_ASSETS,
      ...CAMPAIGN_PRELOAD_ASSETS[game.campaignId],
    ]);
  }, [game.campaignId]);

  useEffect(() => {
    preloadGameAudio();
    return () => stopGameAudio();
  }, []);

  useEffect(
    () => () => {
      for (const timer of goldTransferTimersRef.current) {
        window.clearTimeout(timer);
      }
      goldTransferTimersRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    setCombatSoundsPlaybackEnabled(combatSoundsEnabled);
  }, [combatSoundsEnabled]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFeedback(t("prepareCauldron"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [language, t]);

  useEffect(() => {
    const markAudioActivated = () => {
      setAudioActivated(true);
      document.removeEventListener("pointerdown", markAudioActivated);
      document.removeEventListener("keydown", markAudioActivated);
    };
    document.addEventListener("pointerdown", markAudioActivated);
    document.addEventListener("keydown", markAudioActivated);
    return () => {
      document.removeEventListener("pointerdown", markAudioActivated);
      document.removeEventListener("keydown", markAudioActivated);
    };
  }, []);

  useEffect(() => {
    setGameAudioScene(
      resolveGameAudioScene(screen === "game", game.phase, opponent.rank),
    );
  }, [game.phase, opponent.rank, screen]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    combatPausedRef.current = combatPaused;
  }, [combatPaused]);

  useLayoutEffect(() => {
    if (game.phase !== "battle") {
      pausedAnimationsRef.current = [];
      return;
    }

    if (combatPaused) {
      const containers = shellRef.current?.querySelectorAll(
        ".arena, .battle-controls",
      );
      const runningAnimations = containers
        ? [...containers].flatMap((container) =>
            container
              .getAnimations({ subtree: true })
              .filter((animation) => animation.playState === "running"),
          )
        : [];
      runningAnimations.forEach((animation) => animation.pause());
      pausedAnimationsRef.current = runningAnimations;
      return;
    }

    pausedAnimationsRef.current.forEach((animation) => {
      if (animation.playState === "paused") animation.play();
    });
    pausedAnimationsRef.current = [];
  }, [combatPaused, game.phase]);

  useEffect(() => {
    if (!mergeNotice) return;
    navigator.vibrate?.(mergeNotice.toLevel === 3 ? [35, 35, 70] : 45);
    playGameSound(mergeNotice.toLevel === 3 ? "merge3" : "merge2");
    const timer = window.setTimeout(() => {
      setMergeNotices((current) => {
        const remaining = current.slice(1);
        if (remaining.length === 0) setBusy(false);
        return remaining;
      });
    }, getMergeDurationMs(mergeNotice.toLevel));
    return () => window.clearTimeout(timer);
  }, [mergeNotice]);

  useEffect(() => {
    const fullscreenDocument = document as WebkitFullscreenDocument;
    const syncFullscreenState = () => {
      const navigatorWithStandalone = navigator as Navigator & {
        standalone?: boolean;
      };
      const standalone =
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: standalone)").matches ||
        navigatorWithStandalone.standalone === true;
      setIsStandalone(standalone);
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ??
            fullscreenDocument.webkitFullscreenElement,
        ),
      );
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener(
      "webkitfullscreenchange",
      syncFullscreenState as EventListener,
    );

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreenState as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!hydrated || screen !== "game") {
      return;
    }
    persistGame(window.localStorage, game);
  }, [game, hydrated, screen]);

  useEffect(() => {
    if (!confirmNewRun) return;
    confirmNewRunRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmNewRun(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirmNewRun]);

  useEffect(() => {
    if (!showAudioSettings) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAudioSettings(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showAudioSettings]);

  useEffect(() => {
    if (screen !== "game" || game.phase !== "battle" || !combat) return;
    const combatBeats = createCombatBeats(combat.events);
    const finalStatuses =
      combatBeats.at(-1)?.statuses ?? createEmptyCombatStatuses();
    let beatIndex = 0;
    let targetSimulationTimeMs = 0;
    let visibleSimulationTimeMs = 0;
    let presentationTimeMs = 0;
    let lastWallTimeMs = performance.now();
    let nextBeatAllowedAtMs = 0;
    let beatHiddenAtMs = 0;
    let lastClockPaintAtMs = -CLOCK_PAINT_INTERVAL_MS;
    let lastFloatingCleanupAtMs = -CLOCK_PAINT_INTERVAL_MS;
    let beatVisible = false;
    let finished = false;
    let resultShown = false;
    let animationFrame = 0;
    let resultRevealAtMs: number | null = null;
    let activeFloatingNumbers: FloatingCombatNumber[] = [];
    const presentationScheduler = new PresentationScheduler();

    const clearPresentationTasks = () => {
      presentationScheduler.clear();
    };

    const schedulePresentation = (
      callback: () => void,
      delay: number,
    ) => {
      presentationScheduler.schedule(
        presentationTimeMs + Math.max(0, delay),
        callback,
      );
    };

    const revealBattleResult = () => {
      if (resultShown) return;
      resultShown = true;
      setGame((current) => {
        const next = showBattleResult(current);
        persistGame(window.localStorage, next);
        return next;
      });
      setFeedback(
        combat.winner === "player"
          ? t("playerWinsFeedback")
          : combat.winner === "enemy"
            ? t("opponentWinsFeedback", {
                opponent: localizedOpponent.name,
              })
            : t("drawFeedback"),
      );
    };

    const finishBattle = () => {
      if (finished) return;
      finished = true;
      impactHandlerRef.current = () => undefined;
      clearPresentationTasks();
      setBattleClock(combat.duration);
      setBattleView({
        beatId: "finished",
        time: combat.duration,
        eventDuration: 0,
        shotStaggerMs: 0,
        playerHp: combat.finalPlayerHp,
        playerShield: combat.finalPlayerShield,
        enemyHp: combat.finalEnemyHp,
        enemyShield: combat.finalEnemyShield,
        activeUids: [],
        event: null,
        eventLabel: null,
        eventAmount: null,
        tier: null,
        contributions: [],
        focusedContributionId: null,
        landedContributionIds: [],
        impactEvent: null,
        impactContributionId: null,
        statuses: finalStatuses,
        impactLanded: true,
      });
      setBattleEnding(combat.reason);
      playGameSound(
        combat.winner === "player"
          ? "victory"
          : combat.winner === "enemy"
            ? "defeat"
            : "shield",
      );
      navigator.vibrate?.(
        combat.reason === "knockout"
          ? combat.winner === "player"
            ? [45, 35, 90]
            : [80, 45, 80]
          : 55,
      );
      resultRevealAtMs =
        presentationTimeMs +
        (combat.reason === "timeout" ? 1_250 : 850);
    };

    const animate = (wallTimeMs: number) => {
      const frame = advancePresentationFrame(
        presentationTimeMs,
        lastWallTimeMs,
        wallTimeMs,
        combatPausedRef.current,
      );
      presentationTimeMs = frame.presentationTimeMs;
      lastWallTimeMs = frame.wallTimeMs;

      if (frame.presentationDeltaMs <= 0) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      targetSimulationTimeMs = Math.min(
        combat.duration,
        targetSimulationTimeMs +
          frame.simulationDeltaMs * speedRef.current,
      );
      presentationScheduler.flush(presentationTimeMs);
      if (
        activeFloatingNumbers.length > 0 &&
        presentationTimeMs - lastFloatingCleanupAtMs >=
          CLOCK_PAINT_INTERVAL_MS
      ) {
        lastFloatingCleanupAtMs = presentationTimeMs;
        const remainingNumbers = pruneExpiredFloatingNumbers(
          activeFloatingNumbers,
          presentationTimeMs,
        );
        if (remainingNumbers !== activeFloatingNumbers) {
          activeFloatingNumbers = [...remainingNumbers];
          setFloatingNumbers(activeFloatingNumbers);
        }
      }

      if (finished) {
        if (
          resultRevealAtMs !== null &&
          presentationTimeMs >= resultRevealAtMs
        ) {
          revealBattleResult();
          return;
        }
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      const nextBeat = combatBeats[beatIndex];
      if (
        nextBeat &&
        nextBeat.time <= targetSimulationTimeMs &&
        presentationTimeMs >= nextBeatAllowedAtMs
      ) {
        clearPresentationTasks();
        const previousBeatTime = combatBeats[beatIndex - 1]?.time ?? 0;
        const timing = getCombatBeatTiming(
          nextBeat,
          previousBeatTime,
          speedRef.current,
        );
        const firstContribution = nextBeat.contributions[0] ?? null;
        const soundCue = getCombatBeatSoundCue(nextBeat);
        visibleSimulationTimeMs = nextBeat.time;
        beatIndex += 1;
        beatVisible = true;
        beatHiddenAtMs = presentationTimeMs + timing.visibleMs;
        nextBeatAllowedAtMs =
          presentationTimeMs + timing.holdMs;
        setBattleView((current) => ({
          beatId: nextBeat.id,
          time: nextBeat.time,
          eventDuration: timing.shotDurationMs,
          shotStaggerMs: timing.shotStaggerMs,
          playerHp: current?.playerHp ?? combat.playerMaxHp,
          playerShield: current?.playerShield ?? 0,
          enemyHp: current?.enemyHp ?? combat.enemyMaxHp,
          enemyShield: current?.enemyShield ?? 0,
          activeUids: firstContribution
            ? [firstContribution.sourceUid]
            : [],
          event: nextBeat.event,
          eventLabel: nextBeat.label,
          eventAmount: nextBeat.amountLabel,
          tier: nextBeat.tier,
          contributions: nextBeat.contributions,
          focusedContributionId: firstContribution?.id ?? null,
          landedContributionIds: [],
          impactEvent: null,
          impactContributionId: null,
          statuses: current?.statuses ?? createEmptyCombatStatuses(),
          impactLanded: false,
        }));

        const landedImpactIds = new Set<string>();
        const reactionDuration = Math.min(
          300,
          Math.max(160, timing.shotStaggerMs - 80),
        );
        impactHandlerRef.current = (beatId, contributionId) => {
          if (
            beatId !== nextBeat.id ||
            landedImpactIds.has(contributionId)
          ) {
            return;
          }
          const contribution = nextBeat.contributions.find(
            (candidate) => candidate.id === contributionId,
          );
          if (!contribution) return;
          landedImpactIds.add(contributionId);

          const appearedNumbers = createFloatingCombatNumbers({
            events: contribution.events,
            idPrefix: contribution.id,
            presentationTime: presentationTimeMs,
          });
          if (appearedNumbers.length > 0) {
            activeFloatingNumbers = mergeFloatingCombatNumbers(
              activeFloatingNumbers,
              appearedNumbers,
            );
            setFloatingNumbers(activeFloatingNumbers);
          }
          if (soundCue?.contributionId === contribution.id) {
            playCombatSound(
              resolveCombatSound(
                soundCue.event.kind,
                findEventSource(
                  soundCue.event,
                  game.board,
                  opponent.board,
                  language,
                )?.family ?? null,
              ),
              speedRef.current,
              nextBeat.tier,
            );
          }
          setBattleView((current) => {
            if (current?.beatId !== nextBeat.id) return current;
            const landedContributionIds = [
              ...current.landedContributionIds,
              contribution.id,
            ];
            const volleyLanded =
              landedContributionIds.length ===
              nextBeat.contributions.length;

            return {
              ...current,
              playerHp: contribution.snapshot.playerHp,
              playerShield: contribution.snapshot.playerShield,
              enemyHp: contribution.snapshot.enemyHp,
              enemyShield: contribution.snapshot.enemyShield,
              statuses: volleyLanded
                ? nextBeat.statuses
                : current.statuses,
              landedContributionIds,
              impactEvent: contribution.event,
              impactContributionId: contribution.id,
              impactLanded: volleyLanded,
            };
          });

          schedulePresentation(() => {
            setBattleView((current) =>
              current?.beatId === nextBeat.id &&
              current.impactContributionId === contribution.id
                ? {
                    ...current,
                    impactEvent: null,
                    impactContributionId: null,
                  }
                : current,
            );
          }, reactionDuration);
        };

        nextBeat.contributions.forEach((contribution, index) => {
          const shotDelay = index * timing.shotStaggerMs;
          const shotTiming = getVfxTiming(
            timing.shotDurationMs,
            contribution.event,
          );

          if (index > 0) {
            schedulePresentation(() => {
              setBattleView((current) =>
                current?.beatId === nextBeat.id
                  ? {
                      ...current,
                      activeUids: [contribution.sourceUid],
                      focusedContributionId: contribution.id,
                    }
                  : current,
              );
            }, shotDelay);
          }

          schedulePresentation(() => {
            setBattleView((current) =>
              current?.beatId === nextBeat.id &&
              current.focusedContributionId === contribution.id
                ? { ...current, activeUids: [] }
                : current,
              );
          }, shotDelay + shotTiming.chargeMs);

          schedulePresentation(() => {
            impactHandlerRef.current(nextBeat.id, contribution.id);
          }, shotDelay + shotTiming.impactAtMs);
        });
      } else if (
        beatVisible &&
        presentationTimeMs >= beatHiddenAtMs
      ) {
        beatVisible = false;
        impactHandlerRef.current = () => undefined;
        clearPresentationTasks();
        setBattleView((current) =>
          current
            ? {
                ...current,
                activeUids: [],
                event: null,
                eventLabel: null,
                eventAmount: null,
                tier: null,
                contributions: [],
                focusedContributionId: null,
                landedContributionIds: [],
                impactEvent: null,
                impactContributionId: null,
                impactLanded: false,
              }
            : current,
        );
      }

      const waitingBeat = combatBeats[beatIndex];
      visibleSimulationTimeMs = interpolateVisibleBattleTime({
        currentTimeMs: visibleSimulationTimeMs,
        targetTimeMs: targetSimulationTimeMs,
        nextBeatTimeMs: waitingBeat?.time ?? null,
        presentationTimeMs,
        nextBeatAllowedAtMs,
        frameDeltaMs: frame.simulationDeltaMs,
        speed: speedRef.current,
        durationMs: combat.duration,
      });
      if (
        presentationTimeMs - lastClockPaintAtMs >=
          CLOCK_PAINT_INTERVAL_MS ||
        visibleSimulationTimeMs >= combat.duration
      ) {
        lastClockPaintAtMs = presentationTimeMs;
        setBattleClock(
          Math.min(combat.duration, visibleSimulationTimeMs),
        );
      }

      if (
        beatIndex >= combatBeats.length &&
        targetSimulationTimeMs >= combat.duration &&
        presentationTimeMs >= nextBeatAllowedAtMs
      ) {
        finishBattle();
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      clearPresentationTasks();
      impactHandlerRef.current = () => undefined;
      setFloatingNumbers([]);
    };
  }, [
    combat,
    game.board,
    game.phase,
    opponent.board,
    localizedOpponent.name,
    language,
    screen,
    t,
  ]);

  function announce(message: string) {
    setFeedback(message);
  }

  function announceActionError(message: string) {
    const lowerMessage = message.toLocaleLowerCase(language);
    playGameSound(
      lowerMessage.includes("voll") || lowerMessage.includes("full")
        ? "cauldronFull"
        : "error",
    );
    announce(translateGameError(message, language));
  }

  function handleUiButtonClick(event: ReactMouseEvent<HTMLElement>) {
    const button =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (
      !(button instanceof HTMLButtonElement) ||
      button.disabled ||
      button.dataset.audio === "manual"
    ) {
      return;
    }
    playGameSound("uiClick");
  }

  function startGoldTransfer(
    kind: GoldTransferEffect["kind"],
    amount: number,
    transactionElement: Element | null,
  ) {
    const goldElement = goldStatusRef.current;
    if (!goldElement || !transactionElement || amount <= 0) {
      playGameSound(kind === "spend" ? "purchase" : "sell");
      return;
    }

    const goldRect = goldElement.getBoundingClientRect();
    const transactionRect = transactionElement.getBoundingClientRect();
    const goldPoint = {
      x: goldRect.left + goldRect.width / 2,
      y: goldRect.top + goldRect.height / 2,
    };
    const transactionPoint = {
      x: transactionRect.left + transactionRect.width / 2,
      y: transactionRect.top + transactionRect.height / 2,
    };
    const effect: GoldTransferEffect = {
      id: ++goldTransferIdRef.current,
      kind,
      amount,
      from: kind === "spend" ? goldPoint : transactionPoint,
      to: kind === "spend" ? transactionPoint : goldPoint,
      hud: goldPoint,
    };

    setGoldTransfers((current) => [...current.slice(-2), effect]);
    playGameSound(kind === "spend" ? "purchase" : "sell");
    const timer = window.setTimeout(() => {
      setGoldTransfers((current) =>
        current.filter((entry) => entry.id !== effect.id),
      );
      goldTransferTimersRef.current.delete(timer);
    }, 760);
    goldTransferTimersRef.current.add(timer);
  }

  function handleBuy(offerUid: string, offerElement: HTMLButtonElement) {
    if (busy) return;
    const result = buyOffer(game, offerUid);
    if (result.error) {
      announceActionError(result.error);
      return;
    }
    const purchaseAnchor =
      offerElement.querySelector(".offer-price") ?? offerElement;
    startGoldTransfer(
      "spend",
      Math.abs(result.goldDelta ?? 0),
      purchaseAnchor,
    );
    setReserveSelected(false);
    setGame(result.state);
    if (result.merges?.length) {
      const powerBefore = getPowerValue(game.board);
      const powerAfter = getPowerValue(result.state.board);
      const total = result.merges.length;
      const notices = result.merges.map((merge, index): MergeNotice => {
        const definition = ITEM_BY_ID[merge.itemId];
        return {
          label: `${itemName(definition, language)} ${ROMAN_LEVEL[merge.toLevel]}`,
          art: ITEM_ART[definition.id],
          family: definition.family,
          fromLevel: merge.fromLevel,
          toLevel: merge.toLevel,
          valueLabel: mergeValueLabel(definition, language),
          oldValue: definition.values[merge.fromLevel - 1],
          newValue: definition.values[merge.toLevel - 1],
          oldCooldown: definition.cooldown[merge.fromLevel - 1],
          newCooldown: definition.cooldown[merge.toLevel - 1],
          powerBefore,
          powerAfter,
          bonus: mergeBonusLabel(definition, merge.toLevel, language),
          targetArea: merge.target.area,
          step: index + 1,
          total,
        };
      });
      setMergeNotices(notices);
      announce(
        total > 1
          ? t("mergeCascadeFeedback", { count: total })
          : t("mergedFeedback", {
              item: notices[0].label,
              reserve:
                notices[0].targetArea === "reserve"
                  ? t("inReserveFragment")
                  : "",
            }),
      );
      setBusy(true);
    } else {
      announce(
        result.purchaseLocation?.area === "reserve"
          ? t("parkedFeedback")
          : t("boughtFeedback"),
      );
    }
  }

  function handleReroll() {
    if (busy) return;
    const result = rerollShop(game);
    if (result.error) return announceActionError(result.error);
    setGame(result.state);
    playGameSound("reroll");
    announce(game.rerollsUsed === 0 ? t("freeRerollFeedback") : t("rerollFeedback"));
  }

  function handleSlot(slot: number) {
    if (busy) return;
    if (reserveSelected) {
      const result = swapSlotWithReserve(game, slot);
      if (result.error) return announceActionError(result.error);
      setReserveSelected(false);
      setGame(result.state);
      playGameSound("uiSelect");
      announce(t("movedReserveFeedback"));
      return;
    }
    const wasSelected = game.selectedSlot;
    const result = selectOrSwapSlot(game, slot);
    setGame(result.state);
    playGameSound("uiSelect");
    if (wasSelected === null && game.board[slot]) {
      announce(t("selectedFeedback"));
    } else if (wasSelected !== null && wasSelected !== slot) {
      announce(t("rearrangedFeedback"));
    }
  }

  function handleReserve() {
    if (busy || game.round < RESERVE_UNLOCK_ROUND) return;
    if (game.selectedSlot !== null) {
      const result = swapSlotWithReserve(game, game.selectedSlot);
      if (result.error) return announceActionError(result.error);
      setReserveSelected(false);
      setGame(result.state);
      playGameSound("uiSelect");
      announce(t("movedReserveFeedback"));
      return;
    }
    if (!game.reserve) {
      announceActionError(t("reserveEmptyFeedback"));
      return;
    }
    setReserveSelected((current) => !current);
    playGameSound("uiSelect");
    announce(
      reserveSelected
        ? t("selectionCleared")
        : t("reserveSelected"),
    );
  }

  function handleSell(fallbackElement: HTMLButtonElement) {
    if (!reserveSelected && game.selectedSlot === null) return;
    const selectedElement = reserveSelected
      ? shellRef.current?.querySelector('[data-testid="reserve-slot"]')
      : shellRef.current?.querySelector(
          `.player-workbench .board-slot[data-slot="${game.selectedSlot}"]`,
        );
    const result = reserveSelected
      ? sellReserve(game)
      : sellSlot(game, game.selectedSlot!);
    if (result.error) return announceActionError(result.error);
    startGoldTransfer(
      "earn",
      result.goldDelta ?? 0,
      selectedElement ?? fallbackElement,
    );
    setReserveSelected(false);
    setGame(result.state);
    announce(t("soldFeedback", { gold: result.goldDelta ?? 0 }));
  }

  function updateCombatPause(paused: boolean) {
    combatPausedRef.current = paused;
    setCombatPaused(paused);
  }

  function updateCombatSpeed(nextSpeed: number) {
    speedRef.current = nextSpeed;
    setSpeed(nextSpeed);
  }

  function handleCombatPause() {
    updateCombatPause(!combatPausedRef.current);
  }

  function handleFight() {
    if (busy) return;
    const result = beginBattle(game);
    if (result.error) return announceActionError(result.error);
    const battle = simulateBattle(game.board, opponent);
    const battleState = { ...result.state, pendingBattle: battle };
    persistGame(window.localStorage, battleState);
    setReserveSelected(false);
    updateCombatPause(false);
    setCombat(battle);
    setBattleClock(0);
    setBattleEnding(null);
    setBattleView(createBattleViewState(battle));
    setGame(battleState);
    announce(t("battleBegins"));
  }

  function handleContinue() {
    if (!combat) return;
    const outcome = combat.winner;
    const openingLossProtected = isOpeningDefeatProtected(game, outcome);
    const nextGame = advanceAfterBattle(game, outcome);
    updateCombatPause(false);
    if (game.round === 1 && speedRef.current === 1) {
      updateCombatSpeed(2);
    }
    setReserveSelected(false);
    setGame(nextGame);
    setCombat(null);
    setBattleView(null);
    setBattleClock(0);
    setBattleEnding(null);
    if (nextGame.phase === "victory") {
      setProgress((current) => {
        const updated = recordCampaignVictory(
          current,
          game.campaignId,
          nextGame.seals,
          getPowerValue(nextGame.board),
        );
        persistPlayerProgress(window.localStorage, updated);
        return updated;
      });
      announce(t("trophyFeedback", { opponent: localizedOpponent.name }));
    } else if (nextGame.phase === "gameover") {
      announce(t("campaignLostFeedback"));
    } else if (outcome === "player") {
      announce(
        nextGame.round === RESERVE_UNLOCK_ROUND
          ? t("reserveUnlockedFeedback")
          : t("nextOpponentFeedback"),
      );
    } else if (outcome === "draw") {
      announce(t("drawRevengeFeedback", { opponent: localizedOpponent.name }));
    } else {
      announce(
        openingLossProtected
          ? t("protectedRevengeFeedback", { opponent: localizedOpponent.name })
          : t("sealRevengeFeedback", { opponent: localizedOpponent.name }),
      );
    }
  }

  function handleEnterOpeningShop() {
    setGame((current) => enterOpeningShop(current));
    announce(t("chooseOpeningFeedback"));
  }

  function handleReset() {
    const next = resetRun(
      undefined,
      game.campaignId,
      game.activeFamilies,
    );
    updateCombatPause(false);
    updateCombatSpeed(1);
    setGame(next);
    setCombat(null);
    setBattleView(null);
    setBattleClock(0);
    setBattleEnding(null);
    setMergeNotices([]);
    setReserveSelected(false);
    setBusy(false);
    announce(t("newCauldronFeedback"));
  }

  function startCampaign(
    campaignId: CampaignId,
    legacyFamily = selectedLegacyFamily,
  ) {
    const next = resetRun(
      undefined,
      campaignId,
      getCampaignFamilies(campaignId, legacyFamily),
    );
    updateCombatPause(false);
    updateCombatSpeed(1);
    setGame(next);
    setCombat(null);
    setBattleView(null);
    setBattleClock(0);
    setBattleEnding(null);
    setMergeNotices([]);
    setReserveSelected(false);
    setBusy(false);
    setConfirmNewRun(false);
    setHasStoredRun(true);
    setScreen("game");
    announce(
      t("campaignBeginsFeedback", {
        campaign: campaignText(getCampaign(campaignId), language).name,
      }),
    );
  }

  function startRequestedCampaign() {
    startCampaign(requestedCampaign, selectedLegacyFamily);
  }

  function requestCampaignStart(campaignId: CampaignId) {
    if (
      campaignId === "frostbound-vault" &&
      !hasCompletedCampaign(progress, "grand-tournament")
    ) {
      announceActionError(t("unlockCampaignError"));
      return;
    }
    setRequestedCampaign(campaignId);
    if (hasStoredRun) {
      setConfirmNewRun(true);
      return;
    }
    startCampaign(campaignId, selectedLegacyFamily);
  }

  function handleContinueRun() {
    setConfirmNewRun(false);
    setScreen("game");
    announce(t("welcomeBack"));
  }

  function handleReturnToMenu() {
    persistGame(window.localStorage, game);
    updateCombatPause(false);
    if (game.phase === "battle" && combat) {
      setBattleView(createBattleViewState(combat));
      setBattleClock(0);
      setBattleEnding(null);
    }
    setMergeNotices([]);
    setReserveSelected(false);
    setBusy(false);
    setShowPowerHelp(false);
    setHasStoredRun(true);
    setScreen("menu");
  }

  function handleOpenCabinet() {
    setConfirmNewRun(false);
    setShowAudioSettings(false);
    setScreen("cabinet");
  }

  function handleOpenAudioSettings() {
    activateGameAudio();
    setAudioActivated(true);
    setConfirmNewRun(false);
    setShowAudioSettings(true);
  }

  function handleCombatSoundsToggle() {
    const enabled = !combatSoundsEnabled;
    setCombatSoundsEnabled(enabled);
    setCombatSoundsPlaybackEnabled(enabled);
    try {
      window.localStorage.setItem(
        COMBAT_SOUNDS_STORAGE_KEY,
        enabled ? "on" : "off",
      );
    } catch {
      // Audio preferences remain active for the current session.
    }
  }

  async function handleFullscreen() {
    const fullscreenDocument = document as WebkitFullscreenDocument;
    const fullscreenElement =
      document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement;

    try {
      if (!fullscreenElement && isStandalone) {
        announce(t("alreadyFullscreenFeedback"));
        return;
      }

      if (fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          await fullscreenDocument.webkitExitFullscreen?.();
        }
        announce(t("fullscreenLeftFeedback"));
        return;
      }

      const target = shellRef.current as WebkitFullscreenElement | null;
      if (target?.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target?.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      } else {
        announce(
          t("fullscreenUnavailable"),
        );
        return;
      }

      const orientation = window.screen.orientation as LockableScreenOrientation;
      try {
        await orientation.lock?.("portrait");
      } catch {
        // Orientation locking is optional and not supported by every browser.
      }
      announce(t("fullscreenActiveFeedback"));
      window.setTimeout(() => {
        setIsFullscreen(
          Boolean(
            document.fullscreenElement ??
              fullscreenDocument.webkitFullscreenElement,
          ),
        );
      }, 300);
    } catch {
      announce(t("fullscreenFailed"));
    }
  }

  const playerHp = battleView?.playerHp ?? 100;
  const playerShield = battleView?.playerShield ?? 0;
  const enemyMaxHp = combat?.enemyMaxHp ?? opponent.baseHp;
  const enemyHp = battleView?.enemyHp ?? enemyMaxHp;
  const enemyShield = battleView?.enemyShield ?? 0;
  const isCombatPhase = game.phase === "battle" || game.phase === "result";
  const activeUids = battleView?.activeUids ?? [];
  const combatStatuses =
    battleView?.statuses ?? createEmptyCombatStatuses();
  const focusedContribution =
    battleView?.contributions.find(
      (contribution) =>
        contribution.id === battleView.focusedContributionId,
    ) ??
    battleView?.contributions[0] ??
    null;
  const focusedContributionLanded = Boolean(
    focusedContribution &&
    battleView?.landedContributionIds.includes(focusedContribution.id),
  );
  const importantCombatMessage = getImportantCombatMessage(
    battleView?.contributions.flatMap(
      (contribution) => contribution.events,
    ) ?? [],
  );
  const importantMessageContribution = importantCombatMessage
    ? battleView?.contributions.find((contribution) =>
        contribution.events.includes(importantCombatMessage.event),
      ) ?? null
    : null;
  const importantMessageLanded = Boolean(
    importantMessageContribution &&
    battleView?.landedContributionIds.includes(
      importantMessageContribution.id,
    ),
  );
  const eventSource = findEventSource(
    focusedContribution?.event ?? battleView?.event ?? null,
    game.board,
    opponent.board,
    language,
  );
  const importantEventSource = findEventSource(
    importantCombatMessage?.event ?? null,
    game.board,
    opponent.board,
    language,
  );
  const sideLabel = (side: Side) =>
    side === "player" ? t("yourCauldron") : localizedOpponent.name;
  const focusedEventRoute = focusedContribution
    ? `${eventSource?.name ?? sideLabel(focusedContribution.event.actor)} → ${sideLabel(
        focusedContribution.event.target,
      )}`
    : null;
  const importantEventRoute = importantCombatMessage
    ? `${importantEventSource?.name ?? sideLabel(importantCombatMessage.event.actor)} → ${sideLabel(
        importantCombatMessage.event.target,
      )}`
    : null;
  const effectLaneEventKind =
    importantCombatMessage?.event.kind ?? battleView?.event?.kind;
  const remainingBattleSeconds = Math.max(
    0,
    Math.ceil(((combat?.duration ?? 0) - battleClock) / 1000),
  );
  const decisionCountdown =
    game.phase === "battle" &&
    combat?.reason === "timeout" &&
    remainingBattleSeconds <= 5 &&
    !battleEnding;
  const kesselHeatMultiplier = getKesselHeatDamageMultiplier(battleClock);
  const kesselHeatPercent = Math.round((kesselHeatMultiplier - 1) * 100);
  const kesselHeatActive =
    game.phase === "battle" &&
    battleClock >= KESSEL_HEAT_START_MS &&
    !battleEnding;
  const playerHpPercent = combat
    ? Math.round((combat.finalPlayerHp / combat.playerMaxHp) * 100)
    : 100;
  const enemyHpPercent = combat
    ? Math.round((combat.finalEnemyHp / combat.enemyMaxHp) * 100)
    : 100;
  const playerHpDamageTotal =
    combat?.playerStats.reduce((sum, stat) => sum + stat.hpDamage, 0) ?? 0;
  const enemyHpDamageTotal =
    combat?.enemyStats.reduce((sum, stat) => sum + stat.hpDamage, 0) ?? 0;
  const fullscreenActive = isFullscreen || isStandalone;
  const fullscreenLabel = isStandalone
    ? t("fullscreenAlready")
    : isFullscreen
      ? t("fullscreenExit")
      : t("fullscreenEnter");
  const audioSettingsLabel = audioActivated
    ? t("audio")
    : t("soundEnable");
  const audioSettingsDialog = showAudioSettings ? (
    <div
      className="audio-settings-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowAudioSettings(false);
      }}
    >
      <section
        className="audio-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-settings-title"
        aria-describedby="audio-settings-description"
      >
        <button
          type="button"
          className="audio-settings-close"
          onClick={() => setShowAudioSettings(false)}
          aria-label={t("settingsClose")}
        >
          ×
        </button>
        <span className="eyebrow">{t("settingsKicker")}</span>
        <h2 id="audio-settings-title">{t("settingsTitle")}</h2>
        <p id="audio-settings-description">
          {t("settingsDescription")}
        </p>
        <button
          type="button"
          className="audio-setting-row"
          role="switch"
          aria-checked={combatSoundsEnabled}
          onClick={handleCombatSoundsToggle}
        >
          <span className="audio-setting-copy">
            <strong>{t("combatSounds")}</strong>
            <small>{t("combatSoundsDetail")}</small>
          </span>
          <span className="audio-switch" aria-hidden="true">
            <i />
          </span>
          <b>{combatSoundsEnabled ? t("on") : t("off")}</b>
        </button>
        <div className="language-setting-row">
          <span className="audio-setting-copy">
            <strong>{t("language")}</strong>
            <small>{t("languageDetail")}</small>
          </span>
          <div className="language-choice" role="group" aria-label={t("language")}>
            <button
              type="button"
              className={language === "de" ? "is-active" : ""}
              aria-pressed={language === "de"}
              onClick={() => setLanguage("de")}
              data-audio="manual"
            >
              DE <small>{t("german")}</small>
            </button>
            <button
              type="button"
              className={language === "en" ? "is-active" : ""}
              aria-pressed={language === "en"}
              onClick={() => setLanguage("en")}
              data-audio="manual"
            >
              EN <small>{t("english")}</small>
            </button>
          </div>
        </div>
        <small className="audio-settings-note">
          {t("savedOnDevice")}
        </small>
      </section>
    </div>
  ) : null;

  const runStateLabel =
    game.phase === "victory"
      ? t("campaignWon")
      : game.phase === "gameover"
        ? t("campaignEnded")
        : game.phase === "battle"
          ? t("battleRunningRound", { round: game.round })
          : game.phase === "result"
            ? t("resultReadyRound", { round: game.round })
            : t("roundOf", { round: game.round, max: maxRounds });
  const requestedCampaignDefinition = getCampaign(requestedCampaign);
  const localizedRequestedCampaign = campaignText(
    requestedCampaignDefinition,
    language,
  );
  const newRunDialog = confirmNewRun ? (
    <div
      className="new-run-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setConfirmNewRun(false);
      }}
    >
      <section
        className="new-run-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="new-run-dialog-title"
        aria-describedby="new-run-dialog-description"
      >
        <span className="dialog-seal" aria-hidden="true">
          <UiIcon asset="run-seal" className="dialog-seal-icon" />
        </span>
        <span className="eyebrow">{t("replaceSave")}</span>
        <h2 id="new-run-dialog-title">{t("startNewCampaignQuestion")}</h2>
        <p id="new-run-dialog-description">
          {t("replaceSavePrefix", { state: runStateLabel })}
          <strong> {localizedRequestedCampaign.name}</strong>{" "}
          {t("replaceSaveSuffix")}
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="dialog-cancel-button"
            onClick={() => setConfirmNewRun(false)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="dialog-confirm-button"
            onClick={startRequestedCampaign}
            ref={confirmNewRunRef}
          >
            {t("startCampaign")}
          </button>
        </div>
      </section>
    </div>
  ) : null;

  if (screen === "cabinet") {
    const firstCampaignComplete = hasCompletedCampaign(
      progress,
      "grand-tournament",
    );
    return (
      <main
        className={`cabinet-shell ${fullscreenActive ? "is-fullscreen" : ""}`}
        ref={shellRef}
        onClickCapture={handleUiButtonClick}
      >
        <BackdropImage
          backdrop="menu"
          desktopBackdrop="menu-desktop"
          className="cabinet-backdrop"
        />
        <div className="cabinet-shade" aria-hidden="true" />
        <header className="cabinet-topbar">
          <button
            type="button"
            className="cabinet-back-button"
            onClick={() => setScreen("menu")}
          >
            ← {t("mainMenu")}
          </button>
          <div>
            <span className="eyebrow">{t("yourProgress")}</span>
            <h1>{t("cabinet")}</h1>
          </div>
          <button
            type="button"
            className="audio-settings-button"
            onClick={handleOpenAudioSettings}
            aria-label={t("openSettings")}
          >
            <span className="settings-button-glyph" aria-hidden="true">⚙</span>
            <span className="settings-language-badge" aria-hidden="true">
              {language.toUpperCase()}
            </span>
            <span>{t("settingsTitle")}</span>
          </button>
        </header>

        <div className="cabinet-content">
          <section className="cabinet-intro">
            <div>
              <span className="eyebrow">{t("campaignChoice")}</span>
              <h2>{t("freshCauldronHeading")}</h2>
              <p>{t("freshCauldronBody")}</p>
            </div>
            <ArtSprite asset="cauldron-player" className="cabinet-cauldron" />
          </section>

          <section className="campaign-grid" aria-label={t("availableCampaigns")}>
            {CAMPAIGNS.map((entry) => {
              const localizedEntry = campaignText(entry, language);
              const unlocked =
                entry.id === "grand-tournament" || firstCampaignComplete;
              const completed = hasCompletedCampaign(progress, entry.id);
              const record = progress.campaigns[entry.id];
              const isCurrentRun =
                hasStoredRun &&
                game.campaignId === entry.id &&
                game.phase !== "victory" &&
                game.phase !== "gameover";
              const entryFamilies = entry.selectableLegacyFamily
                ? getCampaignFamilies(entry.id, selectedLegacyFamily)
                : [...entry.defaultFamilies];
              return (
                <article
                  className={`campaign-card campaign-${entry.number} ${
                    unlocked ? "is-unlocked" : "is-locked"
                  } ${completed ? "is-completed" : ""}`}
                  key={entry.id}
                >
                  <div className="campaign-card-heading">
                    <span className="campaign-number">{t("campaign", { number: entry.number })}</span>
                    <span className="campaign-state">
                      {completed ? t("trophyReceived") : unlocked ? t("ready") : t("locked")}
                    </span>
                  </div>
                  <h2>{localizedEntry.name}</h2>
                  <strong>{localizedEntry.subtitle}</strong>
                  <p>{localizedEntry.description}</p>

                  {entry.selectableLegacyFamily && unlocked && (
                    <div className="legacy-family-choice">
                      <span>{t("masteredFamily")}</span>
                      <div>
                        {LEGACY_FAMILIES.map((family) => (
                          <button
                            type="button"
                            className={
                              selectedLegacyFamily === family ? "is-selected" : ""
                            }
                            onClick={() => setSelectedLegacyFamily(family)}
                            aria-pressed={selectedLegacyFamily === family}
                            key={family}
                          >
                            <UiIcon
                              asset={FAMILY_ICON[family]}
                              className="campaign-family-icon"
                            />
                            {familyText(family, language, FAMILY_META[family]).name}
                          </button>
                        ))}
                      </div>
                      <small>
                        {t("fixedFamilyHint")}
                      </small>
                    </div>
                  )}

                  <div className="campaign-family-row" aria-label={t("activeFamilies")}>
                    {entryFamilies.map((family) => (
                      <span className={familyClass(family)} key={family}>
                        <UiIcon
                          asset={FAMILY_ICON[family]}
                          className="campaign-family-icon"
                        />
                        {familyText(family, language, FAMILY_META[family]).name}
                      </span>
                    ))}
                  </div>

                  {record && (
                    <div className="campaign-record">
                      <span>{localizedEntry.trophyName}</span>
                      <small>
                        {t("campaignRecord", {
                          wins: record.wins,
                          seals: record.bestSeals,
                        })}
                      </small>
                    </div>
                  )}

                  <button
                    type="button"
                    className="campaign-action-button"
                    disabled={!unlocked || !hydrated}
                    onClick={() =>
                      isCurrentRun
                        ? handleContinueRun()
                        : requestCampaignStart(entry.id)
                    }
                  >
                    {isCurrentRun
                      ? t("continueRunRound", { round: game.round })
                      : unlocked
                        ? t("startFreshRun")
                        : t("defeatBossFirst")}
                  </button>
                </article>
              );
            })}
          </section>

          <section className="cabinet-collection" aria-label={t("collection")}>
            <article>
              <UiIcon asset="elite" className="cabinet-collection-icon" />
              <div>
                <strong>{t("trophies")}</strong>
                <small>
                  {t("campaignsMastered", {
                    done: CAMPAIGNS.filter((entry) =>
                      hasCompletedCampaign(progress, entry.id),
                    ).length,
                    total: CAMPAIGNS.length,
                  })}
                </small>
              </div>
            </article>
            <article>
              <UiIcon asset="power" className="cabinet-collection-icon" />
              <div>
                <strong>{t("recipeBook")}</strong>
                <small>{t("familiesDiscovered", { count: firstCampaignComplete ? 5 : 3 })}</small>
              </div>
            </article>
          </section>
        </div>
        {newRunDialog}
        {audioSettingsDialog}
      </main>
    );
  }

  if (screen === "menu") {
    const menuOpponent = getCurrentOpponent(game);
    const localizedMenuOpponent = opponentText(menuOpponent, language);

    return (
      <main
        className={`main-menu-shell ${fullscreenActive ? "is-fullscreen" : ""}`}
        ref={shellRef}
        onClickCapture={handleUiButtonClick}
      >
        <BackdropImage
          backdrop="menu"
          desktopBackdrop="menu-desktop"
          className="main-menu-backdrop"
        />
        <div className="main-menu-shade" aria-hidden="true" />

        <header className="main-menu-topbar">
          <span className="menu-edition">
            <i aria-hidden="true">✦</i>
            {t("magicalAutobattler")}
          </span>
          <div className="menu-top-actions">
            <span className="menu-build-hash" aria-label={`Build ${BUILD_HASH}`}>
              Build {BUILD_HASH}
            </span>
            {hasStoredRun && hydrated && (
              <span className="menu-save-state" aria-label={t("saved", { state: runStateLabel })}>
                <UiIcon asset="run-seal" className="menu-save-icon" />
                {runStateLabel}
              </span>
            )}
            <button
              type="button"
              className={`audio-settings-button ${
                audioActivated ? "" : "needs-activation"
              }`}
              onClick={handleOpenAudioSettings}
              aria-label={
                audioActivated
                  ? t("openSettings")
                  : t("enableSoundAndOpen")
              }
              aria-haspopup="dialog"
              aria-expanded={showAudioSettings}
              title={audioSettingsLabel}
            >
              <span className="settings-button-glyph" aria-hidden="true">⚙</span>
              <span className="settings-language-badge" aria-hidden="true">
                {language.toUpperCase()}
              </span>
              <span>{t("settingsTitle")}</span>
            </button>
            <button
              type="button"
              className="menu-fullscreen-button"
              onClick={handleFullscreen}
              aria-label={fullscreenLabel}
              aria-pressed={fullscreenActive}
              title={fullscreenLabel}
            >
              <span
                className={`fullscreen-glyph ${fullscreenActive ? "is-exit" : "is-enter"}`}
                aria-hidden="true"
              />
              <span>{fullscreenActive ? t("window") : t("fullscreen")}</span>
            </button>
          </div>
        </header>

        <div className="main-menu-layout">
          <section className="menu-hero" aria-labelledby="main-menu-title">
            <div className="menu-title-lockup">
              <span className="menu-title-kicker">{t("grandTournament")}</span>
              <h1 id="main-menu-title">
                <span>Kessel</span>
                <i aria-hidden="true">–</i>
                <span>Krawall</span>
              </h1>
              <p>{t("tagline")}</p>
            </div>

            <div className="menu-cauldron-stage" aria-hidden="true">
              <div className="menu-magic-ring">
                <ArtSprite
                  asset="menu-rune-ring-outer"
                  className="menu-rune-ring menu-rune-ring-outer"
                />
                <ArtSprite
                  asset="menu-rune-ring-inner"
                  className="menu-rune-ring menu-rune-ring-inner"
                />
              </div>
              <ArtSprite asset="item-chili" className="menu-ingredient menu-ingredient-fire" />
              <ArtSprite asset="item-slime-shroom" className="menu-ingredient menu-ingredient-poison" />
              <ArtSprite asset="item-egg-shell" className="menu-ingredient menu-ingredient-guard" />
              <ArtSprite asset="cauldron-player" className="menu-cauldron" />
              <span className="menu-stage-glow" />
            </div>

            <div className="menu-family-legend" aria-label={t("synergyLegend")}>
              <span><UiIcon asset="family-fire" className="menu-family-icon" /> {familyText("fire", language, FAMILY_META.fire).name}</span>
              <span><UiIcon asset="family-poison" className="menu-family-icon" /> {familyText("poison", language, FAMILY_META.poison).name}</span>
              <span><UiIcon asset="family-guard" className="menu-family-icon" /> {familyText("guard", language, FAMILY_META.guard).name}</span>
            </div>
          </section>

          <section className="menu-command-panel" aria-label={t("mainMenu")}>
            <div className="menu-primary-actions">
              {hasStoredRun && hydrated && (
                <button
                  type="button"
                  className="menu-primary-button"
                  onClick={handleContinueRun}
                >
                  <span>
                    <UiIcon asset="battle" className="menu-button-icon" />
                    {t("campaignContinue")}
                  </span>
                  <small>
                    {runStateLabel}
                    {game.phase !== "victory" && game.phase !== "gameover"
                       ? ` · ${t("sealsAgainst", {
                           seals: game.seals,
                           opponent: localizedMenuOpponent.name,
                         })}`
                       : ` · ${t("victories", { count: game.victories })}`}
                  </small>
                </button>
              )}
              <button
                type="button"
                className={hasStoredRun ? "menu-secondary-button" : "menu-primary-button"}
                onClick={handleOpenCabinet}
                disabled={!hydrated}
              >
                <span>
                  <UiIcon asset="elite" className="menu-button-icon" />
                  {t("openCabinet")}
                </span>
                <small>
                  {hydrated
                    ? t("chooseCampaigns")
                    : t("checkingProgress")}
                </small>
              </button>
            </div>

            <div className="menu-explainer-grid">
              <article>
                <span className="menu-info-icon">
                  <UiIcon asset="battle" className="menu-card-icon" />
                </span>
                <div>
                  <h2>{t("whatCampaign")}</h2>
                  <p>{t("whatCampaignBody")}</p>
                </div>
              </article>
              <article>
                <span className="menu-info-icon is-seal">
                  <UiIcon asset="run-seal" className="menu-card-icon" />
                </span>
                <div>
                  <h2>{t("sealsAndDefeats")}</h2>
                  <p>{t("sealsAndDefeatsBody")}</p>
                </div>
              </article>
            </div>

            <section className="menu-coming-soon" aria-labelledby="coming-soon-title">
              <div className="menu-section-heading">
                <div>
                  <span className="eyebrow">{t("pathContinues")}</span>
                  <h2 id="coming-soon-title">{t("cabinetOpened")}</h2>
                </div>
                <span className="coming-soon-badge">{t("twoCampaigns")}</span>
              </div>
              <div className="coming-soon-grid">
                <article>
                  <UiIcon asset="battle" className="coming-soon-icon" />
                  <div><strong>Frost &amp; Echo</strong><small>{t("newFamiliesAfterOne")}</small></div>
                </article>
                <article>
                  <UiIcon asset="power" className="coming-soon-icon" />
                  <div><strong>{t("ownBuildPools")}</strong><small>{t("exactlyThreeFamilies")}</small></div>
                </article>
                <article>
                  <UiIcon asset="elite" className="coming-soon-icon" />
                  <div><strong>{t("trophies")}</strong><small>{t("progressNoDamageBonus")}</small></div>
                </article>
              </div>
            </section>
          </section>
        </div>

        {newRunDialog}
        {audioSettingsDialog}
      </main>
    );
  }

  return (
    <main
      className={`game-shell phase-${game.phase} rank-${opponent.rank} ${fullscreenActive ? "is-fullscreen" : ""}`}
      ref={shellRef}
      onClickCapture={handleUiButtonClick}
    >
      <header className="game-header">
        <div className="brand-lockup" aria-label="Kessel-Krawall">
          <span className="brand-kicker">{t("magicalAutobattler")}</span>
          <strong>KESSEL <i>•</i> KRAWALL</strong>
          <span
            className="round-pips"
            aria-label={t("campaignProgress", { round: game.round, max: maxRounds })}
          >
            {Array.from({ length: maxRounds }, (_, index) => (
              <i
                className={
                  index + 1 < game.round
                    ? "is-cleared"
                    : index + 1 === game.round
                      ? "is-current"
                      : ""
                }
                key={index}
                aria-hidden="true"
              />
            ))}
          </span>
        </div>
        <div className="header-hud">
          <div className="run-status">
            <div>
              <small>{t("round")}</small>
              <b>{game.round}/{maxRounds}</b>
            </div>
            <div
              ref={goldStatusRef}
              className={`gold-status ${
                goldTransfers.at(-1)?.kind === "spend"
                  ? "is-spending"
                  : goldTransfers.length > 0
                    ? "is-earning"
                    : ""
              }`}
            >
              <small>{t("gold")}</small>
              <b><UiIcon asset="coin" className="hud-icon" /> {game.gold}</b>
            </div>
            <div>
              <small>{t("seals")}</small>
              <b aria-label={t("protectionSeals", { count: game.seals })}>
                {Array.from({ length: 3 }, (_, index) => (
                  <span
                    className={index < game.seals ? "seal-on" : "seal-off"}
                    key={index}
                    aria-hidden="true"
                  >
                    <UiIcon asset="run-seal" className="seal-icon" />
                  </span>
                ))}
              </b>
            </div>
          </div>
          <button
            type="button"
            className="menu-return-button"
            onClick={handleReturnToMenu}
            aria-label={t("toMainMenu")}
            title={t("toMainMenu")}
          >
            <span className="menu-return-glyph" aria-hidden="true" />
            <small>{t("menu")}</small>
          </button>
          <button
            type="button"
            className="fullscreen-button"
            onClick={handleFullscreen}
            aria-label={fullscreenLabel}
            aria-pressed={fullscreenActive}
            title={fullscreenLabel}
            data-testid="fullscreen-toggle"
          >
            <span
              className={`fullscreen-glyph ${fullscreenActive ? "is-exit" : "is-enter"}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>
      {audioSettingsDialog}

      {game.phase !== "shop" && (
        <section
          className={`arena ${
            game.phase === "battle" && combatPaused
              ? "combat--paused"
              : ""
          } ${kesselHeatActive ? "is-kessel-heated" : ""}`}
          aria-label={t("combatArena")}
          data-combat-paused={
            game.phase === "battle" ? combatPaused : undefined
          }
        >
          <BackdropImage backdrop="arena" className="arena-backdrop" />
        {battleView?.event && battleView.tier && (
          <BattleVolleyVfx
            key={battleView.beatId}
            beatId={battleView.beatId}
            contributions={battleView.contributions}
            playerBoard={game.board}
            enemyBoard={opponent.board}
            shotDurationMs={battleView.eventDuration}
            shotStaggerMs={battleView.shotStaggerMs}
            tier={battleView.tier}
            onImpact={handleBattleVfxImpact}
          />
        )}
        <article className="combatant enemy-combatant">
          <div className="opponent-copy">
            <span className="opponent-emblem" aria-hidden="true">
              <ArtSprite
                asset={OPPONENT_ART[opponent.id]}
                className="opponent-portrait"
              />
              {opponent.rank !== "regular" && (
                <UiIcon asset="elite" className="opponent-rank-icon" />
              )}
            </span>
            <div>
              <span className="eyebrow">
                {opponent.rank === "boss"
                  ? "BOSS · "
                  : opponent.rank === "elite"
                    ? "ELITE · "
                    : ""}
                {localizedOpponent.title} · {t("variant", {
                  current: game.opponentVariant + 1,
                  total: 1 + (opponent.boardVariants?.length ?? 0),
                })}
              </span>
              <h2>{localizedOpponent.name}</h2>
              <p>{localizedOpponent.threat}</p>
            </div>
            {!isCombatPhase && <blockquote>“{localizedOpponent.quote}”</blockquote>}
          </div>
          <HealthBar
            hp={enemyHp}
            maxHp={enemyMaxHp}
            shield={enemyShield}
            label={localizedOpponent.name}
            status={combatStatuses.enemy}
            battleTime={battleClock}
            showStatuses={isCombatPhase}
          />
          <CauldronBoard
            board={opponent.board}
            side="enemy"
            cauldronAsset={
              OPPONENT_CAULDRON_ART[opponent.id] ??
              (opponent.rank === "boss" ? "cauldron-boss" : "cauldron-enemy")
            }
            cauldronVariant={opponent.id}
            selectedSlot={null}
            activeUids={activeUids}
            hitKind={
              battleView?.impactEvent?.target === "enemy"
                ? battleView.impactEvent.kind
                : null
            }
            interactive={false}
            compact={!isCombatPhase}
            combatActive={game.phase === "battle"}
            combatTime={battleClock}
            activationTimesByUid={combatActivationTimes.enemy}
            floatingNumbers={floatingNumbers.filter(
              (number) => number.target === "enemy",
            )}
          />
        </article>

        <div
          className={`effect-lane ${
            effectLaneEventKind ? `event-${effectLaneEventKind}` : ""
          }`}
        >
          {battleEnding ? (
            <div className={`resolution-banner is-${battleEnding}`} role="status">
              <UiIcon
                asset={battleEnding === "timeout" ? "speed" : "battle"}
                className="resolution-icon"
              />
              <span>{battleEnding === "timeout" ? t("timeDecision") : t("knockout")}</span>
              <strong>
                {battleEnding === "timeout"
                  ? `${playerHpPercent}% : ${enemyHpPercent}%`
                  : combat?.winner === "player"
                    ? t("yourCauldronWins")
                    : combat?.winner === "draw"
                      ? t("drawUpper")
                      : t("winsUpper", {
                          opponent: localizedOpponent.name.toUpperCase(),
                        })}
              </strong>
            </div>
          ) : importantCombatMessage ? (
            <div
              className={`combat-callout tier-${
                battleView?.tier ?? "hero"
              } ${
                importantMessageLanded ? "has-landed" : "is-pending"
              }`}
              key={`${battleView?.beatId ?? "event"}-${
                importantCombatMessage.event.kind
              }-${importantCombatMessage.event.sourceUid}`}
            >
              {importantEventSource ? (
                <ArtSprite
                  asset={importantEventSource.art}
                  className="callout-icon"
                />
              ) : (
                <UiIcon
                  asset={eventIcon(importantCombatMessage.event.kind)}
                  className="callout-icon"
                />
              )}
              <strong>
                {translateCombatLabel(importantCombatMessage.label, language)}
                {importantEventRoute && (
                  <small className="callout-timing">
                    {importantEventRoute}
                  </small>
                )}
              </strong>
              <span>{translateCombatAmount(importantCombatMessage.amountLabel, language)}</span>
            </div>
          ) : decisionCountdown ? (
            <div className="decision-countdown" role="timer">
              <UiIcon asset="speed" className="countdown-icon" />
              <span>{t("timeDecisionIn")}</span>
              <strong>{remainingBattleSeconds}</strong>
            </div>
          ) : (
            isCombatPhase ? (
              <div className="versus-mark">{t("brawl")}</div>
            ) : (
              <div className="phase-message" aria-live="polite">
                <span aria-hidden="true">✦</span>
                <strong>{feedback}</strong>
              </div>
            )
          )}
        </div>

        <article className="combatant player-combatant">
          <div className="player-heading">
            <div className="power-heading-wrap">
              {!isCombatPhase && (
                <span className="eyebrow">{t("yourCauldron")}</span>
              )}
              {!isCombatPhase && (
                <h2>
                  <button
                    type="button"
                    className="power-title-button"
                    onClick={() => setShowPowerHelp((current) => !current)}
                    aria-expanded={showPowerHelp}
                    aria-controls="power-explainer"
                  >
                    {t("buildStrength", { power: playerPower })}
                    <i aria-hidden="true">i</i>
                  </button>
                </h2>
              )}
              {!isCombatPhase && showPowerHelp && (
                <div className="power-explainer" id="power-explainer">
                  <strong>{t("buildEstimate")}</strong>
                  <p>{t("buildEstimateBody")}</p>
                  <dl>
                    <div>
                      <dt>{t("ingredientsAndTempo")}</dt>
                      <dd>{playerPowerBreakdown.itemValue}</dd>
                    </div>
                    <div>
                      <dt>
                        {playerPowerBreakdown.synergyCount === 1
                          ? t("activeSynergyOne", {
                              count: playerPowerBreakdown.synergyCount,
                            })
                          : t("activeSynergyMany", {
                              count: playerPowerBreakdown.synergyCount,
                            })}
                      </dt>
                      <dd>+{playerPowerBreakdown.synergyBonus}</dd>
                    </div>
                    <div>
                      <dt>{t("roughBuildStrength")}</dt>
                      <dd>{playerPower}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
            {!isCombatPhase && (
              <button
                type="button"
                className="power-compare"
                onClick={() => setShowPowerHelp((current) => !current)}
                aria-label={t("enemyPowerAria", { power: enemyPower })}
                aria-expanded={showPowerHelp}
                aria-controls="power-explainer"
              >
                <UiIcon asset="power" className="compare-icon" />
                {t("enemy")} ≈ {enemyPower}
              </button>
            )}
          </div>
          <CauldronBoard
            board={game.board}
            side="player"
            cauldronAsset="cauldron-player"
            cauldronVariant="player"
            selectedSlot={game.selectedSlot}
            activeUids={activeUids}
            hitKind={
              battleView?.impactEvent?.target === "player"
                ? battleView.impactEvent.kind
                : null
            }
            interactive={false}
            combatActive={game.phase === "battle"}
            combatTime={battleClock}
            activationTimesByUid={combatActivationTimes.player}
            floatingNumbers={floatingNumbers.filter(
              (number) => number.target === "player",
            )}
          />
          <HealthBar
            hp={playerHp}
            maxHp={100}
            shield={playerShield}
            label={t("yourCauldron")}
            status={combatStatuses.player}
            battleTime={battleClock}
            showStatuses={isCombatPhase}
          />
        </article>
        </section>
      )}

      {game.phase === "intro" && (
        <section className="intro-sheet" aria-labelledby="run-intro-title">
          <span className="eyebrow">{t("firstRound")}</span>
          <h2 id="run-intro-title">{t("orientThenBrew")}</h2>
          <p>
            {t("introPrefix")} <strong>{localizedOpponent.name}</strong>{" "}
            {t("introSuffix")}
          </p>
          <div className="intro-facts" aria-label={t("firstRoundFlow")}>
            <span><b>1</b> {t("chooseIngredients")}</span>
            <span><b>2</b> {t("buildSynergies")}</span>
            <span><b>3</b> {t("startFight")}</span>
          </div>
          <button
            type="button"
            className="intro-button"
            onClick={handleEnterOpeningShop}
          >
            {t("toMarket")}
            <span>{t("openingOfferHint")}</span>
          </button>
        </section>
      )}

      {game.phase === "shop" && (
        <section
          className="shop-sheet preparation-screen"
          aria-label={t("preparationPhase")}
        >
          <BackdropImage
            backdrop="market"
            desktopBackdrop="market-desktop"
            className="panel-backdrop market-backdrop"
          />
          <div className="preparation-overview">
            <OpponentPreparationCard
              opponent={opponent}
              power={enemyPower}
              variant={game.opponentVariant}
            />

            <section className="player-workbench" aria-labelledby="player-workbench-title">
              <div className="workbench-heading">
                <div>
                  <span className="eyebrow">{t("yourBuild")}</span>
                  <h2 id="player-workbench-title">{t("fiveIngredients")}</h2>
                </div>
                <div className="workbench-stats">
                  <span>
                    <UiIcon asset="health" className="prep-stat-icon" />
                    100 {language === "en" ? "HP" : "LP"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPowerHelp((current) => !current)}
                    aria-expanded={showPowerHelp}
                    aria-controls="power-explainer"
                  >
                    <UiIcon asset="power" className="prep-stat-icon" />
                    {t("buildStrength", { power: playerPower })}
                  </button>
                </div>
              </div>
              {showPowerHelp && (
                <div className="power-explainer prep-power-explainer" id="power-explainer">
                  <strong>{t("buildEstimate")}</strong>
                  <p>{t("buildEstimateShop")}</p>
                </div>
              )}
              <div
                className={`workbench-inventory-row ${
                  game.round >= RESERVE_UNLOCK_ROUND ? "has-reserve" : ""
                }`}
              >
                <CauldronBoard
                  board={game.board}
                  side="player"
                  cauldronAsset="cauldron-player"
                  selectedSlot={game.selectedSlot}
                  activeUids={[]}
                  hitKind={null}
                  interactive
                  showCauldron={false}
                  onSlot={handleSlot}
                  insightTargetSlots={selectedInsights?.affects.slots}
                  insightSourceSlots={selectedInsights?.benefits.slots}
                />
                {game.round >= RESERVE_UNLOCK_ROUND && (
                  <ReservePocket
                    item={game.reserve}
                    selected={reserveSelected}
                    onClick={handleReserve}
                  />
                )}
              </div>
              <SynergyStrip board={game.board} families={game.activeFamilies} />
            </section>
          </div>

          <div className="shop-scroll">
            <div className="shop-topline">
              <div>
                <span className="eyebrow">{t("witchesMarket")}</span>
                <h2>{t("chooseThree")}</h2>
              </div>
            </div>

            {selectedDefinition && selectedItem && selectedInsights && (
              <ItemInspectorCard
                item={selectedItem}
                definition={selectedDefinition}
                insights={selectedInsights}
                inReserve={reserveSelected}
                onClose={() => {
                  if (reserveSelected) handleReserve();
                  else if (game.selectedSlot !== null) {
                    handleSlot(game.selectedSlot);
                  }
                }}
                onSell={handleSell}
              />
            )}

            <div className="offer-grid">
              {game.offers.map((offer) => {
                const definition = ITEM_BY_ID[offer.itemId];
                const reserveUnlocked =
                  game.round >= RESERVE_UNLOCK_ROUND;
                const mergePreview = offer.bought
                  ? null
                  : getPurchaseMergePreview(
                      game.board,
                      offer.itemId,
                      game.reserve,
                      reserveUnlocked,
                    );
                const directMatch = [...game.board, game.reserve].some(
                  (item) =>
                    item?.itemId === offer.itemId && item.level === 1,
                );
                const hasPurchaseSpace =
                  game.board.some((item) => item === null) ||
                  directMatch ||
                  (reserveUnlocked && game.reserve === null);
                const parksInReserve =
                  reserveUnlocked &&
                  game.board.every(Boolean) &&
                  !directMatch &&
                  game.reserve === null;
                const disabled = offer.bought || busy;
                return (
                  <button
                    type="button"
                    key={offer.uid}
                    className={`shop-card ${familyClass(definition.family)} ${
                      offer.bought ? "is-bought" : ""
                    } ${
                      !offer.bought && !hasPurchaseSpace ? "is-blocked" : ""
                    }`}
                    onClick={(event) =>
                      handleBuy(offer.uid, event.currentTarget)
                    }
                    disabled={disabled}
                    data-audio="manual"
                    data-testid={`offer-${offer.uid}`}
                  >
                    <span className="offer-family">
                      <UiIcon
                        asset={FAMILY_ICON[definition.family]}
                        className="offer-family-icon"
                      />
                      {familyText(
                        definition.family,
                        language,
                        FAMILY_META[definition.family],
                      ).name}
                    </span>
                    <span className="offer-icon" aria-hidden="true">
                      <ArtSprite
                        asset={ITEM_ART[definition.id]}
                        className="offer-item-art"
                      />
                    </span>
                    <strong>{itemName(definition, language)}</strong>
                    <small>{itemDescription(definition, 1, language)}</small>
                    <span className="offer-synergy">
                      {offerSynergyLabel(game.board, definition.family, language)}
                    </span>
                    {mergePreview && (
                      <span className="offer-merge-target">
                        {mergePreview.target.area === "board"
                          ? t("mergeStaysSlot", {
                              slot: mergePreview.target.slot + 1,
                            })
                          : t("mergeInReserve")}
                        {" · "}
                        {ROMAN_LEVEL[mergePreview.resultLevel]}
                      </span>
                    )}
                    {!mergePreview && parksInReserve && (
                      <span className="offer-merge-target is-reserve-target">
                        {t("landsInReserve")}
                      </span>
                    )}
                    <span className="offer-price">
                      {offer.bought ? (
                        t("bought")
                      ) : !hasPurchaseSpace ? (
                        t("full")
                      ) : (
                        <>
                          <UiIcon asset="coin" className="price-icon" />
                          {definition.cost}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shop-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleReroll}
              disabled={busy}
              data-audio="manual"
            >
              <UiIcon asset="reroll" className="button-icon" />
              {t("reroll")}
              <b>
                {game.rerollsUsed === 0 ? (
                  t("free")
                ) : (
                  <>
                    <UiIcon asset="coin" className="price-icon" /> 1
                  </>
                )}
              </b>
            </button>
            <button
              type="button"
              className="fight-button"
              onClick={handleFight}
              disabled={busy || !game.board.some(Boolean)}
            >
              <span><UiIcon asset="battle" className="button-icon" /> {t("fightStart")}</span>
              <b>{opponent.rank === "boss" ? t("bossPrefix") : t("againstPrefix")}{localizedOpponent.name}</b>
            </button>
          </div>
        </section>
      )}

      {game.phase === "battle" && (
        <section
          className={`battle-controls ${
            decisionCountdown ? "is-decision-window" : ""
          } ${combatPaused ? "combat--paused is-paused" : ""} ${
            kesselHeatActive ? "is-kessel-heated" : ""
          }`}
          aria-label={t("combatControls")}
          data-combat-paused={combatPaused}
        >
          <BackdropImage backdrop="arena" className="panel-backdrop battle-backdrop" />
          <div className="battle-status" aria-live="polite">
            <UiIcon asset="battle" className="battle-title-icon" />
            <span className="live-dot" aria-hidden="true" />
            <strong>
              {combatPaused
                ? t("battlePaused")
                : kesselHeatActive
                  ? t("cauldronHeat", { percent: kesselHeatPercent })
                  : t("battleRunning")}
            </strong>
            <small>
              {combatPaused
                ? t("playbackPaused")
                : decisionCountdown
                ? t("secondsToDecision", { seconds: remainingBattleSeconds })
                : focusedEventRoute
                  ? focusedEventRoute
                : kesselHeatActive
                  ? t("damageForBoth", { percent: kesselHeatPercent })
                : speed === 1
                  ? t("readingMode")
                  : t("directedSpeed", { speed })}
            </small>
          </div>
          <div className="battle-score-grid">
            <div>
              <span>{localizedOpponent.name}</span>
              <strong>{Math.max(0, enemyHp)}</strong>
              <small><UiIcon asset="shield" className="score-icon" /> {enemyShield}</small>
            </div>
            <UiIcon asset="power" className="score-versus-icon" />
            <div>
              <span>{t("yourCauldron")}</span>
              <strong>{Math.max(0, playerHp)}</strong>
              <small><UiIcon asset="shield" className="score-icon" /> {playerShield}</small>
            </div>
          </div>
          <div
            className={`battle-event-panel ${
              focusedContribution
                ? `event-${focusedContribution.event.kind}`
                : ""
            } ${focusedContributionLanded ? "has-landed" : "is-pending"} ${
              importantCombatMessage ? "is-suppressed" : ""
            }`}
            aria-hidden={importantCombatMessage ? "true" : undefined}
          >
            <UiIcon
              asset={
                focusedContribution
                  ? eventIcon(focusedContribution.event.kind)
                  : "speed"
              }
              className="battle-event-icon"
            />
            <span>
              {focusedContribution
                ? `${
                    eventSource
                      ? `${sideLabel(focusedContribution.event.actor)} · Slot ${
                          eventSource.slot + 1
                        } · ${eventSource.name} → ${sideLabel(
                          focusedContribution.event.target,
                        )} · `
                      : `${sideLabel(
                          focusedContribution.event.actor,
                        )} → ${sideLabel(focusedContribution.event.target)} · `
                  }${translateCombatLabel(focusedContribution.label, language)}`
                : decisionCountdown
                  ? t("timeDecisionInSeconds", { seconds: remainingBattleSeconds })
                  : t("cauldronsCharging")}
            </span>
            <strong>
              {focusedContribution
                ? focusedContributionLanded
                  ? translateCombatAmount(focusedContribution.amountLabel, language)
                  : t("incoming")
                : "…"}
            </strong>
          </div>
          <div className="battle-speed">
            <span><UiIcon asset="speed" className="speed-icon" /> {t("tempo")}</span>
            <div
              className="speed-control"
              aria-label={t("pauseAndSpeed")}
            >
              <button
                type="button"
                className={`pause-toggle ${
                  combatPaused ? "is-pause-active" : ""
                }`}
                onClick={handleCombatPause}
                aria-label={
                  combatPaused ? t("resumeFight") : t("pauseFight")
                }
                aria-pressed={combatPaused}
                data-testid="combat-pause-toggle"
              >
                <span aria-hidden="true">
                  {combatPaused ? "▶" : "Ⅱ"}
                </span>
                <small>{combatPaused ? t("resume") : t("pause")}</small>
              </button>
              {[1, 2, 4].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={speed === value ? "is-active" : ""}
                  onClick={() => updateCombatSpeed(value)}
                >
                  {value}×{value === 1 ? <small>{t("clear")}</small> : null}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {game.phase === "result" && combat && (
        <section
          className={`result-sheet ${
            combat.winner === "player"
              ? "is-victory"
              : combat.winner === "draw"
                ? "is-draw"
                : "is-defeat"
          }`}
        >
          <div className="result-heading">
            <ArtSprite
              asset={
                combat.winner === "player"
                  ? "result-victory"
                  : "result-defeat"
              }
              className="result-emblem"
            />
            <div>
              <span className="eyebrow">{combat.reason === "knockout" ? t("koShort") : t("timeDecision")}</span>
              <h2>
                {combat.winner === "player"
                  ? t("cauldronVictory")
                  : combat.winner === "draw"
                    ? t("draw")
                    : isOpeningDefeatProtected(game, combat.winner)
                      ? t("stillProtected")
                      : game.seals <= 1
                        ? t("lastSealBroken")
                        : t("sealBreak")}
              </h2>
              <p>
                {combat.winner === "player"
                  ? game.round >= maxRounds
                    ? t("trophyYours", { trophy: localizedCampaign.trophyName })
                    : t("nextRoundGold", { gold: getRoundReward(game, true) })
                  : combat.winner === "draw"
                    ? t("drawResult", { opponent: localizedOpponent.name })
                    : isOpeningDefeatProtected(game, combat.winner)
                      ? t("protectedLossResult", {
                          gold: getBattleReward(game, combat.winner),
                        })
                      : game.seals <= 1
                        ? t("campaignEndsResult", {
                            opponent: localizedOpponent.name,
                          })
                        : t("revengeGoldResult", {
                            opponent: localizedOpponent.name,
                            gold: getBattleReward(game, combat.winner),
                          })}
              </p>
              {combat.reason === "timeout" && (
                <div className="decision-result" aria-label={t("relativeHealth")}>
                  <span>{t("yourCauldron")} <b>{playerHpPercent}%</b></span>
                  <i aria-hidden="true">{t("versus")}</i>
                  <span>{localizedOpponent.name} <b>{enemyHpPercent}%</b></span>
                  {playerHpPercent === enemyHpPercent && (
                    <small>
                      {t("hpDamage", {
                        player: playerHpDamageTotal,
                        enemy: enemyHpDamageTotal,
                      })}
                    </small>
                  )}
                </div>
              )}
            </div>
          </div>
          <StatsList stats={combat.playerStats} />
          <button type="button" className="continue-button" onClick={handleContinue}>
            {combat.winner === "player"
              ? game.round >= maxRounds
                ? t("finishCampaign")
                : t("takeReward", { gold: getBattleReward(game, combat.winner) })
              : combat.winner === "draw"
                ? t("prepareRevenge")
                : !isOpeningDefeatProtected(game, combat.winner) && game.seals <= 1
                  ? t("finishCampaign")
                  : t("prepareRevengeGold", {
                      gold: getBattleReward(game, combat.winner),
                    })}
            <span>
              {combat.winner === "player"
                ? game.round >= maxRounds
                  ? t("viewCampaignResult")
                  : t("prepareRound", { round: game.round + 1 })
                : combat.winner === "enemy" &&
                    !isOpeningDefeatProtected(game, combat.winner) &&
                    game.seals <= 1
                  ? t("viewCampaignResult")
                  : t("challengeAgain", { opponent: localizedOpponent.name })}
            </span>
          </button>
        </section>
      )}

      {game.phase === "gameover" && (
        <section className="gameover-sheet">
          <ArtSprite asset="result-defeat" className="gameover-icon" />
          <span className="eyebrow">
            {game.round >= maxRounds ? t("bossStanding") : t("cauldronCold")}
          </span>
          <h2>
            {game.round >= maxRounds
              ? t("defendsTrophy", {
                  opponent: localizedOpponent.name,
                  trophy: localizedCampaign.trophyName,
                })
              : t("campaignEndsRound", { round: game.round })}
          </h2>
          <p>
            {t("gameoverSummary", {
              wins: game.victories,
              power: playerPower,
            })}
          </p>
          <button type="button" className="continue-button" onClick={handleReset}>
            {t("startNewCampaign")}
            <span>{t("freshShopHint")}</span>
          </button>
        </section>
      )}

      {game.phase === "victory" && (
        <section className="gameover-sheet victory-sheet">
          <ArtSprite asset="result-victory" className="gameover-icon" />
          <span className="eyebrow">{t("cauldronMaster")}</span>
          <h2>{t("masteredCampaign", { campaign: localizedCampaign.name })}</h2>
          <p>
            {t("victorySummary", {
              wins: game.victories,
              seals: game.seals,
              power: playerPower,
            })}
          </p>
          <button type="button" className="continue-button" onClick={handleOpenCabinet}>
            {t("bringTrophy")}
            <span>{t("seeNextCampaign")}</span>
          </button>
        </section>
      )}

      {goldTransfers.length > 0 && (
        <div className="gold-transfer-layer" aria-hidden="true">
          {goldTransfers.map((transfer) => {
            const travelX = transfer.to.x - transfer.from.x;
            const travelY = transfer.to.y - transfer.from.y;
            const transferStyle = {
              left: `${transfer.from.x}px`,
              top: `${transfer.from.y}px`,
              "--travel-x": `${travelX}px`,
              "--travel-y": `${travelY}px`,
              "--arc-x": `${travelX * 0.52}px`,
              "--arc-y": `${travelY * 0.52 - 46}px`,
              "--hud-x": `${transfer.hud.x - transfer.from.x}px`,
              "--hud-y": `${transfer.hud.y - transfer.from.y}px`,
            } as CSSProperties;
            return (
              <div
                className={`gold-transfer is-${transfer.kind}`}
                style={transferStyle}
                key={transfer.id}
              >
                {["one", "two", "three"].map((coin) => (
                  <UiIcon
                    asset="coin"
                    className={`gold-transfer-coin coin-${coin}`}
                    key={coin}
                  />
                ))}
                <strong className="gold-transfer-delta">
                  {transfer.kind === "spend" ? "−" : "+"}
                  {transfer.amount}
                </strong>
              </div>
            );
          })}
        </div>
      )}

      {mergeNotice && (
        <div
          className={`merge-overlay ${familyClass(mergeNotice.family)} ${mergeNotice.toLevel === 3 ? "is-max-level" : ""}`}
          role="status"
          aria-live="assertive"
          key={`${mergeNotice.label}-${mergeNotice.step}`}
          style={{
            "--merge-duration": `${getMergeDurationMs(mergeNotice.toLevel)}ms`,
            "--merge-motion-duration": `${getMergeMotionDurationMs(mergeNotice.toLevel)}ms`,
          } as CSSProperties}
        >
          <div className="merge-progress">
            <span>{t("merge")}</span>
            {mergeNotice.total > 1 && (
              <b>{t("cascade", {
                step: mergeNotice.step,
                total: mergeNotice.total,
              })}</b>
            )}
          </div>
          <div className="merge-stage" aria-hidden="true">
            <div className="merge-input merge-input-left">
              <ArtSprite asset={mergeNotice.art} className="merge-input-art" />
              <b>{ROMAN_LEVEL[mergeNotice.fromLevel]}</b>
            </div>
            <span className="merge-plus">+</span>
            <div className="merge-input merge-input-right">
              <ArtSprite asset={mergeNotice.art} className="merge-input-art" />
              <b>{ROMAN_LEVEL[mergeNotice.fromLevel]}</b>
            </div>
            <div className="merge-output">
              <ArtSprite asset="merge-sigil" className="merge-sigil" />
              <ArtSprite asset={mergeNotice.art} className="merge-item-art" />
              <b>{ROMAN_LEVEL[mergeNotice.toLevel]}</b>
            </div>
          </div>
          <span className="merge-kicker">{t("merged")}</span>
          <strong className="merge-title">{mergeNotice.label}</strong>
          <div className="merge-comparison">
            <span>{mergeNotice.valueLabel}</span>
            <b>{mergeNotice.oldValue}</b>
            <i aria-hidden="true">→</i>
            <strong>{mergeNotice.newValue}</strong>
          </div>
          <div className="merge-comparison is-cooldown">
            <span>{t("cooldown")}</span>
            <b>{formatDecimal(mergeNotice.oldCooldown, language)}{language === "en" ? "s" : " s"}</b>
            <i aria-hidden="true">→</i>
            <strong>{formatDecimal(mergeNotice.newCooldown, language)}{language === "en" ? "s" : " s"}</strong>
          </div>
          {mergeNotice.bonus && (
            <div className="merge-bonus">{mergeNotice.bonus}</div>
          )}
          {mergeNotice.step === mergeNotice.total &&
            (mergeNotice.targetArea === "reserve" ? (
              <div className="merge-bonus">
                {t("inReserveInactive")}
              </div>
            ) : (
              <div className="merge-power">
                <UiIcon asset="power" className="merge-power-icon" />
                <span>{t("power")}</span>
                <b>{mergeNotice.powerBefore}</b>
                <i aria-hidden="true">→</i>
                <strong>{mergeNotice.powerAfter}</strong>
                <em>+{mergeNotice.powerAfter - mergeNotice.powerBefore}</em>
              </div>
            ))}
        </div>
      )}

      <div className="rotate-device" role="status">
        <span aria-hidden="true">↻</span>
        <strong>{t("rotatePortrait")}</strong>
        <small>{t("portraitHint")}</small>
      </div>
    </main>
  );
}

export default function Game() {
  return (
    <I18nProvider>
      <GameContent />
    </I18nProvider>
  );
}
