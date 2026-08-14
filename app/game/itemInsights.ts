import { FAMILY_META, ITEM_BY_ID } from "./data";
import { getItemCooldownMs } from "./simulation";
import { getFamilyWeights } from "./state";
import type {
  Board,
  ItemDefinition,
  ItemInstance,
  PassiveDefinition,
} from "./types";

export interface ItemInsightSection {
  headline: string;
  detail: string;
  slots: number[];
  active: boolean;
}

export interface ItemInsights {
  cadence: ItemInsightSection;
  affects: ItemInsightSection;
  benefits: ItemInsightSection;
  synergy: ItemInsightSection;
}

function formatSeconds(seconds: number): string {
  return seconds.toFixed(1).replace(".", ",");
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

function joinLabels(labels: readonly string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} und ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} und ${labels.at(-1)}`;
}

function itemNames(board: Board, slots: readonly number[]): string {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    const instance = board[slot];
    if (!instance) continue;
    const name = ITEM_BY_ID[instance.itemId].name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return joinLabels(
    [...counts.entries()].map(([name, count]) =>
      count > 1 ? `${count}× ${name}` : name,
    ),
  );
}

function passiveAffectsTarget(
  passive: PassiveDefinition,
  sourceSlot: number,
  targetSlot: number,
  targetDefinition: ItemDefinition,
): boolean {
  if (passive.family && passive.family !== targetDefinition.family) return false;
  if (
    passive.type !== "powerAdjacent" &&
    targetDefinition.trigger?.type === "emergency"
  ) {
    return false;
  }
  if (
    passive.type === "powerAdjacent" &&
    targetDefinition.effect === "poison"
  ) {
    return false;
  }
  if (passive.type === "hasteFamily") return true;
  return Math.abs(sourceSlot - targetSlot) === 1;
}

function passiveTargetSlots(
  board: Board,
  sourceSlot: number,
  sourceDefinition: ItemDefinition,
): number[] {
  const passive = sourceDefinition.passive;
  if (!passive) return [];
  const slots: number[] = [];
  board.forEach((target, targetSlot) => {
    if (!target) return;
    if (
      passiveAffectsTarget(
        passive,
        sourceSlot,
        targetSlot,
        ITEM_BY_ID[target.itemId],
      )
    ) {
      slots.push(targetSlot);
    }
  });
  return slots;
}

function influenceSourceSlots(
  board: Board,
  targetSlot: number,
  targetDefinition: ItemDefinition,
): { speed: number[]; power: number[] } {
  const speed: number[] = [];
  const power: number[] = [];
  board.forEach((source, sourceSlot) => {
    if (!source) return;
    const passive = ITEM_BY_ID[source.itemId].passive;
    if (
      !passive ||
      !passiveAffectsTarget(
        passive,
        sourceSlot,
        targetSlot,
        targetDefinition,
      )
    ) {
      return;
    }
    if (passive.type === "powerAdjacent") power.push(sourceSlot);
    else speed.push(sourceSlot);
  });
  return { speed, power };
}

function cadenceInsight(
  board: Board,
  item: ItemInstance,
  definition: ItemDefinition,
  slot: number | null,
): ItemInsightSection {
  if (slot === null) {
    return {
      headline: "Pausiert in der Ablage",
      detail: "Wirkt erst wieder im Kessel.",
      slots: [],
      active: false,
    };
  }

  const baseSeconds = definition.cooldown[item.level - 1];
  const effectiveSeconds = getItemCooldownMs(board, slot) / 1000;
  const isFaster = effectiveSeconds < baseSeconds - 0.01;

  if (definition.trigger?.type === "emergency") {
    return {
      headline: `Einmal unter ${Math.round(definition.trigger.threshold * 100)} % LP`,
      detail: "Löst automatisch aus.",
      slots: [],
      active: true,
    };
  }
  if (definition.trigger?.type === "onGuardedHit") {
    return {
      headline: "Reagiert auf Treffer",
      detail: `${formatSeconds(effectiveSeconds)} s Pause danach.`,
      slots: [],
      active: isFaster,
    };
  }
  return {
    headline: `Alle ${formatSeconds(effectiveSeconds)} s`,
    detail: isFaster
      ? `Ohne Tempo-Buffs: ${formatSeconds(baseSeconds)} s.`
      : "Aktueller Kampftakt.",
    slots: [],
    active: isFaster,
  };
}

function affectsInsight(
  board: Board,
  item: ItemInstance,
  definition: ItemDefinition,
  slot: number | null,
): ItemInsightSection {
  const passive = definition.passive;
  if (!passive || slot === null) {
    return {
      headline: slot === null ? "Im Kessel inaktiv" : "Wirkt für sich",
      detail:
        slot === null
          ? "Ablage-Items buffen niemanden."
          : "Bufft keine anderen Zutaten.",
      slots: [],
      active: false,
    };
  }

  const value = passive.values[item.level - 1];
  const targets = passiveTargetSlots(board, slot, definition);
  const visibleTargets = targets.filter((targetSlot) => targetSlot !== slot);
  const names = itemNames(board, visibleTargets);

  if (passive.type === "hasteFamily") {
    const familyName = passive.family
      ? FAMILY_META[passive.family].name
      : "passenden";
    return {
      headline: `${formatPercent(value)} schneller`,
      detail: `Alle ${familyName}-Zutaten – auch dieses Item.`,
      slots: visibleTargets,
      active: true,
    };
  }
  if (passive.type === "hasteAdjacent") {
    return {
      headline: `${formatPercent(value)} schneller`,
      detail: names || "Passende direkte Nachbarn.",
      slots: visibleTargets,
      active: true,
    };
  }
  return {
    headline: `${formatPercent(value)} stärker`,
    detail: names || "Passende direkte Nachbarn.",
    slots: visibleTargets,
    active: true,
  };
}

function benefitsInsight(
  board: Board,
  definition: ItemDefinition,
  slot: number | null,
): ItemInsightSection {
  if (slot === null) {
    return {
      headline: "Keine Buffs aktiv",
      detail: "Die Ablage pausiert alle Einflüsse.",
      slots: [],
      active: false,
    };
  }

  const sources = influenceSourceSlots(board, slot, definition);
  const externalSpeed = sources.speed.filter((sourceSlot) => sourceSlot !== slot);
  const externalPower = sources.power.filter((sourceSlot) => sourceSlot !== slot);
  const hasSelfSpeed = sources.speed.includes(slot);
  const details: string[] = [];
  if (externalSpeed.length > 0 || hasSelfSpeed) {
    const names = itemNames(board, externalSpeed);
    details.push(
      names && hasSelfSpeed
        ? `Tempo durch eigene Aura und ${names}.`
        : names
          ? `Tempo durch ${names}.`
          : "Tempo durch die eigene Aura.",
    );
  }
  if (externalPower.length > 0) {
    details.push(`Wirkung durch ${itemNames(board, externalPower)}.`);
  }

  const slots = [...new Set([...externalSpeed, ...externalPower])];
  return {
    headline:
      sources.speed.length > 0 && sources.power.length > 0
        ? "Schneller und stärker"
        : sources.speed.length > 0
          ? "Bereits beschleunigt"
          : sources.power.length > 0
            ? "Wirkung verstärkt"
            : "Kein Platzierungs-Buff",
    detail: details.join(" ") || "Aktuell wirkt kein anderes Item darauf.",
    slots,
    active: sources.speed.length > 0 || sources.power.length > 0,
  };
}

function synergyInsight(
  board: Board,
  item: ItemInstance,
  definition: ItemDefinition,
  slot: number | null,
): ItemInsightSection {
  if (slot === null) {
    return {
      headline: "Ablage",
      detail: "Zählt nicht für die Synergie.",
      slots: [],
      active: false,
    };
  }
  const total = getFamilyWeights(board)[definition.family];
  const contribution = 2 ** (item.level - 1);
  const active = total >= 3;
  return {
    headline: active
      ? `${FAMILY_META[definition.family].name} aktiv`
      : `${FAMILY_META[definition.family].name} ${total}/3`,
    detail: active
      ? FAMILY_META[definition.family].shortBonus
      : `Dieses Item zählt ${contribution}. Noch ${Math.max(0, 3 - total)} bis zum Bonus.`,
    slots: [],
    active,
  };
}

export function getItemInsights(
  board: Board,
  item: ItemInstance,
  slot: number | null,
): ItemInsights {
  const definition = ITEM_BY_ID[item.itemId];
  return {
    cadence: cadenceInsight(board, item, definition, slot),
    affects: affectsInsight(board, item, definition, slot),
    benefits: benefitsInsight(board, definition, slot),
    synergy: synergyInsight(board, item, definition, slot),
  };
}
