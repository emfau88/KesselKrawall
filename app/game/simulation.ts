import { FAMILY_META, ITEM_BY_ID } from "./data";
import { getFamilyWeights, isSynergyActive } from "./state";
import type {
  Board,
  CombatEvent,
  CombatEventKind,
  CombatResult,
  ItemCombatStats,
  ItemDefinition,
  ItemInstance,
  OpponentDefinition,
  Side,
} from "./types";

const PLAYER_MAX_HP = 100;
const COMBAT_LIMIT_MS = 25_000;
const STEP_MS = 100;

interface RuntimeItem {
  instance: ItemInstance;
  slot: number;
  nextAt: number;
  cooldown: number;
}

interface Combatant {
  side: Side;
  hp: number;
  maxHp: number;
  shield: number;
  board: Board;
  poison: Map<string, number>;
  burn: Map<string, number>;
  stats: Map<string, ItemCombatStats>;
  runtimes: RuntimeItem[];
  powerMultiplier: number;
}

interface World {
  time: number;
  player: Combatant;
  enemy: Combatant;
  events: CombatEvent[];
  bossRuleTriggered: boolean;
  bossRule: OpponentDefinition["bossRule"];
}

function roundAmount(value: number): number {
  return Math.max(0, Math.round(value));
}

function totalStatus(status: Map<string, number>): number {
  let total = 0;
  for (const amount of status.values()) total += amount;
  return total;
}

function opponentOf(world: World, side: Side): Combatant {
  return side === "player" ? world.enemy : world.player;
}

function statFor(combatant: Combatant, uid: string): ItemCombatStats {
  const existing = combatant.stats.get(uid);
  if (existing) return existing;
  const instance = combatant.board.find((item) => item?.uid === uid);
  const created: ItemCombatStats = {
    uid,
    itemId: instance?.itemId ?? "status",
    level: instance?.level ?? 1,
    triggers: 0,
    damage: 0,
    healing: 0,
    shield: 0,
    poisonApplied: 0,
  };
  combatant.stats.set(uid, created);
  return created;
}

function pushEvent(
  world: World,
  kind: CombatEventKind,
  actor: Side,
  target: Side,
  sourceUid: string,
  label: string,
  amount: number,
): void {
  world.events.push({
    time: world.time,
    kind,
    actor,
    target,
    sourceUid,
    label,
    amount,
    playerHp: roundAmount(world.player.hp),
    playerShield: roundAmount(world.player.shield),
    enemyHp: roundAmount(world.enemy.hp),
    enemyShield: roundAmount(world.enemy.shield),
  });
}

function applyDamage(
  world: World,
  actor: Combatant,
  target: Combatant,
  sourceUid: string,
  rawAmount: number,
  label: string,
  kind: "damage" | "poison" | "burn" = "damage",
): number {
  const amount = roundAmount(rawAmount);
  if (amount <= 0) return 0;
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  const hpDamage = Math.min(target.hp, amount - absorbed);
  target.hp -= hpDamage;
  const applied = absorbed + hpDamage;
  statFor(actor, sourceUid).damage += applied;
  pushEvent(world, kind, actor.side, target.side, sourceUid, label, applied);
  return applied;
}

function applyShield(
  world: World,
  actor: Combatant,
  sourceUid: string,
  rawAmount: number,
  label: string,
): number {
  const amount = roundAmount(rawAmount);
  actor.shield += amount;
  statFor(actor, sourceUid).shield += amount;
  pushEvent(world, "shield", actor.side, actor.side, sourceUid, label, amount);
  return amount;
}

function applyHeal(
  world: World,
  actor: Combatant,
  sourceUid: string,
  rawAmount: number,
  label: string,
  overhealToShield: boolean,
): void {
  const amount = roundAmount(rawAmount);
  const missing = actor.maxHp - actor.hp;
  const healed = Math.min(missing, amount);
  const overheal = amount - healed;
  actor.hp += healed;
  statFor(actor, sourceUid).healing += healed;
  if (healed > 0) {
    pushEvent(world, "heal", actor.side, actor.side, sourceUid, label, healed);
  }
  if (overhealToShield && overheal > 0) {
    applyShield(world, actor, sourceUid, overheal, "Überheilung");
  }
}

