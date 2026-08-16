import { FAMILY_META, ITEM_BY_ID } from "./data";
import { familyText, itemName, type Language } from "./i18n";
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

function copy(language: Language, german: string, english: string): string {
  return language === "en" ? english : german;
}

function formatSeconds(seconds: number, language: Language): string {
  return seconds.toFixed(1).replace(".", language === "de" ? "," : ".");
}

function formatPercent(value: number, language: Language): string {
  return `${Math.round(value * 100)}${language === "en" ? "%" : " %"}`;
}

function joinLabels(labels: readonly string[], language: Language): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) {
    return `${labels[0]} ${language === "en" ? "and" : "und"} ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")} ${
    language === "en" ? "and" : "und"
  } ${labels.at(-1)}`;
}

function itemNames(
  board: Board,
  slots: readonly number[],
  language: Language,
): string {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    const instance = board[slot];
    if (!instance) continue;
    const name = itemName(ITEM_BY_ID[instance.itemId], language);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return joinLabels(
    [...counts.entries()].map(([name, count]) =>
      count > 1 ? `${count}× ${name}` : name,
    ),
    language,
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
  language: Language,
): ItemInsightSection {
  if (slot === null) {
    return {
      headline: copy(language, "Pausiert in der Ablage", "Paused in reserve"),
      detail: copy(language, "Wirkt erst wieder im Kessel.", "Active again once placed in the cauldron."),
      slots: [],
      active: false,
    };
  }

  const baseSeconds = definition.cooldown[item.level - 1];
  const effectiveSeconds = getItemCooldownMs(board, slot) / 1000;
  const isFaster = effectiveSeconds < baseSeconds - 0.01;

  if (definition.trigger?.type === "emergency") {
    return {
      headline: copy(
        language,
        `Einmal unter ${Math.round(definition.trigger.threshold * 100)} % LP`,
        `Once below ${Math.round(definition.trigger.threshold * 100)}% HP`,
      ),
      detail: copy(language, "Löst automatisch aus.", "Triggers automatically."),
      slots: [],
      active: true,
    };
  }
  if (definition.trigger?.type === "onGuardedHit") {
    return {
      headline: copy(language, "Reagiert auf Treffer", "Reacts to hits"),
      detail: copy(
        language,
        `${formatSeconds(effectiveSeconds, language)} s Pause danach.`,
        `${formatSeconds(effectiveSeconds, language)}s lockout afterwards.`,
      ),
      slots: [],
      active: isFaster,
    };
  }
  return {
    headline: copy(
      language,
      `Alle ${formatSeconds(effectiveSeconds, language)} s`,
      `Every ${formatSeconds(effectiveSeconds, language)}s`,
    ),
    detail: isFaster
      ? copy(
          language,
          `Ohne Tempo-Buffs: ${formatSeconds(baseSeconds, language)} s.`,
          `Without speed buffs: ${formatSeconds(baseSeconds, language)}s.`,
        )
      : copy(language, "Aktueller Kampftakt.", "Current combat rhythm."),
    slots: [],
    active: isFaster,
  };
}

function affectsInsight(
  board: Board,
  item: ItemInstance,
  definition: ItemDefinition,
  slot: number | null,
  language: Language,
): ItemInsightSection {
  const passive = definition.passive;
  if (!passive || slot === null) {
    return {
      headline:
        slot === null
          ? copy(language, "Im Kessel inaktiv", "Inactive outside cauldron")
          : copy(language, "Wirkt für sich", "Self-contained"),
      detail:
        slot === null
          ? copy(language, "Ablage-Items buffen niemanden.", "Reserve items do not buff anything.")
          : copy(language, "Bufft keine anderen Zutaten.", "Does not buff other ingredients."),
      slots: [],
      active: false,
    };
  }

  const value = passive.values[item.level - 1];
  const targets = passiveTargetSlots(board, slot, definition);
  const visibleTargets = targets.filter((targetSlot) => targetSlot !== slot);
  const names = itemNames(board, visibleTargets, language);

  if (passive.type === "hasteFamily") {
    const familyName = passive.family
      ? familyText(passive.family, language, FAMILY_META[passive.family]).name
      : copy(language, "passenden", "matching");
    return {
      headline: copy(language, `${formatPercent(value, language)} schneller`, `${formatPercent(value, language)} faster`),
      detail: copy(
        language,
        `Alle ${familyName}-Zutaten – auch dieses Item.`,
        `All ${familyName} ingredients — including this one.`,
      ),
      slots: visibleTargets,
      active: true,
    };
  }
  if (passive.type === "hasteAdjacent") {
    return {
      headline: copy(language, `${formatPercent(value, language)} schneller`, `${formatPercent(value, language)} faster`),
      detail: names || copy(language, "Passende direkte Nachbarn.", "Matching adjacent ingredients."),
      slots: visibleTargets,
      active: true,
    };
  }
  return {
    headline: copy(language, `${formatPercent(value, language)} stärker`, `${formatPercent(value, language)} stronger`),
    detail: names || copy(language, "Passende direkte Nachbarn.", "Matching adjacent ingredients."),
    slots: visibleTargets,
    active: true,
  };
}

function benefitsInsight(
  board: Board,
  definition: ItemDefinition,
  slot: number | null,
  language: Language,
): ItemInsightSection {
  if (slot === null) {
    return {
      headline: copy(language, "Keine Buffs aktiv", "No buffs active"),
      detail: copy(language, "Die Ablage pausiert alle Einflüsse.", "Reserve pauses all influences."),
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
    const names = itemNames(board, externalSpeed, language);
    details.push(
      names && hasSelfSpeed
        ? copy(language, `Tempo durch eigene Aura und ${names}.`, `Speed from its own aura and ${names}.`)
        : names
          ? copy(language, `Tempo durch ${names}.`, `Speed from ${names}.`)
          : copy(language, "Tempo durch die eigene Aura.", "Speed from its own aura."),
    );
  }
  if (externalPower.length > 0) {
    const names = itemNames(board, externalPower, language);
    details.push(copy(language, `Wirkung durch ${names}.`, `Power from ${names}.`));
  }

  const slots = [...new Set([...externalSpeed, ...externalPower])];
  return {
    headline:
      sources.speed.length > 0 && sources.power.length > 0
        ? copy(language, "Schneller und stärker", "Faster and stronger")
        : sources.speed.length > 0
          ? copy(language, "Bereits beschleunigt", "Already accelerated")
          : sources.power.length > 0
            ? copy(language, "Wirkung verstärkt", "Effect empowered")
            : copy(language, "Kein Platzierungs-Buff", "No placement buff"),
    detail:
      details.join(" ") ||
      copy(language, "Aktuell wirkt kein anderes Item darauf.", "No other item currently affects it."),
    slots,
    active: sources.speed.length > 0 || sources.power.length > 0,
  };
}

function synergyInsight(
  board: Board,
  item: ItemInstance,
  definition: ItemDefinition,
  slot: number | null,
  language: Language,
): ItemInsightSection {
  if (slot === null) {
    return {
      headline: copy(language, "Ablage", "Reserve"),
      detail: copy(language, "Zählt nicht für die Synergie.", "Does not count toward synergy."),
      slots: [],
      active: false,
    };
  }
  const total = getFamilyWeights(board)[definition.family];
  const contribution = 2 ** (item.level - 1);
  const active = total >= 3;
  const family = familyText(
    definition.family,
    language,
    FAMILY_META[definition.family],
  );
  return {
    headline: active
      ? copy(language, `${family.name} aktiv`, `${family.name} active`)
      : `${family.name} ${total}/3`,
    detail: active
      ? family.shortBonus
      : copy(
          language,
          `Dieses Item zählt ${contribution}. Noch ${Math.max(0, 3 - total)} bis zum Bonus.`,
          `This item counts as ${contribution}. ${Math.max(0, 3 - total)} more to activate the bonus.`,
        ),
    slots: [],
    active,
  };
}

export function getItemInsights(
  board: Board,
  item: ItemInstance,
  slot: number | null,
  language: Language = "de",
): ItemInsights {
  const definition = ITEM_BY_ID[item.itemId];
  return {
    cadence: cadenceInsight(board, item, definition, slot, language),
    affects: affectsInsight(board, item, definition, slot, language),
    benefits: benefitsInsight(board, definition, slot, language),
    synergy: synergyInsight(board, item, definition, slot, language),
  };
}
