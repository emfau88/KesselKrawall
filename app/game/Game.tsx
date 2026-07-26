"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArtSprite,
  BackdropImage,
  ITEM_ART,
  OPPONENT_ART,
  UiIcon,
  type ArtAsset,
  type UiAsset,
} from "./ArtSprite";
import { FAMILY_META, ITEM_BY_ID } from "./data";
import { getItemCooldownMs, simulateBattle } from "./simulation";
import {
  advanceAfterBattle,
  beginBattle,
  buyOffer,
  createInitialState,
  getCurrentOpponent,
  getFamilyWeights,
  getPowerValue,
  getRoundReward,
  getSellValue,
  MAX_ROUNDS,
  rerollShop,
  resetRun,
  sanitizeStoredState,
  selectOrSwapSlot,
  sellSlot,
  showBattleResult,
  STORAGE_KEY,
} from "./state";
import type {
  Board,
  CombatEvent,
  CombatEventKind,
  CombatResult,
  Family,
  GameState,
  ItemCombatStats,
  ItemDefinition,
  ItemLevel,
  Side,
} from "./types";

const ROMAN_LEVEL = ["", "I", "II", "III"] as const;

interface BattleView {
  time: number;
  playerHp: number;
  playerShield: number;
  enemyHp: number;
  enemyShield: number;
  activeUid: string | null;
  event: CombatEvent | null;
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
  step: number;
  total: number;
}

interface EventSource {
  name: string;
  art: ArtAsset;
  family: Family;
  slot: number;
  side: Side;
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
};

function eventIcon(kind: CombatEventKind): UiAsset {
  switch (kind) {
    case "poison":
      return "status-poison";
    case "burn":
      return "status-burn";
    case "heal":
      return "status-heal";
    case "shield":
    case "cleanse":
    case "synergy":
      return "shield";
    case "boss":
      return "status-rage";
    default:
      return "battle";
  }
}

function eventAmountLabel(event: CombatEvent): string {
  switch (event.kind) {
    case "heal":
      return `+${event.amount} LP`;
    case "shield":
    case "synergy":
      return `+${event.amount} Schild`;
    case "cleanse":
      return `−${event.amount} Gift`;
    case "poison":
      return event.label.includes("tickt")
        ? `−${event.amount} LP`
        : `+${event.amount} Gift`;
    case "burn":
      return event.label.includes("tickt")
        ? `−${event.amount} LP`
        : `+${event.amount} Brand`;
    case "boss":
      return `+${event.amount}%`;
    default:
      return `−${event.amount} LP`;
  }
}

function mergeValueLabel(definition: ItemDefinition): string {
  switch (definition.effect) {
    case "poison":
      return "Giftstapel";
    case "shield":
    case "shieldDamage":
      return "Schild";
    case "heal":
    case "hybrid":
      return "Heilung";
    default:
      return "Schaden";
  }
}

function mergeBonusLabel(definition: ItemDefinition, level: ItemLevel): string | null {
  if (level !== 3) return null;
  switch (definition.levelThreeBonus) {
    case "burn":
      return "NEU: Verursacht Brand";
    case "cleansePoison":
      return "NEU: Entfernt Gift";
    case "overhealShield":
      return "NEU: Überheilung wird Schild";
    default:
      return "MAXIMALSTUFE ERREICHT";
  }
}

function findEventSource(
  event: CombatEvent | null,
  playerBoard: Board,
  enemyBoard: Board,
): EventSource | null {
  if (!event) return null;
  const board = event.actor === "player" ? playerBoard : enemyBoard;
  const slot = board.findIndex((instance) => instance?.uid === event.sourceUid);
  const instance = slot >= 0 ? board[slot] : null;
  if (!instance) return null;
  const definition = ITEM_BY_ID[instance.itemId];
  return {
    name: definition.name,
    art: ITEM_ART[definition.id],
    family: definition.family,
    slot,
    side: event.actor,
  };
}

function HealthBar({
  hp,
  maxHp,
  shield,
  label,
}: {
  hp: number;
  maxHp: number;
  shield: number;
  label: string;
}) {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className="health-cluster" aria-label={`${label}: ${hp} Leben, ${shield} Schild`}>
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
        <span style={{ width: `${hpPercent}%` }} />
      </div>
    </div>
  );
}