function familyPowerMultiplier(
  combatant: Combatant,
  slot: number,
  definition: ItemDefinition,
): number {
  let multiplier = 1;
  for (const neighborSlot of [slot - 1, slot + 1]) {
    const neighbor = combatant.board[neighborSlot];
    if (!neighbor) continue;
    const neighborDefinition = ITEM_BY_ID[neighbor.itemId];
    if (
      neighborDefinition.passive?.type === "powerAdjacent" &&
      (!neighborDefinition.passive.family ||
        neighborDefinition.passive.family === definition.family)
    ) {
      multiplier *=
        1 + neighborDefinition.passive.values[neighbor.level - 1];
    }
  }
  return multiplier;
}

function cooldownMultiplier(
  board: Board,
  slot: number,
  definition: ItemDefinition,
): number {
  let multiplier = 1;
  for (let sourceSlot = 0; sourceSlot < board.length; sourceSlot += 1) {
    const source = board[sourceSlot];
    if (!source) continue;
    const sourceDefinition = ITEM_BY_ID[source.itemId];
    const passive = sourceDefinition.passive;
    if (!passive) continue;
    if (
      passive.type === "hasteAdjacent" &&
      Math.abs(sourceSlot - slot) === 1 &&
      (!passive.family || passive.family === definition.family)
    ) {
      multiplier *= 1 - passive.values[source.level - 1];
    }
    if (
      passive.type === "hasteFamily" &&
      (!passive.family || passive.family === definition.family)
    ) {
      multiplier *= 1 - passive.values[source.level - 1];
    }
  }
  if (definition.family === "poison" && isSynergyActive(board, "poison")) {
    multiplier *= 0.95;
  }
  return Math.max(0.45, multiplier);
}

export function getItemCooldownMs(board: Board, slot: number): number {
  const instance = board[slot];
  if (!instance) return 0;
  const definition = ITEM_BY_ID[instance.itemId];
  return (
    definition.cooldown[instance.level - 1] *
    cooldownMultiplier(board, slot, definition) *
    1000
  );
}

function createCombatant(
  side: Side,
  board: Board,
  maxHp: number,
): Combatant {
  const stats = new Map<string, ItemCombatStats>();
  const runtimes: RuntimeItem[] = [];
  board.forEach((instance, slot) => {
    if (!instance) return;
    stats.set(instance.uid, {
      uid: instance.uid,
      itemId: instance.itemId,
      level: instance.level,
      triggers: 0,
      damage: 0,
      healing: 0,
      shield: 0,
      poisonApplied: 0,
    });
    const cooldown = getItemCooldownMs(board, slot);
    runtimes.push({
      instance,
      slot,
      cooldown,
      nextAt: Math.round(cooldown / STEP_MS) * STEP_MS,
    });
  });
  return {
    side,
    hp: maxHp,
    maxHp,
    shield: 0,
    board,
    poison: new Map(),
    burn: new Map(),
    stats,
    runtimes,
    powerMultiplier: 1,
  };
}

function directDamageMultiplier(combatant: Combatant): number {
  return isSynergyActive(combatant.board, "fire") ? 1.22 : 1;
}

function guardMultiplier(combatant: Combatant): number {
  return isSynergyActive(combatant.board, "guard") ? 1.15 : 1;
}

function clearPoison(world: World, actor: Combatant, sourceUid: string): void {
  const cleared = totalStatus(actor.poison);
  if (cleared <= 0) return;
  actor.poison.clear();
  pushEvent(
    world,
    "cleanse",
    actor.side,
    actor.side,
    sourceUid,
    "Gift entfernt",
    cleared,
  );
}

function addPoison(
  world: World,
  actor: Combatant,
  target: Combatant,
  sourceUid: string,
  rawStacks: number,
  label: string,
): void {
  const synergyBonus = isSynergyActive(actor.board, "poison") ? 1 : 0;
  const stacks = roundAmount(rawStacks + synergyBonus);
  target.poison.set(sourceUid, (target.poison.get(sourceUid) ?? 0) + stacks);
  statFor(actor, sourceUid).poisonApplied += stacks;
  pushEvent(
    world,
    "poison",
    actor.side,
    target.side,
    sourceUid,
    label,
    stacks,
  );
}

