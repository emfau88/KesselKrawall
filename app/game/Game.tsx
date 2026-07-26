"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FAMILY_META, ITEM_BY_ID } from "./data";
import { simulateBattle } from "./simulation";
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
  CombatResult,
  Family,
  GameState,
  ItemCombatStats,
} from "./types";

const ROMAN_LEVEL = ["", "I", "II", "III"] as const;

interface BattleView {
  playerHp: number;
  playerShield: number;
  enemyHp: number;
  enemyShield: number;
  activeUid: string | null;
  event: CombatEvent | null;
}

function familyClass(family: Family): string {
  return `family-${family}`;
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
        <span>{label}</span>
        <strong>{Math.max(0, hp)} / {maxHp}</strong>
        {shield > 0 && <span className="shield-value">◆ {shield}</span>}
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
  selectedSlot,
  activeUid,
  interactive,
  onSlot,
  compact = false,
}: {
  board: Board;
  side: "player" | "enemy";
  selectedSlot: number | null;
  activeUid: string | null;
  interactive: boolean;
  onSlot?: (slot: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={`cauldron-board ${compact ? "is-compact" : ""}`} data-side={side}>
      <div className="cauldron" aria-hidden="true">
        <div className="cauldron-steam steam-one">~</div>
        <div className="cauldron-steam steam-two">~</div>
        <div className="cauldron-rim">
          <span />
        </div>
        <div className="cauldron-body">
          <i className="cauldron-shine" />
        </div>
        <div className="cauldron-feet">
          <i />
          <i />
        </div>
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
                  <span className="item-icon" aria-hidden="true">{definition.icon}</span>
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
            selectedSlot === slot ? "is-selected" : "",
            activeUid === instance?.uid ? "is-active" : "",
            definition ? familyClass(definition.family) : "",
          ].join(" ");

          return interactive ? (
            <button
              key={slot}
              type="button"
              className={className}
              data-slot={slot}
              onClick={() => onSlot?.(slot)}
              aria-label={slotLabel}
              aria-pressed={selectedSlot === slot}
            >
              {content}
            </button>
          ) : (
            <div
              key={slot}
              className={className}
              data-slot={slot}
              aria-label={slotLabel}
            >
              {content}
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
            <span aria-hidden="true">{meta.icon}</span>
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
            <span className="stat-icon" aria-hidden="true">{definition.icon}</span>
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

export default function Game() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [feedback, setFeedback] = useState("Bereite deinen Kessel vor.");
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [combat, setCombat] = useState<CombatResult | null>(null);
  const [battleView, setBattleView] = useState<BattleView | null>(null);
  const [speed, setSpeed] = useState(2);
  const speedRef = useRef(speed);

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
    let simulatedTime = 0;
    let lastRealTime = performance.now();
    let finished = false;

    const timer = window.setInterval(() => {
      const now = performance.now();
      simulatedTime += (now - lastRealTime) * speedRef.current;
      lastRealTime = now;

      let latest: CombatEvent | null = null;
      while (
        eventIndex < combat.events.length &&
        combat.events[eventIndex].time <= simulatedTime
      ) {
        latest = combat.events[eventIndex];
        eventIndex += 1;
      }
      if (latest) {
        setBattleView({
          playerHp: latest.playerHp,
          playerShield: latest.playerShield,
          enemyHp: latest.enemyHp,
          enemyShield: latest.enemyShield,
          activeUid: latest.sourceUid,
          event: latest,
        });
      }

      if (!finished && simulatedTime >= combat.duration + 450) {
        finished = true;
        window.clearInterval(timer);
        setBattleView({
          playerHp: combat.finalPlayerHp,
          playerShield: combat.finalPlayerShield,
          enemyHp: combat.finalEnemyHp,
          enemyShield: combat.finalEnemyShield,
          activeUid: null,
          event: null,
        });
        setGame((current) => showBattleResult(current));
        setFeedback(
          combat.winner === "player"
            ? "Dein Kessel gewinnt den Schlagabtausch!"
            : `${opponent.name} behält die Oberhand.`,
        );
      }
    }, 40);

    return () => window.clearInterval(timer);
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
      const merge = result.merges[result.merges.length - 1];
      const definition = ITEM_BY_ID[merge.itemId];
      setMergeNotice(`${definition.name} ${ROMAN_LEVEL[merge.toLevel]}`);
      announce(
        `${definition.name} ist zu Level ${ROMAN_LEVEL[merge.toLevel]} verschmolzen.`,
      );
      setBusy(true);
      window.setTimeout(() => {
        setMergeNotice(null);
        setBusy(false);
      }, 850);
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
    setBattleView({
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
    setMergeNotice(null);
    announce("Ein neuer Kessel betritt den Wettstreit.");
  }

  const playerHp = battleView?.playerHp ?? 100;
  const playerShield = battleView?.playerShield ?? 0;
  const enemyMaxHp = combat?.enemyMaxHp ?? opponent.baseHp;
  const enemyHp = battleView?.enemyHp ?? enemyMaxHp;
  const enemyShield = battleView?.enemyShield ?? 0;
  const isCombatPhase = game.phase === "battle" || game.phase === "result";
  const activeUid = battleView?.activeUid ?? null;

  return (
    <main className={`game-shell phase-${game.phase} rank-${opponent.rank}`}>
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
        <div className="run-status">
          <div>
            <small>RUNDE</small>
            <b>{game.round}/{MAX_ROUNDS}</b>
          </div>
          <div className="gold-status">
            <small>GOLD</small>
            <b><span aria-hidden="true">●</span> {game.gold}</b>
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
                  ◆
                </span>
              ))}
            </b>
          </div>
        </div>
      </header>

      <section className="arena" aria-label="Kampfarena">
        <article className="combatant enemy-combatant">
          <div className="opponent-copy">
            <span className="opponent-emblem" aria-hidden="true">{opponent.icon}</span>
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
            selectedSlot={null}
            activeUid={activeUid}
            interactive={false}
            compact={!isCombatPhase}
          />
        </article>

        <div className={`effect-lane ${battleView?.event ? `event-${battleView.event.kind}` : ""}`}>
          {battleView?.event ? (
            <div className="combat-callout" key={`${battleView.event.time}-${battleView.event.sourceUid}`}>
              <strong>{battleView.event.label}</strong>
              <span>
                {battleView.event.kind === "heal"
                  ? "+"
                  : battleView.event.kind === "shield"
                    ? "◆ "
                    : battleView.event.kind === "boss"
                      ? "▲ "
                      : "−"}
                {battleView.event.amount}
              </span>
            </div>
          ) : (
            <div className="versus-mark">{isCombatPhase ? "KRAWALL!" : "VS"}</div>
          )}
        </div>

        <article className="combatant player-combatant">
          <div className="player-heading">
            <div>
              <span className="eyebrow">DEIN ZAUBERKESSEL</span>
              <h2>Macht {playerPower}</h2>
            </div>
            <div className="power-compare" aria-label={`Gegnerische Macht ungefähr ${enemyPower}`}>
              Gegner ≈ {enemyPower}
            </div>
          </div>
          <HealthBar hp={playerHp} maxHp={100} shield={playerShield} label="Dein Kessel" />
          <CauldronBoard
            board={game.board}
            side="player"
            selectedSlot={game.selectedSlot}
            activeUid={activeUid}
            interactive={game.phase === "shop"}
            onSlot={handleSlot}
          />
        </article>
      </section>

      {game.phase === "shop" && (
        <section className="shop-sheet" aria-label="Zutatenladen">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="shop-topline">
            <div>
              <span className="eyebrow">HEXENMARKT</span>
              <h2>Drei frische Zutaten</h2>
            </div>
            <SynergyStrip board={game.board} />
          </div>

          {selectedDefinition && selectedItem && (
            <div className={`item-inspector ${familyClass(selectedDefinition.family)}`}>
              <span className="inspector-icon" aria-hidden="true">{selectedDefinition.icon}</span>
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
                    {FAMILY_META[definition.family].icon} {FAMILY_META[definition.family].name}
                  </span>
                  <span className="offer-icon" aria-hidden="true">{definition.icon}</span>
                  <strong>{definition.name}</strong>
                  <small>{definition.descriptions[0]}</small>
                  <span className="offer-price">
                    {offer.bought ? "GEKAUFT" : `● ${definition.cost}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="shop-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleReroll}
              disabled={busy || (game.rerollsUsed > 0 && game.gold < 1)}
            >
              <span aria-hidden="true">↻</span>
              Neu würfeln
              <b>{game.rerollsUsed === 0 ? "GRATIS" : "● 1"}</b>
            </button>
            <button
              type="button"
              className="fight-button"
              onClick={handleFight}
              disabled={busy || !game.board.some(Boolean)}
            >
              <span>KAMPF STARTEN</span>
              <b>{opponent.rank === "boss" ? "BOSS: " : "Gegen "}{opponent.name}</b>
            </button>
          </div>
        </section>
      )}

      {game.phase === "battle" && (
        <section className="battle-controls" aria-label="Kampfsteuerung">
          <div>
            <span className="live-dot" aria-hidden="true" />
            <strong>Kampf läuft</strong>
            <small>{Math.ceil((combat?.duration ?? 0) / 1000)} s Simulation</small>
          </div>
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
        </section>
      )}

      {game.phase === "result" && combat && (
        <section className={`result-sheet ${combat.winner === "player" ? "is-victory" : "is-defeat"}`}>
          <div className="result-heading">
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
          <span className="gameover-icon" aria-hidden="true">◇</span>
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
          <span className="gameover-icon" aria-hidden="true">♛</span>
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
        <div className="merge-overlay" role="status">
          <div className="merge-burst" aria-hidden="true" />
          <span>VERSCHMOLZEN</span>
          <strong>{mergeNotice}</strong>
          <small>Neue Stufe · stärkere Wirkung</small>
        </div>
      )}

      <div className="feedback-toast" aria-live="polite">
        <span aria-hidden="true">✦</span>
        {feedback}
      </div>
    </main>
  );
}