function CauldronBoard({
  board,
  side,
  cauldronAsset,
  selectedSlot,
  activeUid,
  hitKind,
  interactive,
  onSlot,
  compact = false,
  combatActive = false,
  combatSpeed = 1,
}: {
  board: Board;
  side: "player" | "enemy";
  cauldronAsset: ArtAsset;
  selectedSlot: number | null;
  activeUid: string | null;
  hitKind: CombatEventKind | null;
  interactive: boolean;
  onSlot?: (slot: number) => void;
  compact?: boolean;
  combatActive?: boolean;
  combatSpeed?: number;
}) {
  return (
    <div
      className={[
        "cauldron-board",
        compact ? "is-compact" : "",
        hitKind ? `is-reacting reaction-${hitKind}` : "",
      ].join(" ")}
      data-side={side}
    >
      <div
        className="cauldron"
        aria-hidden="true"
        key={`${hitKind ?? "idle"}-${activeUid ?? "rest"}`}
      >
        <span className="cauldron-aura" />
        <ArtSprite asset={cauldronAsset} className="cauldron-art" />
        <span className="cauldron-steam steam-one" />
        <span className="cauldron-steam steam-two" />
      </div>
      <div className="slot-arc">
        {board.map((instance, slot) => {
          const definition = instance ? ITEM_BY_ID[instance.itemId] : null;
          const slotLabel = definition
            ? `Slot ${slot + 1}: ${definition.name}, Level ${instance!.level}`
            : `Slot ${slot + 1}: leer`;
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
            activeUid === instance?.uid ? "is-active" : "",
            definition ? familyClass(definition.family) : "",
          ].join(" ");
          const slotStyle =
            definition && combatActive
              ? ({
                  "--cooldown-duration": `${Math.max(
                    650,
                    getItemCooldownMs(board, slot) / combatSpeed,
                  )}ms`,
                  "--cooldown-color": FAMILY_META[definition.family].color,
                } as CSSProperties)
              : undefined;

          return interactive ? (
            <button
              key={slot}
              type="button"
              className={className}
              data-slot={slot}
              onClick={() => onSlot?.(slot)}
              aria-label={slotLabel}
              aria-pressed={selectedSlot === slot}
              style={slotStyle}
            >
              {content}
              {definition && combatActive && (
                <span className="cooldown-ring" aria-hidden="true" />
              )}
            </button>
          ) : (
            <div
              key={slot}
              className={className}
              data-slot={slot}
              aria-label={slotLabel}
              style={slotStyle}
            >
              {content}
              {definition && combatActive && (
                <span className="cooldown-ring" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SynergyStrip({ board }: { board: Board }) {
  const weights = getFamilyWeights(board);
  return (
    <div className="synergy-strip" aria-label="Familien-Synergien">
      {(Object.keys(FAMILY_META) as Family[]).map((family) => {
        const meta = FAMILY_META[family];
        const active = weights[family] >= 3;
        return (
          <div
            key={family}
            className={`synergy-pill ${familyClass(family)} ${active ? "is-active" : ""}`}
            title={meta.shortBonus}
          >
            <UiIcon asset={FAMILY_ICON[family]} className="synergy-icon" />
            <span>{meta.name}</span>
            <strong>{Math.min(weights[family], 3)}/3</strong>
          </div>
        );
      })}
    </div>
  );
}

function StatsList({ stats }: { stats: ItemCombatStats[] }) {
  const meaningful = stats.filter(
    (stat) =>
      stat.triggers > 0 ||
      stat.damage > 0 ||
      stat.healing > 0 ||
      stat.shield > 0,
  );
  if (meaningful.length === 0) {
    return <p className="empty-stats">Noch keine auswertbaren Aktionen.</p>;
  }
  return (
    <div className="stats-list">
      {meaningful.map((stat) => {
        const definition = ITEM_BY_ID[stat.itemId];
        return (
          <div className="stat-row" key={stat.uid}>
            <span className="stat-icon" aria-hidden="true">
              <ArtSprite
                asset={ITEM_ART[definition.id]}
                className="stat-item-art"
              />
            </span>
            <span className="stat-name">
              {definition.name} {ROMAN_LEVEL[stat.level]}
              <small>{stat.triggers}× ausgelöst</small>
            </span>
            <span className="stat-values">
              {stat.damage > 0 && <b className="damage-stat">{stat.damage} Schaden</b>}
              {stat.healing > 0 && <b className="heal-stat">{stat.healing} Heilung</b>}
              {stat.shield > 0 && <b className="shield-stat">{stat.shield} Schild</b>}
              {stat.poisonApplied > 0 && <b className="poison-stat">{stat.poisonApplied} Gift</b>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BattleVfx({
  event,
  source,
  speed,
}: {
  event: CombatEvent;
  source: EventSource | null;
  speed: number;
}) {
  const projectile: ArtAsset =
    event.kind === "poison"
      ? "vfx-poison"
      : event.kind === "shield" ||
          event.kind === "synergy" ||
          event.kind === "cleanse" ||
          event.kind === "heal"
        ? "vfx-shield"
        : "vfx-fire";
  const isSelfEffect = event.actor === event.target;
  const sourceY = event.actor === "player" ? 75 : 25;
  const effectStyle = {
    "--source-y": `${sourceY}%`,
    "--event-duration": `${Math.max(220, 560 / speed)}ms`,
    "--impact-delay": `${Math.max(100, 280 / speed)}ms`,
  } as CSSProperties;

  return (
    <div
      className={[
        "arena-vfx",
        `vfx-${event.kind}`,
        `from-${event.actor}`,
        `to-${event.target}`,
        source ? familyClass(source.family) : "",
        source ? `source-slot-${source.slot}` : "",
        isSelfEffect ? "is-self-effect" : "is-projectile",
      ].join(" ")}
      style={effectStyle}
      aria-hidden="true"
    >
      {source && (
        <div className="projectile-source">
          <span className="source-item-frame">
            <ArtSprite asset={source.art} className="source-item-art" />
          </span>
          <strong>{source.name}</strong>
        </div>
      )}
      <ArtSprite asset={projectile} className="battle-projectile" />
      <ArtSprite asset="vfx-impact" className="battle-impact" />
      <span className="vfx-particle particle-one" />
      <span className="vfx-particle particle-two" />
      <span className="vfx-particle particle-three" />
      <span className="vfx-particle particle-four" />
    </div>
  );
}

export default function Game() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [feedback, setFeedback] = useState("Bereite deinen Kessel vor.");
  const [mergeNotices, setMergeNotices] = useState<MergeNotice[]>([]);
  const [busy, setBusy] = useState(false);
  const [combat, setCombat] = useState<CombatResult | null>(null);
  const [battleView, setBattleView] = useState<BattleView | null>(null);
  const [battleClock, setBattleClock] = useState(0);
  const [battleEnding, setBattleEnding] = useState<CombatResult["reason"] | null>(null);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const speedRef = useRef(speed);
  const shellRef = useRef<HTMLElement>(null);
  const mergeNotice = mergeNotices[0] ?? null;

  const opponent = useMemo(() => getCurrentOpponent(game), [game]);
  const selectedItem =
    game.selectedSlot === null ? null : game.board[game.selectedSlot];
  const selectedDefinition = selectedItem
    ? ITEM_BY_ID[selectedItem.itemId]
    : null;
  const playerPower = getPowerValue(game.board);
  const enemyPower = getPowerValue(opponent.board);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = sanitizeStoredState(JSON.parse(saved));
          if (parsed) setGame(parsed);
        }
      } catch {
        // A blocked or corrupted local store must never block the game.
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (!mergeNotice) return;
    navigator.vibrate?.(mergeNotice.toLevel === 3 ? [35, 35, 70] : 45);
    const timer = window.setTimeout(() => {
      setMergeNotices((current) => {
        const remaining = current.slice(1);
        if (remaining.length === 0) setBusy(false);
        return remaining;
      });
    }, 1_400);
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
    if (!hydrated || game.phase === "battle" || game.phase === "result") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } catch {
      // Device storage is optional; the active session remains playable.
    }
  }, [game, hydrated]);

  useEffect(() => {
    if (game.phase !== "battle" || !combat) return;
    let eventIndex = 0;
    let targetTime = 0;
    let shownTime = 0;
    let lastRealTime = performance.now();
    let nextEventAllowedAt = lastRealTime;
    let lastClockPaint = lastRealTime;
    let eventVisible = false;
    let finished = false;
    let animationFrame = 0;
    let finishTimer = 0;

    const finishBattle = () => {
      if (finished) return;
      finished = true;
      setBattleClock(combat.duration);
      setBattleView({
        time: combat.duration,
        playerHp: combat.finalPlayerHp,
        playerShield: combat.finalPlayerShield,
        enemyHp: combat.finalEnemyHp,
        enemyShield: combat.finalEnemyShield,
        activeUid: null,
        event: null,
      });
      setBattleEnding(combat.reason);
      navigator.vibrate?.(
        combat.reason === "knockout"
          ? combat.winner === "player"
            ? [45, 35, 90]
            : [80, 45, 80]
          : 55,
      );
      finishTimer = window.setTimeout(
        () => {
          setGame((current) => showBattleResult(current));
          setFeedback(
            combat.winner === "player"
              ? "Dein Kessel gewinnt den Schlagabtausch!"
              : `${opponent.name} behält die Oberhand.`,
          );
        },
        combat.reason === "timeout" ? 1_250 : 850,
      );
    };

    const animate = (now: number) => {
      const realDelta = Math.min(100, now - lastRealTime);
      targetTime = Math.min(
        combat.duration,
        targetTime + realDelta * speedRef.current,
      );
      lastRealTime = now;

      const nextEvent = combat.events[eventIndex];
      if (
        nextEvent &&
        nextEvent.time <= targetTime &&
        now >= nextEventAllowedAt
      ) {
        const holdTime =
          speedRef.current <= 1 ? 560 : speedRef.current <= 2 ? 360 : 220;
        shownTime = nextEvent.time;
        eventIndex += 1;
        eventVisible = true;
        nextEventAllowedAt = now + holdTime;
        setBattleView({
          time: nextEvent.time,
          playerHp: nextEvent.playerHp,
          playerShield: nextEvent.playerShield,
          enemyHp: nextEvent.enemyHp,
          enemyShield: nextEvent.enemyShield,
          activeUid: nextEvent.sourceUid,
          event: nextEvent,
        });
      } else if (eventVisible && now >= nextEventAllowedAt) {
        eventVisible = false;
        setBattleView((current) =>
          current
            ? {
                ...current,
                activeUid: null,
                event: null,
              }
            : current,
        );
      }

      const waitingEvent = combat.events[eventIndex];
      const hasBacklog = Boolean(
        waitingEvent && waitingEvent.time <= targetTime,
      );
      const visibleTime = hasBacklog ? shownTime : targetTime;
      if (now - lastClockPaint >= 100) {
        lastClockPaint = now;
        setBattleClock(Math.min(combat.duration, visibleTime));
      }

      if (
        eventIndex >= combat.events.length &&
        targetTime >= combat.duration &&
        now >= nextEventAllowedAt
      ) {
        finishBattle();
        return;
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(finishTimer);
    };
  }, [combat, game.phase, opponent.name]);

  function announce(message: string) {
    setFeedback(message);
  }

  function handleBuy(offerUid: string) {
    if (busy) return;
    const result = buyOffer(game, offerUid);
    if (result.error) {
      announce(result.error);
      return;
    }
    setGame(result.state);
    if (result.merges?.length) {
      const powerBefore = getPowerValue(game.board);
      const powerAfter = getPowerValue(result.state.board);
      const total = result.merges.length;
      const notices = result.merges.map((merge, index): MergeNotice => {
        const definition = ITEM_BY_ID[merge.itemId];
        return {
          label: `${definition.name} ${ROMAN_LEVEL[merge.toLevel]}`,
          art: ITEM_ART[definition.id],
          family: definition.family,
          fromLevel: merge.fromLevel,
          toLevel: merge.toLevel,
          valueLabel: mergeValueLabel(definition),
          oldValue: definition.values[merge.fromLevel - 1],
          newValue: definition.values[merge.toLevel - 1],
          oldCooldown: definition.cooldown[merge.fromLevel - 1],
          newCooldown: definition.cooldown[merge.toLevel - 1],
          powerBefore,
          powerAfter,
          bonus: mergeBonusLabel(definition, merge.toLevel),
          step: index + 1,
          total,
        };
      });
      setMergeNotices(notices);
      announce(
        total > 1
          ? `${total}-stufige Merge-Kaskade!`
          : `${notices[0].label} ist verschmolzen.`,
      );
      setBusy(true);
    } else {
      announce("Zutat gekauft.");
    }
  }

  function handleReroll() {
    if (busy) return;
    const result = rerollShop(game);
    if (result.error) return announce(result.error);
    setGame(result.state);
    announce(game.rerollsUsed === 0 ? "Kostenlos neu gewürfelt." : "Shop neu gewürfelt.");
  }

  function handleSlot(slot: number) {
    if (busy) return;
    const wasSelected = game.selectedSlot;
    const result = selectOrSwapSlot(game, slot);
    setGame(result.state);
    if (wasSelected === null && game.board[slot]) {
      announce("Zutat gewählt. Tippe einen zweiten Platz zum Tauschen.");
    } else if (wasSelected !== null && wasSelected !== slot) {
      announce("Zutaten umsortiert.");
    }
  }

  function handleSell() {
    if (game.selectedSlot === null) return;
    const result = sellSlot(game, game.selectedSlot);
    if (result.error) return announce(result.error);
    setGame(result.state);
    announce(`Verkauft für ${result.goldDelta} Gold.`);
  }

  function handleFight() {
    if (busy) return;
    const result = beginBattle(game);
    if (result.error) return announce(result.error);
    const battle = simulateBattle(game.board, opponent);
    setCombat(battle);
    setBattleClock(0);
    setBattleEnding(null);
    setBattleView({
      time: 0,
      playerHp: battle.playerMaxHp,
      playerShield: 0,
      enemyHp: battle.enemyMaxHp,
      enemyShield: 0,
      activeUid: null,
      event: null,
    });
    setGame(result.state);
    announce("Der Kessel-Krawall beginnt!");
  }

  function handleContinue() {
    if (!combat) return;
    const won = combat.winner === "player";
    setGame((current) => advanceAfterBattle(current, won));
    setCombat(null);
    setBattleView(null);
    setBattleClock(0);
    setBattleEnding(null);
    if (game.round >= MAX_ROUNDS) {
      announce(
        won
          ? "Der Großkessel fällt. Du gewinnst das Kesselturnier!"
          : "Der Großkessel verteidigt seinen Titel.",
      );
    } else {
      announce(won ? "Siegbonus erhalten. Nächster Gegner!" : "Ein Siegel ist gebrochen.");
    }
  }

  function handleReset() {
    const next = resetRun();
    setGame(next);
    setCombat(null);
    setBattleView(null);
    setBattleClock(0);
    setBattleEnding(null);
    setMergeNotices([]);
    setBusy(false);
    announce("Ein neuer Kessel betritt den Wettstreit.");
  }

  async function handleFullscreen() {
    const fullscreenDocument = document as WebkitFullscreenDocument;
    const fullscreenElement =
      document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement;

    try {
      if (!fullscreenElement && isStandalone) {
        announce("Kessel-Krawall läuft bereits bildschirmfüllend.");
        return;
      }

      if (fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          await fullscreenDocument.webkitExitFullscreen?.();
        }
        announce("Vollbild verlassen.");
        return;
      }

      const target = shellRef.current as WebkitFullscreenElement | null;
      if (target?.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target?.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      } else {
        announce(
          "Vollbild ist hier nicht verfügbar. Auf dem iPhone: Teilen → Zum Home-Bildschirm.",
        );
        return;
      }

      const orientation = screen.orientation as LockableScreenOrientation;
      try {
        await orientation.lock?.("portrait");
      } catch {
        // Orientation locking is optional and not supported by every browser.
      }
      announce("Vollbild aktiv. Viel Erfolg im Kesselturnier!");
    } catch {
      announce("Vollbild konnte vom Browser nicht aktiviert werden.");
    }
  }

  const playerHp = battleView?.playerHp ?? 100;
  const playerShield = battleView?.playerShield ?? 0;
  const enemyMaxHp = combat?.enemyMaxHp ?? opponent.baseHp;
  const enemyHp = battleView?.enemyHp ?? enemyMaxHp;
  const enemyShield = battleView?.enemyShield ?? 0;
  const isCombatPhase = game.phase === "battle" || game.phase === "result";
  const activeUid = battleView?.activeUid ?? null;
  const eventSource = findEventSource(
    battleView?.event ?? null,
    game.board,
    opponent.board,
  );
  const remainingBattleSeconds = Math.max(
    0,
    Math.ceil(((combat?.duration ?? 0) - battleClock) / 1000),
  );
  const decisionCountdown =
    game.phase === "battle" &&
    combat?.reason === "timeout" &&
    remainingBattleSeconds <= 5 &&
    !battleEnding;
  const playerHpPercent = combat
    ? Math.round((combat.finalPlayerHp / combat.playerMaxHp) * 100)
    : 100;
  const enemyHpPercent = combat
    ? Math.round((combat.finalEnemyHp / combat.enemyMaxHp) * 100)
    : 100;
  const fullscreenActive = isFullscreen || isStandalone;
  const fullscreenLabel = isStandalone
    ? "App läuft bereits im Vollbild"
    : isFullscreen
      ? "Vollbild verlassen"
      : "Vollbild aktivieren";

  return (
    <main
      className={`game-shell phase-${game.phase} rank-${opponent.rank} ${fullscreenActive ? "is-fullscreen" : ""}`}
      ref={shellRef}
    >
      <header className="game-header">
        <div className="brand-lockup" aria-label="Kessel-Krawall">
          <span className="brand-kicker">MAGISCHER AUTOBATTLER</span>
          <strong>KESSEL <i>•</i> KRAWALL</strong>
          <span
            className="round-pips"
            aria-label={`Kampagnenfortschritt: Runde ${game.round} von ${MAX_ROUNDS}`}
          >
            {Array.from({ length: MAX_ROUNDS }, (_, index) => (
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
              <small>RUNDE</small>
              <b>{game.round}/{MAX_ROUNDS}</b>
            </div>
            <div className="gold-status">
              <small>GOLD</small>
              <b><UiIcon asset="coin" className="hud-icon" /> {game.gold}</b>
            </div>
            <div>
              <small>SIEGEL</small>
              <b aria-label={`${game.seals} Run-Siegel`}>
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

      <section className="arena" aria-label="Kampfarena">
        <BackdropImage backdrop="arena" className="arena-backdrop" />
        {battleView?.event && (
          <BattleVfx
            key={`${battleView.event.time}-${battleView.event.sourceUid}-${battleView.event.kind}`}
            event={battleView.event}
            source={eventSource}
            speed={speed}
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
                {opponent.title}
              </span>
              <h2>{opponent.name}</h2>
              <p>{opponent.threat}</p>
            </div>
            {!isCombatPhase && <blockquote>„{opponent.quote}“</blockquote>}
          </div>
          <HealthBar hp={enemyHp} maxHp={enemyMaxHp} shield={enemyShield} label={opponent.name} />
          <CauldronBoard
            board={opponent.board}
            side="enemy"
            cauldronAsset={
              opponent.rank === "boss" ? "cauldron-boss" : "cauldron-enemy"
            }
            selectedSlot={null}
            activeUid={activeUid}
            hitKind={
              battleView?.event?.target === "enemy"
                ? battleView.event.kind
                : null
            }
            interactive={false}
            compact={!isCombatPhase}
            combatActive={game.phase === "battle"}
            combatSpeed={speed}
          />
        </article>

        <div className={`effect-lane ${battleView?.event ? `event-${battleView.event.kind}` : ""}`}>
          {battleEnding ? (
            <div className={`resolution-banner is-${battleEnding}`} role="status">
              <UiIcon
                asset={battleEnding === "timeout" ? "speed" : "battle"}
                className="resolution-icon"
              />
              <span>{battleEnding === "timeout" ? "ZEITENTSCHEIDUNG" : "K. O."}</span>
              <strong>
                {battleEnding === "timeout"
                  ? `${playerHpPercent}% : ${enemyHpPercent}%`
                  : combat?.winner === "player"
                    ? "DEIN KESSEL SIEGT"
                    : `${opponent.name.toUpperCase()} SIEGT`}
              </strong>
            </div>
          ) : battleView?.event ? (
            <div className="combat-callout" key={`${battleView.event.time}-${battleView.event.sourceUid}`}>
              <UiIcon asset={eventIcon(battleView.event.kind)} className="callout-icon" />
              <strong>{battleView.event.label}</strong>
              <span>{eventAmountLabel(battleView.event)}</span>
            </div>
          ) : decisionCountdown ? (
            <div className="decision-countdown" role="timer">
              <UiIcon asset="speed" className="countdown-icon" />
              <span>ZEITENTSCHEIDUNG IN</span>
              <strong>{remainingBattleSeconds}</strong>
            </div>
          ) : (
            isCombatPhase ? (
              <div className="versus-mark">KRAWALL!</div>
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
            <div>
              <span className="eyebrow">DEIN ZAUBERKESSEL</span>
              <h2>Macht {playerPower}</h2>
            </div>
            <div className="power-compare" aria-label={`Gegnerische Macht ungefähr ${enemyPower}`}>
              <UiIcon asset="power" className="compare-icon" />
              Gegner ≈ {enemyPower}
            </div>
          </div>
          <HealthBar hp={playerHp} maxHp={100} shield={playerShield} label="Dein Kessel" />
          <CauldronBoard
            board={game.board}
            side="player"
            cauldronAsset="cauldron-player"
            selectedSlot={game.selectedSlot}
            activeUid={activeUid}
            hitKind={
              battleView?.event?.target === "player"
                ? battleView.event.kind
                : null
            }
            interactive={game.phase === "shop"}
            onSlot={handleSlot}
            combatActive={game.phase === "battle"}
            combatSpeed={speed}
          />
        </article>
      </section>

      {game.phase === "shop" && (
        <section className="shop-sheet" aria-label="Zutatenladen">
          <BackdropImage backdrop="market" className="panel-backdrop market-backdrop" />
          <div className="sheet-handle" aria-hidden="true" />
          <div className="shop-scroll">
            <div className="shop-topline">
              <div>
                <span className="eyebrow">HEXENMARKT</span>
                <h2>Drei frische Zutaten</h2>
              </div>
              <SynergyStrip board={game.board} />
            </div>

            {selectedDefinition && selectedItem && (
              <div className={`item-inspector ${familyClass(selectedDefinition.family)}`}>
                <span className="inspector-icon" aria-hidden="true">
                  <ArtSprite
                    asset={ITEM_ART[selectedDefinition.id]}
                    className="inspector-item-art"
                  />
                </span>
                <div>
                  <strong>{selectedDefinition.name} {ROMAN_LEVEL[selectedItem.level]}</strong>
                  <p>{selectedDefinition.descriptions[selectedItem.level - 1]}</p>
                </div>
                <button type="button" className="sell-button" onClick={handleSell}>
                  Verkaufen <b>+{getSellValue(selectedItem)}</b>
                </button>
              </div>
            )}

            <div className="offer-grid">
              {game.offers.map((offer) => {
                const definition = ITEM_BY_ID[offer.itemId];
                const disabled =
                  offer.bought ||
                  game.gold < definition.cost ||
                  busy;
                return (
                  <button
                    type="button"
                    key={offer.uid}
                    className={`shop-card ${familyClass(definition.family)} ${offer.bought ? "is-bought" : ""}`}
                    onClick={() => handleBuy(offer.uid)}
                    disabled={disabled}
                    data-testid={`offer-${offer.uid}`}
                  >
                    <span className="offer-family">
                      <UiIcon
                        asset={FAMILY_ICON[definition.family]}
                        className="offer-family-icon"
                      />
                      {FAMILY_META[definition.family].name}
                    </span>
                    <span className="offer-icon" aria-hidden="true">
                      <ArtSprite
                        asset={ITEM_ART[definition.id]}
                        className="offer-item-art"
                      />
                    </span>
                    <strong>{definition.name}</strong>
                    <small>{definition.descriptions[0]}</small>
                    <span className="offer-price">
                      {offer.bought ? (
                        "GEKAUFT"
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
              disabled={busy || (game.rerollsUsed > 0 && game.gold < 1)}
            >
              <UiIcon asset="reroll" className="button-icon" />
              Neu würfeln
              <b>
                {game.rerollsUsed === 0 ? (
                  "GRATIS"
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
              <span><UiIcon asset="battle" className="button-icon" /> KAMPF STARTEN</span>
              <b>{opponent.rank === "boss" ? "BOSS: " : "Gegen "}{opponent.name}</b>
            </button>
          </div>
        </section>
      )}

      {game.phase === "battle" && (
        <section
          className={`battle-controls ${decisionCountdown ? "is-decision-window" : ""}`}
          aria-label="Kampfsteuerung"
        >
          <BackdropImage backdrop="arena" className="panel-backdrop battle-backdrop" />
          <div className="battle-status">
            <UiIcon asset="battle" className="battle-title-icon" />
            <span className="live-dot" aria-hidden="true" />
            <strong>Kampf läuft</strong>
            <small>
              {decisionCountdown
                ? `${remainingBattleSeconds} s bis zur Zeitentscheidung`
                : "Aktionen werden einzeln ausgespielt"}
            </small>
          </div>
          <div className="battle-score-grid">
            <div>
              <span>{opponent.name}</span>
              <strong>{Math.max(0, enemyHp)}</strong>
              <small><UiIcon asset="shield" className="score-icon" /> {enemyShield}</small>
            </div>
            <UiIcon asset="power" className="score-versus-icon" />
            <div>
              <span>Dein Kessel</span>
              <strong>{Math.max(0, playerHp)}</strong>
              <small><UiIcon asset="shield" className="score-icon" /> {playerShield}</small>
            </div>
          </div>
          <div className={`battle-event-panel ${battleView?.event ? `event-${battleView.event.kind}` : ""}`}>
            <UiIcon
              asset={battleView?.event ? eventIcon(battleView.event.kind) : "speed"}
              className="battle-event-icon"
            />
            <span>
              {battleView?.event
                ? `${eventSource ? `Slot ${eventSource.slot + 1} · ` : ""}${battleView.event.label}`
                : decisionCountdown
                  ? `Zeitentscheidung in ${remainingBattleSeconds}`
                  : "Kessel laden ihre Zauber"}
            </span>
            <strong>
              {battleView?.event
                ? eventAmountLabel(battleView.event)
                : "…"}
            </strong>
          </div>
          <div className="battle-speed">
            <span><UiIcon asset="speed" className="speed-icon" /> TEMPO</span>
            <div className="speed-control" aria-label="Kampfgeschwindigkeit">
              {[1, 2, 4].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={speed === value ? "is-active" : ""}
                  onClick={() => setSpeed(value)}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {game.phase === "result" && combat && (
        <section className={`result-sheet ${combat.winner === "player" ? "is-victory" : "is-defeat"}`}>
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
              <span className="eyebrow">{combat.reason === "knockout" ? "K.O." : "ZEITENTSCHEIDUNG"}</span>
              <h2>{combat.winner === "player" ? "Kessel-Sieg!" : "Siegelbruch"}</h2>
              <p>
                {combat.winner === "player"
                  ? game.round >= MAX_ROUNDS
                    ? "Der Titel des Kesselturniers gehört dir."
                    : `+${getRoundReward(game, true)} Gold in der nächsten Runde`
                  : game.round >= MAX_ROUNDS
                    ? `${opponent.name} verteidigt den Turniertitel.`
                    : `${opponent.name} war diesmal stärker. Der Run geht weiter.`}
              </p>
              {combat.reason === "timeout" && (
                <div className="decision-result" aria-label="Relative Lebensenergie bei Zeitablauf">
                  <span>Dein Kessel <b>{playerHpPercent}%</b></span>
                  <i aria-hidden="true">gegen</i>
                  <span>{opponent.name} <b>{enemyHpPercent}%</b></span>
                </div>
              )}
            </div>
          </div>
          <StatsList stats={combat.playerStats} />
          <button type="button" className="continue-button" onClick={handleContinue}>
            {game.round >= MAX_ROUNDS
              ? "TURNIER ABSCHLIESSEN"
              : combat.winner === "player"
                ? "BELOHNUNG NEHMEN"
                : "WEITERKÄMPFEN"}
            <span>
              {game.round >= MAX_ROUNDS
                ? "Ergebnis des Runs ansehen →"
                : `Runde ${game.round + 1} vorbereiten →`}
            </span>
          </button>
        </section>
      )}

      {game.phase === "gameover" && (
        <section className="gameover-sheet">
          <ArtSprite asset="result-defeat" className="gameover-icon" />
          <span className="eyebrow">
            {game.round >= MAX_ROUNDS ? "DER BOSS BLEIBT STEHEN" : "DER KESSEL IST ERKALTET"}
          </span>
          <h2>
            {game.round >= MAX_ROUNDS
              ? "Der Großkessel verteidigt seinen Titel."
              : `Der Run endet in Runde ${game.round}.`}
          </h2>
          <p>
            {game.victories} Siege · Macht {playerPower}. Deine Zutaten warten
            schon auf den nächsten Versuch.
          </p>
          <button type="button" className="continue-button" onClick={handleReset}>
            NEUEN RUN STARTEN
            <span>7 Gold · 3 Siegel · frischer Shop</span>
          </button>
        </section>
      )}

      {game.phase === "victory" && (
        <section className="gameover-sheet victory-sheet">
          <ArtSprite asset="result-victory" className="gameover-icon" />
          <span className="eyebrow">KESSELMEISTER!</span>
          <h2>Du gewinnst den großen Kessel-Wettstreit.</h2>
          <p>
            {game.victories} Siege · {game.seals} Siegel übrig · finale Macht{" "}
            {playerPower}
          </p>
          <button type="button" className="continue-button" onClick={handleReset}>
            NOCH EINEN RUN STARTEN
            <span>Neue Angebote · neue Buildrichtung</span>
          </button>
        </section>
      )}

      {mergeNotice && (
        <div
          className={`merge-overlay ${familyClass(mergeNotice.family)} ${mergeNotice.toLevel === 3 ? "is-max-level" : ""}`}
          role="status"
          aria-live="assertive"
          key={`${mergeNotice.label}-${mergeNotice.step}`}
        >
          <div className="merge-progress">
            <span>MERGE</span>
            {mergeNotice.total > 1 && (
              <b>KASKADE {mergeNotice.step}/{mergeNotice.total}</b>
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
          <span className="merge-kicker">VERSCHMOLZEN</span>
          <strong className="merge-title">{mergeNotice.label}</strong>
          <div className="merge-comparison">
            <span>{mergeNotice.valueLabel}</span>
            <b>{mergeNotice.oldValue}</b>
            <i aria-hidden="true">→</i>
            <strong>{mergeNotice.newValue}</strong>
          </div>
          <div className="merge-comparison is-cooldown">
            <span>Abklingzeit</span>
            <b>{mergeNotice.oldCooldown.toFixed(1).replace(".", ",")} s</b>
            <i aria-hidden="true">→</i>
            <strong>{mergeNotice.newCooldown.toFixed(1).replace(".", ",")} s</strong>
          </div>
          {mergeNotice.bonus && (
            <div className="merge-bonus">{mergeNotice.bonus}</div>
          )}
          {mergeNotice.step === mergeNotice.total && (
            <div className="merge-power">
              <UiIcon asset="power" className="merge-power-icon" />
              <span>MACHT</span>
              <b>{mergeNotice.powerBefore}</b>
              <i aria-hidden="true">→</i>
              <strong>{mergeNotice.powerAfter}</strong>
              <em>+{mergeNotice.powerAfter - mergeNotice.powerBefore}</em>
            </div>
          )}
        </div>
      )}

      <div className="rotate-device" role="status">
        <span aria-hidden="true">↻</span>
        <strong>Bitte ins Hochformat drehen</strong>
        <small>Kessel-Krawall ist für eine Hand im Hochformat gebaut.</small>
      </div>
    </main>
  );
}