function addBurn(
  world: World,
  actor: Combatant,
  target: Combatant,
  sourceUid: string,
  stacks: number,
): void {
  target.burn.set(sourceUid, (target.burn.get(sourceUid) ?? 0) + stacks);
  pushEvent(
    world,
    "burn",
    actor.side,
    target.side,
    sourceUid,
    "Brand",
    stacks,
  );
}

function activateItem(
  world: World,
  actor: Combatant,
  target: Combatant,
  runtime: RuntimeItem,
): void {
  const { instance, slot } = runtime;
  const definition = ITEM_BY_ID[instance.itemId];
  const index = instance.level - 1;
  const stats = statFor(actor, instance.uid);
  stats.triggers += 1;
  const placementPower = familyPowerMultiplier(actor, slot, definition);
  const directMultiplier = directDamageMultiplier(actor) * placementPower;
  const defensiveMultiplier = guardMultiplier(actor) * placementPower;
  let primary = definition.values[index] * actor.powerMultiplier;
  const secondary =
    (definition.secondaryValues?.[index] ?? 0) * actor.powerMultiplier;

  if (definition.scalesWithFamily) {
    const weight = getFamilyWeights(actor.board)[definition.scalesWithFamily];
    primary *= 1 + Math.max(0, weight - 1) * 0.12;
  }

  switch (definition.effect) {
    case "damage":
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        primary * directMultiplier,
        definition.name,
      );
      break;
    case "poison":
      addPoison(
        world,
        actor,
        target,
        instance.uid,
        primary,
        definition.name,
      );
      break;
    case "shield":
      applyShield(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
        definition.name,
      );
      break;
    case "heal":
      applyHeal(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
        definition.name,
        definition.levelThreeBonus === "overhealShield" && instance.level === 3,
      );
      break;
    case "hybrid":
      applyHeal(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
        definition.name,
        false,
      );
      applyShield(
        world,
        actor,
        instance.uid,
        secondary * defensiveMultiplier,
        definition.name,
      );
      break;
    case "conditionalDamage": {
      const poisoned = totalStatus(target.poison) > 0;
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        (primary + (poisoned ? secondary : 0)) * directMultiplier,
        poisoned ? `${definition.name} · vergiftet!` : definition.name,
      );
      break;
    }
    case "poisonDamage":
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        primary * directMultiplier,
        definition.name,
      );
      addPoison(
        world,
        actor,
        target,
        instance.uid,
        secondary,
        definition.name,
      );
      break;
    case "shieldDamage":
      applyShield(
        world,
        actor,
        instance.uid,
        primary * defensiveMultiplier,
        definition.name,
      );
      applyDamage(
        world,
        actor,
        target,
        instance.uid,
        secondary * directMultiplier,
        definition.name,
      );
      break;
  }

  if (definition.levelThreeBonus === "burn" && instance.level === 3) {
    addBurn(world, actor, target, instance.uid, 3);
  }
  if (definition.levelThreeBonus === "cleansePoison" && instance.level === 3) {
    clearPoison(world, actor, instance.uid);
  }
}

function tickStatus(
  world: World,
  afflicted: Combatant,
  status: Map<string, number>,
  kind: "poison" | "burn",
): void {
  const attacker = opponentOf(world, afflicted.side);
  for (const [sourceUid, stacks] of [...status.entries()]) {
    if (stacks <= 0) {
      status.delete(sourceUid);
      continue;
    }
    applyDamage(
      world,
      attacker,
      afflicted,
      sourceUid,
      stacks,
      kind === "poison" ? "Gift tickt" : "Brand tickt",
      kind,
    );
    const remaining = stacks - 1;
    if (remaining <= 0) status.delete(sourceUid);
    else status.set(sourceUid, remaining);
  }
}

function addStartingSynergyShield(world: World, combatant: Combatant): void {
  if (!isSynergyActive(combatant.board, "guard")) return;
  combatant.shield += 12;
  pushEvent(
    world,
    "synergy",
    combatant.side,
    combatant.side,
    `${combatant.side}-guard-synergy`,
    `${FAMILY_META.guard.name}-Synergie`,
    12,
  );
}

