export type Family = "fire" | "poison" | "guard";
export type ItemLevel = 1 | 2 | 3;
export type GamePhase =
  | "shop"
  | "battle"
  | "result"
  | "victory"
  | "gameover";
export type Side = "player" | "enemy";
export type BattleOutcome = Side | "draw";
export type OpponentRank = "regular" | "elite" | "boss";
export type BossRule = "rageAtHalf";

export type EffectType =
  | "damage"
  | "poison"
  | "shield"
  | "heal"
  | "hybrid"
  | "conditionalDamage"
  | "poisonDamage"
  | "shieldDamage";

export type PassiveType =
  | "hasteAdjacent"
  | "hasteFamily"
  | "powerAdjacent";

export interface PassiveDefinition {
  type: PassiveType;
  values: readonly [number, number, number];
  family?: Family;
}

export interface ItemDefinition {
  id: string;
  name: string;
  family: Family;
  icon: string;
  cost: number;
  cooldown: readonly [number, number, number];
  values: readonly [number, number, number];
  secondaryValues?: readonly [number, number, number];
  effect: EffectType;
  descriptions: readonly [string, string, string];
  passive?: PassiveDefinition;
  levelThreeBonus?: "burn" | "cleansePoison" | "overhealShield";
  scalesWithFamily?: Family;
  trigger?:
    | { type: "ramp"; growthPerActivation: number }
    | { type: "onHpDamage" }
    | { type: "emergency"; threshold: number; multiplier: number };
}

export interface ItemInstance {
  uid: string;
  itemId: string;
  level: ItemLevel;
}

export type Board = Array<ItemInstance | null>;

export interface ShopOffer {
  uid: string;
  itemId: string;
  bought: boolean;
}

export interface OpponentDefinition {
  id: string;
  name: string;
  title: string;
  icon: string;
  quote: string;
  threat: string;
  rank: OpponentRank;
  baseHp: number;
  board: Board;
  boardVariants?: readonly Board[];
  rewardBonus?: number;
  bossRule?: BossRule;
}

export interface MergeStep {
  itemId: string;
  fromLevel: ItemLevel;
  toLevel: ItemLevel;
  target: ItemLocation;
  consumed: ItemLocation | null;
}

export type ItemLocation =
  | { area: "board"; slot: number }
  | { area: "reserve" };

export interface GameState {
  version: 4;
  phase: GamePhase;
  round: number;
  gold: number;
  seals: number;
  victories: number;
  board: Board;
  reserve: ItemInstance | null;
  offers: ShopOffer[];
  rerollsUsed: number;
  selectedSlot: number | null;
  rngState: number;
  idCounter: number;
  opponentVariant: number;
  pendingBattle: CombatResult | null;
}

export interface ItemCombatStats {
  uid: string;
  itemId: string;
  level: ItemLevel;
  triggers: number;
  hpDamage: number;
  shieldDamage: number;
  totalDamage: number;
  healing: number;
  shield: number;
  poisonApplied: number;
}

export type CombatEventKind =
  | "damage"
  | "poison"
  | "burn"
  | "heal"
  | "shield"
  | "cleanse"
  | "synergy"
  | "boss";

export interface CombatEvent {
  time: number;
  kind: CombatEventKind;
  actor: Side;
  target: Side;
  sourceUid: string;
  label: string;
  amount: number;
  playerHp: number;
  playerShield: number;
  enemyHp: number;
  enemyShield: number;
}

export interface CombatResult {
  winner: BattleOutcome;
  reason: "knockout" | "timeout";
  duration: number;
  events: CombatEvent[];
  playerStats: ItemCombatStats[];
  enemyStats: ItemCombatStats[];
  finalPlayerHp: number;
  finalPlayerShield: number;
  finalEnemyHp: number;
  finalEnemyShield: number;
  playerMaxHp: number;
  enemyMaxHp: number;
}
