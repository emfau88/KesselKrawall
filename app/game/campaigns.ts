import { CAMPAIGN_OPPONENTS, FROSTBOUND_OPPONENTS } from "./data";
import type {
  CampaignDefinition,
  CampaignId,
  Family,
  LegacyFamily,
} from "./types";

export const LEGACY_FAMILIES: readonly LegacyFamily[] = [
  "fire",
  "poison",
  "guard",
] as const;

export const CAMPAIGNS: readonly CampaignDefinition[] = [
  {
    id: "grand-tournament",
    number: 1,
    name: "Der große Kessel-Wettstreit",
    subtitle: "Die Lehrkampagne",
    description:
      "Acht Kämpfe, drei klare Familien und der Großkessel als Abschlussprüfung.",
    trophyName: "Krone des Großkessels",
    opponents: CAMPAIGN_OPPONENTS,
    fixedFamilies: ["fire", "poison", "guard"],
    selectableLegacyFamily: false,
    defaultFamilies: ["fire", "poison", "guard"],
    openingItemByFamily: {
      fire: "chili",
      poison: "slime-shroom",
      guard: "egg-shell",
    },
  },
  {
    id: "frostbound-vault",
    number: 2,
    name: "Das frostgebundene Archiv",
    subtitle: "Frost & Echo",
    description:
      "Kontrolliere den Kampftakt mit Frost und lass Schlüsselzüge durch Echo wiederkehren.",
    trophyName: "Sanduhr des Chronokessels",
    opponents: FROSTBOUND_OPPONENTS,
    fixedFamilies: ["frost", "echo"],
    selectableLegacyFamily: true,
    defaultFamilies: ["frost", "echo", "fire"],
    openingItemByFamily: {
      frost: "frost-shard",
      echo: "mirror-shard",
      fire: "chili",
      poison: "slime-shroom",
      guard: "egg-shell",
    },
  },
] as const;

export const CAMPAIGN_BY_ID = Object.fromEntries(
  CAMPAIGNS.map((campaign) => [campaign.id, campaign]),
) as Record<CampaignId, CampaignDefinition>;

export function getCampaign(campaignId: CampaignId): CampaignDefinition {
  return CAMPAIGN_BY_ID[campaignId] ?? CAMPAIGN_BY_ID["grand-tournament"];
}

export function getCampaignFamilies(
  campaignId: CampaignId,
  legacyFamily?: LegacyFamily,
): Family[] {
  const campaign = getCampaign(campaignId);
  if (!campaign.selectableLegacyFamily) return [...campaign.defaultFamilies];
  return [
    ...campaign.fixedFamilies,
    legacyFamily ?? "fire",
  ];
}

export function getOpeningItemIds(
  campaignId: CampaignId,
  families: readonly Family[],
): string[] {
  const campaign = getCampaign(campaignId);
  return families
    .map((family) => campaign.openingItemByFamily[family])
    .filter((itemId): itemId is string => Boolean(itemId))
    .slice(0, 3);
}