function finalWinner(world: World): Side {
  if (world.player.hp <= 0 && world.enemy.hp > 0) return "enemy";
  if (world.enemy.hp <= 0 && world.player.hp > 0) return "player";
  if (world.player.hp <= 0 && world.enemy.hp <= 0) return "enemy";
  const playerRatio = world.player.hp / world.player.maxHp;
  const enemyRatio = world.enemy.hp / world.enemy.maxHp;
  if (playerRatio > enemyRatio) return "player";
  if (enemyRatio > playerRatio) return "enemy";
  if (world.player.shield > world.enemy.shield) return "player";
  return "enemy";
}

export function simulateBattle(
  playerBoard: Board,
  opponent: OpponentDefinition,
): CombatResult {
  const enemyMaxHp = opponent.baseHp;
  const world: World = {
    time: 0,
    player: createCombatant("player", playerBoard, PLAYER_MAX_HP),
    enemy: createCombatant("enemy", opponent.board, enemyMaxHp),
    events: [],
    bossRuleTriggered: false,
    bossRule: opponent.bossRule,
  };
  addStartingSynergyShield(world, world.player);
  addStartingSynergyShield(world, world.enemy);

  let reason: "knockout" | "timeout" = "timeout";
  for (let time = STEP_MS; time <= COMBAT_LIMIT_MS; time += STEP_MS) {
    world.time = time;
    const playerAliveAtStart = world.player.hp > 0;
    const enemyAliveAtStart = world.enemy.hp > 0;

    if (time % 1000 === 0) {
      if (playerAliveAtStart) tickStatus(world, world.player, world.player.burn, "burn");
      if (enemyAliveAtStart) tickStatus(world, world.enemy, world.enemy.burn, "burn");
    }
    if (time % 2000 === 0) {
      if (playerAliveAtStart) {
        tickStatus(world, world.player, world.player.poison, "poison");
      }
      if (enemyAliveAtStart) {
        tickStatus(world, world.enemy, world.enemy.poison, "poison");
      }
    }

    if (
      world.bossRule === "rageAtHalf" &&
      !world.bossRuleTriggered &&
      world.enemy.hp > 0 &&
      world.enemy.hp <= world.enemy.maxHp / 2
    ) {
      world.bossRuleTriggered = true;
      world.enemy.powerMultiplier = 1.25;
      pushEvent(
        world,
        "boss",
        "enemy",
        "enemy",
        "boss-kesselzorn",
        "Kesselzorn entfacht",
        25,
      );
    }

    const actions: Array<{ actor: Combatant; target: Combatant; item: RuntimeItem }> = [];
    if (playerAliveAtStart) {
      for (const item of world.player.runtimes) {
        if (item.nextAt <= time) {
          actions.push({ actor: world.player, target: world.enemy, item });
          item.nextAt += Math.round(item.cooldown / STEP_MS) * STEP_MS;
        }
      }
    }
    if (enemyAliveAtStart) {
      for (const item of world.enemy.runtimes) {
        if (item.nextAt <= time) {
          actions.push({ actor: world.enemy, target: world.player, item });
          item.nextAt += Math.round(item.cooldown / STEP_MS) * STEP_MS;
        }
      }
    }
    for (const action of actions) {
      activateItem(world, action.actor, action.target, action.item);
    }

    if (world.player.hp <= 0 || world.enemy.hp <= 0) {
      reason = "knockout";
      break;
    }
  }

  return {
    winner: finalWinner(world),
    reason,
    duration: world.time,
    events: world.events,
    playerStats: [...world.player.stats.values()],
    enemyStats: [...world.enemy.stats.values()],
    finalPlayerHp: roundAmount(world.player.hp),
    finalPlayerShield: roundAmount(world.player.shield),
    finalEnemyHp: roundAmount(world.enemy.hp),
    finalEnemyShield: roundAmount(world.enemy.shield),
    playerMaxHp: world.player.maxHp,
    enemyMaxHp: world.enemy.maxHp,
  };
}
