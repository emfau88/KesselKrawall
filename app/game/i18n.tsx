"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CampaignDefinition,
  Family,
  ItemDefinition,
  ItemLevel,
  OpponentDefinition,
} from "./types";

export type Language = "de" | "en";

export const LANGUAGE_STORAGE_KEY = "kessel-krawall:language";

const DE = {
  settingsClose: "Einstellungen schließen",
  settingsKicker: "TON, SPRACHE & ATMOSPHÄRE",
  settingsTitle: "Einstellungen",
  settingsDescription:
    "Kampfeffekte lassen sich unabhängig von Musik, Menü- und Ergebnissounds einstellen.",
  combatSounds: "Kampfsounds",
  combatSoundsDetail: "Magie, Treffer, Heilung und Schutz",
  language: "Sprache",
  languageDetail: "Alle Menüs, Spieltexte und Hinweise",
  german: "Deutsch",
  english: "Englisch",
  on: "AN",
  off: "AUS",
  savedOnDevice: "Die Auswahl wird auf diesem Gerät gespeichert.",
  campaignWon: "Kampagne gewonnen",
  campaignEnded: "Kampagne beendet",
  battleRunningRound: "Kampf läuft · Runde {round}",
  resultReadyRound: "Ergebnis bereit · Runde {round}",
  roundOf: "Runde {round} von {max}",
  replaceSave: "SPIELSTAND ERSETZEN",
  startNewCampaignQuestion: "Neue Kampagne beginnen?",
  replaceSavePrefix: "Dein gespeicherter Stand ({state}) wird durch",
  replaceSaveSuffix: "mit 7 Gold und 3 Siegeln ersetzt.",
  cancel: "ABBRECHEN",
  startCampaign: "KAMPAGNE STARTEN",
  mainMenu: "HAUPTMENÜ",
  yourProgress: "DEIN FORTSCHRITT",
  cabinet: "Kesselkabinett",
  openSettings: "Einstellungen öffnen",
  audio: "Audio",
  campaignChoice: "KAMPAGNENWAHL",
  freshCauldronHeading: "Jeder Wettstreit beginnt mit einem frischen Kessel.",
  freshCauldronBody:
    "Gold, Zutaten und Siegel werden nicht übertragen. Freigeschaltet werden neue Regeln, Familien und Trophäen – keine dauerhaften Schadensboni.",
  availableCampaigns: "Verfügbare Kampagnen",
  campaign: "KAMPAGNE {number}",
  trophyReceived: "TROPHÄE ERHALTEN",
  ready: "BEREIT",
  locked: "GESPERRT",
  masteredFamily: "DEINE GEMEISTERTE FAMILIE",
  fixedFamilyHint:
    "Frost und Echo sind fest. So bleibt der Shop bei genau drei Familien lesbar.",
  activeFamilies: "Aktive Familien",
  campaignRecord: "{wins}× gewonnen · bestes Ergebnis: {seals} Siegel",
  continueRunRound: "RUN FORTSETZEN · RUNDE {round}",
  startFreshRun: "FRISCHEN RUN STARTEN",
  defeatBossFirst: "BESIEGE ZUERST DEN GROSSKESSEL",
  collection: "Sammlung",
  trophies: "Trophäen",
  campaignsMastered: "{done}/{total} Kampagnen gemeistert",
  recipeBook: "Rezeptbuch",
  familiesDiscovered: "{count} Familien entdeckt",
  magicalAutobattler: "MAGISCHER AUTOBATTLER",
  saved: "Gespeichert: {state}",
  enableSoundAndOpen: "Ton aktivieren und Einstellungen öffnen",
  soundEnable: "Ton aktivieren",
  fullscreenAlready: "App läuft bereits im Vollbild",
  fullscreenExit: "Vollbild verlassen",
  fullscreenEnter: "Vollbild aktivieren",
  window: "Fenster",
  fullscreen: "Vollbild",
  grandTournament: "DAS GROSSE KESSELTURNIER",
  tagline: "Zutaten wählen. Magie entfesseln. Den Großkessel bezwingen.",
  synergyLegend: "Baue Synergien aus Feuer, Gift und Schutz",
  campaignContinue: "KAMPAGNE FORTSETZEN",
  sealsAgainst: "{seals} Siegel · gegen {opponent}",
  victories: "{count} Siege",
  openCabinet: "KESSELKABINETT ÖFFNEN",
  chooseCampaigns: "Kampagnen, Trophäen und Familien wählen",
  checkingProgress: "Fortschritt wird geprüft …",
  whatCampaign: "Was ist die Kampagne?",
  whatCampaignBody:
    "Eine Reise durch acht Kämpfe. Du kaufst Zutaten, mergst sie und baust Synergien. Dein Kessel kämpft danach automatisch.",
  sealsAndDefeats: "Siegel & Niederlagen",
  sealsAndDefeatsBody:
    "Drei Siegel schützen deine Kampagne. Die erste Niederlage in Runde 1 ist geschützt; danach bricht eine Niederlage ein Siegel. Du bereitest anschließend die Revanche gegen denselben Gegner vor.",
  pathContinues: "DEIN WEG GEHT WEITER",
  cabinetOpened: "Das Kesselkabinett ist geöffnet",
  twoCampaigns: "2 KAMPAGNEN",
  newFamiliesAfterOne: "Neue Familien nach Kampagne I",
  ownBuildPools: "Eigene Build-Pools",
  exactlyThreeFamilies: "Immer genau drei aktive Familien",
  progressNoDamageBonus: "Fortschritt ohne dauerhaften Schadensbonus",
  campaignProgress: "Kampagnenfortschritt: Runde {round} von {max}",
  round: "RUNDE",
  gold: "GOLD",
  seals: "SIEGEL",
  protectionSeals: "{count} Schutzsiegel",
  toMainMenu: "Zum Hauptmenü",
  menu: "MENÜ",
  combatArena: "Kampfarena",
  nextOpponent: "NÄCHSTER GEGNER",
  details: "Details",
  variant: "Variante {current}/{total}",
  slot: "Slot {slot}",
  empty: "leer",
  familySynergies: "Familien-Synergien",
  synergyActive: "{family}-Synergie aktiv",
  activatesSynergy: "Aktiviert {family}-Synergie",
  synergyProgress: "{family} {current} → {next}/3",
  familyAriaActive: "Aktiv: {bonus}",
  familyAriaMissing: "Noch {count} bis zur Synergie",
  missingToBonus: "Noch {count} bis zum Bonus",
  battleContributions: "KAMPFBEITRÄGE",
  strongestIngredientFirst: "stärkste Zutat zuerst",
  noActions: "Noch keine auswertbaren Aktionen.",
  damage: "Schaden",
  healing: "Heilung",
  shield: "Schild",
  poison: "Gift",
  burn: "Brand",
  hit: "Treffer",
  triggered: "{count}× ausgelöst",
  itemDetails: "Details zu {item}",
  level: "Stufe {level}",
  closeItemDetails: "Itemdetails schließen",
  cadence: "TAKT",
  synergy: "SYNERGIE",
  affects: "WIRKT AUF",
  benefits: "WIRD VERSTÄRKT",
  reserveUseHint: "Tippe einen Kesselplatz, um diese Zutat einzusetzen.",
  swapHint: "Tippe einen zweiten Platz, um die Zutaten zu tauschen.",
  sell: "Verkaufen",
  counterCooldown: "Trefferkonter · {time} Sperre",
  counterCadence: "Konter nach abgefangenem oder ungeschütztem Treffer, {time} Sperre",
  emergencyOnce: "einmal unter {percent} % LP",
  emergencyLife: "einmal unter {percent} Prozent Leben{used}",
  alreadyTriggered: ", bereits ausgelöst",
  everyCadence: "alle {time}",
  growsStronger: "alle {time} · wird stärker",
  slotItem: "Slot {slot}: {item}, Level {level}{cadence}{haste}",
  slotEmpty: "Slot {slot}: leer",
  cadenceSuffix: ", {cadence}",
  permanentlyHastedSuffix: ", dauerhaft beschleunigt",
  affectsSelectedSuffix: ", wird vom ausgewählten Item beeinflusst",
  benefitsSelectedSuffix: ", beeinflusst das ausgewählte Item",
  emergencyUsed: "Notfallwirkung bereits ausgelöst",
  emergencyAvailable: "Einmalige Notfallwirkung unter {percent} % Leben",
  permanentlyHasted: "Dauerhaft beschleunigt",
  reserveItemAria:
    "Ablage: {item}, Level {level}. Passiv, zählt nicht für Kampf oder Synergie.",
  reserveEmptyAria: "Ablage: leer. Hier kann eine Zutat passiv aufbewahrt werden.",
  reserve: "ABLAGE",
  passive: "PASSIV",
  activeCombatEffects: "Aktive Kampfeffekte",
  shieldDescription: "Schild: {shield}. Maximal 50 % der maximalen Lebenspunkte.",
  shieldAria: "Schild {shield}, begrenzt auf 50 Prozent der maximalen Lebenspunkte",
  remains: "bleibt",
  rage: "Zorn",
  permanent: "dauerhaft",
  rageDescription: "Kesselzorn: +25 % Kraft für den restlichen Kampf.",
  rageAria: "Kesselzorn, 25 Prozent mehr Kraft, dauerhaft",
  timeFracture: "Zeitbruch",
  timeFractureDescription:
    "Zeitbruch: +15 % Kraft für den Chronokessel. Dein nächster Angriffstakt wurde einmalig um 0,9 Sekunden verschoben.",
  timeFractureAria:
    "Zeitbruch, Chronokessel dauerhaft 15 Prozent stärker, dein Angriffstakt wurde einmalig verzögert",
  healthAria: "{label}: {hp} Leben, {shield} Schild",
  poisonDescription:
    "Gift: {stacks} gemeinsame Stapel von maximal 12. Bei {threshold} Stapeln entsteht ein Toxinschock. Nächster Tick verursacht {damage} Schaden, danach verfallen 2 Stapel. Tick in {tick}",
  timedStatusDescription:
    "{label}: {stacks} Stapel, noch etwa {remaining}, nächster Tick in {tick}",
  tickTime: "Tick {time}",
  timeDecision: "ZEITENTSCHEIDUNG",
  knockout: "K. O.",
  yourCauldronWins: "DEIN KESSEL SIEGT",
  drawUpper: "UNENTSCHIEDEN",
  winsUpper: "{opponent} SIEGT",
  timeDecisionIn: "ZEITENTSCHEIDUNG IN",
  brawl: "KRAWALL!",
  yourCauldron: "Dein Kessel",
  buildStrength: "Buildstärke ≈ {power}",
  buildEstimate: "Buildstärke ist eine grobe Schätzung",
  buildEstimateBody:
    "Eine grobe Stärkeeinschätzung zum Vergleichen – kein eigener Kampfbonus.",
  ingredientsAndTempo: "Zutaten & Tempo",
  activeSynergyOne: "{count} aktive Synergie",
  activeSynergyMany: "{count} aktive Synergien",
  roughBuildStrength: "Grobe Buildstärke",
  enemyPowerAria:
    "Gegnerische grobe Buildstärke ungefähr {power}. Erklärung öffnen",
  enemy: "Gegner",
  firstRound: "DEINE ERSTE RUNDE",
  orientThenBrew: "Erst orientieren. Dann brauen.",
  introPrefix: "Oben wartet",
  introSuffix:
    "mit seinem fertigen Kessel. Unten steht dein noch leerer Kessel. Auf dem Hexenmarkt stellst du gleich fünf Zutaten für den automatischen Kampf zusammen.",
  firstRoundFlow: "Ablauf der ersten Runde",
  quickStartHint: "Ersten Gegner ansehen und den Run beginnen",
  chooseIngredients: "Zutaten wählen",
  buildSynergies: "Synergien bauen",
  startFight: "Kampf starten",
  toMarket: "ZUM HEXENMARKT",
  openingOfferHint: "7 Gold · drei Startzutaten zur Auswahl →",
  preparationPhase: "Einkaufs- und Vorbereitungsphase",
  yourBuild: "DEIN AUFBAU",
  fiveIngredients: "Fünf Zutaten für den Kampf",
  buildEstimateShop:
    "Sie fasst Zutaten, Tempo und aktive Synergien zusammen, verändert den Kampf aber nicht.",
  witchesMarket: "HEXENMARKT",
  chooseThree: "Wähle aus drei frischen Zutaten",
  mergeStaysSlot: "Merge bleibt auf Platz {slot}",
  mergeInReserve: "Merge in der Ablage",
  landsInReserve: "Landet passiv in der Ablage",
  bought: "GEKAUFT",
  full: "VOLL",
  reroll: "Neu würfeln",
  free: "GRATIS",
  fightStart: "KAMPF STARTEN",
  bossPrefix: "BOSS: ",
  againstPrefix: "Gegen ",
  combatControls: "Kampfsteuerung",
  battlePaused: "Kampf pausiert",
  cauldronHeat: "Kesselhitze +{percent}%",
  battleRunning: "Kampf läuft",
  playbackPaused: "Wiedergabe und Effekte stehen sicher",
  secondsToDecision: "{seconds} s bis zur Zeitentscheidung",
  damageForBoth: "Schaden für beide +{percent} %",
  readingMode: "Lesemodus · Salven werden klar gestaffelt",
  directedSpeed: "Beschleunigte Regie auf {speed}×",
  timeDecisionInSeconds: "Zeitentscheidung in {seconds}",
  cauldronsCharging: "Kessel laden ihre Zauber",
  incoming: "im Anflug …",
  tempo: "TEMPO",
  pauseAndSpeed: "Pause und Kampfgeschwindigkeit",
  resumeFight: "Kampf fortsetzen",
  pauseFight: "Kampf pausieren",
  resume: "WEITER",
  pause: "PAUSE",
  clear: "KLAR",
  koShort: "K.O.",
  cauldronVictory: "Kessel-Sieg!",
  draw: "Unentschieden",
  stillProtected: "Noch geschützt!",
  lastSealBroken: "Letztes Siegel gebrochen",
  sealBreak: "Siegelbruch",
  trophyYours: "{trophy} gehört dir.",
  nextRoundGold: "+{gold} Gold in der nächsten Runde",
  drawResult: "Kein Siegelverlust und kein Gold. {opponent} wartet erneut.",
  protectedLossResult:
    "Der erste Fehlversuch kostet kein Siegel. +{gold} Trostgold für die Revanche.",
  campaignEndsResult: "{opponent} war diesmal stärker. Deine Kampagne endet.",
  revengeGoldResult:
    "{opponent} war diesmal stärker. +{gold} Trostgold für die Revanche.",
  relativeHealth: "Relative Lebensenergie bei Zeitablauf",
  versus: "gegen",
  hpDamage: "LP-Schaden: {player} zu {enemy}",
  finishCampaign: "KAMPAGNE ABSCHLIESSEN",
  takeReward: "BELOHNUNG NEHMEN · +{gold} GOLD",
  prepareRevenge: "REVANCHE VORBEREITEN",
  prepareRevengeGold: "REVANCHE VORBEREITEN · +{gold} GOLD",
  viewCampaignResult: "Kampagnenergebnis ansehen →",
  prepareRound: "Runde {round} vorbereiten →",
  challengeAgain: "{opponent} erneut herausfordern →",
  bossStanding: "DER BOSS BLEIBT STEHEN",
  cauldronCold: "DER KESSEL IST ERKALTET",
  defendsTrophy: "{opponent} verteidigt {trophy}.",
  campaignEndsRound: "Die Kampagne endet in Runde {round}.",
  gameoverSummary:
    "{wins} Siege · grobe Buildstärke {power}. Deine Zutaten warten schon auf den nächsten Versuch.",
  startNewCampaign: "NEUE KAMPAGNE STARTEN",
  freshShopHint: "7 Gold · 3 Siegel · frischer Shop",
  cauldronMaster: "KESSELMEISTER!",
  masteredCampaign: "Du meisterst „{campaign}“.",
  victorySummary:
    "{wins} Siege · {seals} Siegel übrig · finale Buildstärke {power}",
  bringTrophy: "TROPHÄE INS KESSELKABINETT BRINGEN",
  seeNextCampaign: "Nächste Kampagne und neue Familien ansehen",
  merge: "MERGE",
  cascade: "KASKADE {step}/{total}",
  merged: "VERSCHMOLZEN",
  cooldown: "Abklingzeit",
  inReserveInactive: "In der Ablage · wirkt erst im Kessel",
  power: "MACHT",
  rotatePortrait: "Bitte ins Hochformat drehen",
  portraitHint: "Kessel-Krawall ist für eine Hand im Hochformat gebaut.",
  prepareCauldron: "Bereite deinen Kessel vor.",
  playerWinsFeedback: "Dein Kessel gewinnt den Schlagabtausch!",
  opponentWinsFeedback: "{opponent} behält die Oberhand.",
  drawFeedback: "Beide Kessel sind gleichauf – unentschieden.",
  mergeCascadeFeedback: "{count}-stufige Merge-Kaskade!",
  mergedFeedback: "{item} ist {reserve}verschmolzen.",
  inReserveFragment: "in der Ablage ",
  parkedFeedback: "Zutat in der Ablage geparkt. Dort wirkt sie nicht im Kampf.",
  boughtFeedback: "Zutat gekauft.",
  freeRerollFeedback: "Kostenlos neu gewürfelt.",
  rerollFeedback: "Shop neu gewürfelt.",
  movedReserveFeedback: "Zutat zwischen Kessel und Ablage verschoben.",
  selectedFeedback: "Zutat gewählt. Tippe einen zweiten Platz zum Tauschen.",
  rearrangedFeedback: "Zutaten umsortiert.",
  reserveEmptyFeedback: "Die Ablage ist leer. Wähle zuerst eine Zutat im Kessel.",
  selectionCleared: "Auswahl aufgehoben.",
  reserveSelected: "Ablage gewählt. Tippe einen Kesselplatz zum Tauschen.",
  soldFeedback: "Verkauft für {gold} Gold.",
  battleBegins: "Der Kessel-Krawall beginnt!",
  trophyFeedback: "{opponent} fällt. Die Kampagnentrophäe gehört dir!",
  campaignLostFeedback: "Das letzte Siegel ist gebrochen. Die Kampagne endet.",
  reserveUnlockedFeedback:
    "Ablage freigeschaltet! Dort kannst du eine Zutat passiv parken.",
  nextOpponentFeedback: "Siegbonus erhalten. Nächster Gegner!",
  drawRevengeFeedback: "Unentschieden. {opponent} wartet auf die Revanche.",
  protectedRevengeFeedback:
    "Der erste Fehlversuch ist geschützt. Revanche gegen {opponent}!",
  sealRevengeFeedback: "Ein Siegel ist gebrochen. Revanche gegen {opponent}!",
  chooseOpeningFeedback: "Wähle jetzt deine ersten Zutaten für den Kessel.",
  newCauldronFeedback: "Ein neuer Kessel betritt den Wettstreit.",
  campaignBeginsFeedback: "{campaign} beginnt.",
  unlockCampaignError: "Besiege zuerst den Großkessel in Kampagne I.",
  welcomeBack: "Willkommen zurück im Kesselturnier.",
  alreadyFullscreenFeedback: "Kessel-Krawall läuft bereits bildschirmfüllend.",
  fullscreenLeftFeedback: "Vollbild verlassen.",
  fullscreenUnavailable:
    "Vollbild ist hier nicht verfügbar. Auf dem iPhone: Teilen → Zum Home-Bildschirm.",
  fullscreenActiveFeedback: "Vollbild aktiv. Viel Erfolg im Kesselturnier!",
  fullscreenFailed: "Vollbild konnte vom Browser nicht aktiviert werden.",
  newBurn: "NEU: Verursacht Brand",
  newCleanse: "NEU: Entfernt Gift",
  newOverheal: "NEU: Überheilung wird Schild",
  maxLevel: "MAXIMALSTUFE ERREICHT",
  poisonStacks: "Giftstapel",
} as const;

type MessageKey = keyof typeof DE;
type Replacements = Record<string, string | number>;

const EN: Record<MessageKey, string> = {
  settingsClose: "Close settings",
  settingsKicker: "SOUND, LANGUAGE & ATMOSPHERE",
  settingsTitle: "Settings",
  settingsDescription:
    "Combat effects can be adjusted independently of music, menu and result sounds.",
  combatSounds: "Combat sounds",
  combatSoundsDetail: "Magic, hits, healing and shields",
  language: "Language",
  languageDetail: "All menus, game text and hints",
  german: "German",
  english: "English",
  on: "ON",
  off: "OFF",
  savedOnDevice: "Your choice is saved on this device.",
  campaignWon: "Campaign won",
  campaignEnded: "Campaign ended",
  battleRunningRound: "Battle in progress · Round {round}",
  resultReadyRound: "Result ready · Round {round}",
  roundOf: "Round {round} of {max}",
  replaceSave: "REPLACE SAVED RUN",
  startNewCampaignQuestion: "Start a new campaign?",
  replaceSavePrefix: "Your saved run ({state}) will be replaced by",
  replaceSaveSuffix: "with 7 gold and 3 seals.",
  cancel: "CANCEL",
  startCampaign: "START CAMPAIGN",
  mainMenu: "MAIN MENU",
  yourProgress: "YOUR PROGRESS",
  cabinet: "Cauldron Cabinet",
  openSettings: "Open settings",
  audio: "Audio",
  campaignChoice: "CHOOSE CAMPAIGN",
  freshCauldronHeading: "Every contest starts with a fresh cauldron.",
  freshCauldronBody:
    "Gold, ingredients and seals do not carry over. You unlock new rules, families and trophies — never permanent damage bonuses.",
  availableCampaigns: "Available campaigns",
  campaign: "CAMPAIGN {number}",
  trophyReceived: "TROPHY EARNED",
  ready: "READY",
  locked: "LOCKED",
  masteredFamily: "YOUR MASTERED FAMILY",
  fixedFamilyHint:
    "Frost and Echo are fixed. This keeps the shop readable with exactly three families.",
  activeFamilies: "Active families",
  campaignRecord: "Won {wins}× · best result: {seals} seals",
  continueRunRound: "CONTINUE RUN · ROUND {round}",
  startFreshRun: "START FRESH RUN",
  defeatBossFirst: "DEFEAT THE GRAND CAULDRON FIRST",
  collection: "Collection",
  trophies: "Trophies",
  campaignsMastered: "{done}/{total} campaigns mastered",
  recipeBook: "Recipe Book",
  familiesDiscovered: "{count} families discovered",
  magicalAutobattler: "MAGICAL AUTOBATTLER",
  saved: "Saved: {state}",
  enableSoundAndOpen: "Enable sound and open settings",
  soundEnable: "Enable sound",
  fullscreenAlready: "App is already fullscreen",
  fullscreenExit: "Exit fullscreen",
  fullscreenEnter: "Enter fullscreen",
  window: "Window",
  fullscreen: "Fullscreen",
  grandTournament: "THE GRAND CAULDRON TOURNAMENT",
  tagline: "Choose ingredients. Unleash magic. Defeat the Grand Cauldron.",
  synergyLegend: "Build synergies from Fire, Poison and Guard",
  campaignContinue: "CONTINUE CAMPAIGN",
  sealsAgainst: "{seals} seals · against {opponent}",
  victories: "{count} victories",
  openCabinet: "OPEN CAULDRON CABINET",
  chooseCampaigns: "Choose campaigns, trophies and families",
  checkingProgress: "Checking progress …",
  whatCampaign: "What is a campaign?",
  whatCampaignBody:
    "A journey through eight battles. Buy and merge ingredients, then build synergies. Your cauldron fights automatically.",
  sealsAndDefeats: "Seals & defeats",
  sealsAndDefeatsBody:
    "Three seals protect your campaign. Your first defeat in round 1 is protected; after that, a defeat breaks one seal. You then prepare a rematch against the same opponent.",
  pathContinues: "YOUR JOURNEY CONTINUES",
  cabinetOpened: "The Cauldron Cabinet is open",
  twoCampaigns: "2 CAMPAIGNS",
  newFamiliesAfterOne: "New families after Campaign I",
  ownBuildPools: "Distinct build pools",
  exactlyThreeFamilies: "Always exactly three active families",
  progressNoDamageBonus: "Progress without permanent damage bonuses",
  campaignProgress: "Campaign progress: round {round} of {max}",
  round: "ROUND",
  gold: "GOLD",
  seals: "SEALS",
  protectionSeals: "{count} protection seals",
  toMainMenu: "Go to main menu",
  menu: "MENU",
  combatArena: "Combat arena",
  nextOpponent: "NEXT OPPONENT",
  details: "Details",
  variant: "Variant {current}/{total}",
  slot: "Slot {slot}",
  empty: "empty",
  familySynergies: "Family synergies",
  synergyActive: "{family} synergy active",
  activatesSynergy: "Activates {family} synergy",
  synergyProgress: "{family} {current} → {next}/3",
  familyAriaActive: "Active: {bonus}",
  familyAriaMissing: "{count} more to activate synergy",
  missingToBonus: "{count} more to activate bonus",
  battleContributions: "BATTLE CONTRIBUTIONS",
  strongestIngredientFirst: "strongest ingredient first",
  noActions: "No actions to evaluate yet.",
  damage: "Damage",
  healing: "Healing",
  shield: "Shield",
  poison: "Poison",
  burn: "Burn",
  hit: "Hit",
  triggered: "triggered {count}×",
  itemDetails: "Details for {item}",
  level: "Level {level}",
  closeItemDetails: "Close item details",
  cadence: "RHYTHM",
  synergy: "SYNERGY",
  affects: "AFFECTS",
  benefits: "EMPOWERED BY",
  reserveUseHint: "Tap a cauldron slot to place this ingredient.",
  swapHint: "Tap a second slot to swap the ingredients.",
  sell: "Sell",
  counterCooldown: "Counterattack · {time} lockout",
  counterCadence: "Counters an absorbed or unshielded hit, {time} lockout",
  emergencyOnce: "once below {percent}% HP",
  emergencyLife: "once below {percent}% health{used}",
  alreadyTriggered: ", already triggered",
  everyCadence: "every {time}",
  growsStronger: "every {time} · grows stronger",
  slotItem: "Slot {slot}: {item}, level {level}{cadence}{haste}",
  slotEmpty: "Slot {slot}: empty",
  cadenceSuffix: ", {cadence}",
  permanentlyHastedSuffix: ", permanently accelerated",
  affectsSelectedSuffix: ", affected by selected item",
  benefitsSelectedSuffix: ", affects selected item",
  emergencyUsed: "Emergency effect already triggered",
  emergencyAvailable: "One-time emergency effect below {percent}% health",
  permanentlyHasted: "Permanently accelerated",
  reserveItemAria:
    "Reserve: {item}, level {level}. Passive and does not count toward combat or synergy.",
  reserveEmptyAria: "Reserve: empty. One ingredient can be stored here passively.",
  reserve: "RESERVE",
  passive: "PASSIVE",
  activeCombatEffects: "Active combat effects",
  shieldDescription: "Shield: {shield}. Capped at 50% of maximum health.",
  shieldAria: "Shield {shield}, capped at 50 percent of maximum health",
  remains: "stays",
  rage: "Rage",
  permanent: "permanent",
  rageDescription: "Cauldron Rage: +25% power for the rest of the battle.",
  rageAria: "Cauldron Rage, 25 percent more power, permanent",
  timeFracture: "Time Fracture",
  timeFractureDescription:
    "Time Fracture: +15% power for the Chrono Cauldron. Your next attack cycle was delayed once by 0.9 seconds.",
  timeFractureAria:
    "Time Fracture, Chrono Cauldron permanently 15 percent stronger, your attack cycle was delayed once",
  healthAria: "{label}: {hp} health, {shield} shield",
  poisonDescription:
    "Poison: {stacks} shared stacks out of 12. At {threshold} stacks, Toxic Shock triggers. The next tick deals {damage} damage, then 2 stacks expire. Tick in {tick}",
  timedStatusDescription:
    "{label}: {stacks} stacks, about {remaining} remaining, next tick in {tick}",
  tickTime: "Tick {time}",
  timeDecision: "TIME DECISION",
  knockout: "K. O.",
  yourCauldronWins: "YOUR CAULDRON WINS",
  drawUpper: "DRAW",
  winsUpper: "{opponent} WINS",
  timeDecisionIn: "TIME DECISION IN",
  brawl: "BRAWL!",
  yourCauldron: "Your Cauldron",
  buildStrength: "Build strength ≈ {power}",
  buildEstimate: "Build strength is a rough estimate",
  buildEstimateBody:
    "A rough strength estimate for comparison — it is not a separate combat bonus.",
  ingredientsAndTempo: "Ingredients & rhythm",
  activeSynergyOne: "{count} active synergy",
  activeSynergyMany: "{count} active synergies",
  roughBuildStrength: "Rough build strength",
  enemyPowerAria: "Opponent's rough build strength is about {power}. Open explanation",
  enemy: "Opponent",
  firstRound: "YOUR FIRST ROUND",
  orientThenBrew: "Take stock. Then start brewing.",
  introPrefix: "At the top,",
  introSuffix:
    "is waiting with a finished cauldron. Your empty cauldron is below. At the Witches' Market, you will choose five ingredients for the automatic battle.",
  firstRoundFlow: "Flow of the first round",
  quickStartHint: "Meet your first opponent and begin the run",
  chooseIngredients: "Choose ingredients",
  buildSynergies: "Build synergies",
  startFight: "Start battle",
  toMarket: "GO TO WITCHES' MARKET",
  openingOfferHint: "7 gold · choose from three starting ingredients →",
  preparationPhase: "Shopping and preparation phase",
  yourBuild: "YOUR BUILD",
  fiveIngredients: "Five ingredients for battle",
  buildEstimateShop:
    "It combines ingredients, speed and active synergies, but does not alter combat.",
  witchesMarket: "WITCHES' MARKET",
  chooseThree: "Choose from three fresh ingredients",
  mergeStaysSlot: "Merge stays in slot {slot}",
  mergeInReserve: "Merge in reserve",
  landsInReserve: "Placed passively in reserve",
  bought: "BOUGHT",
  full: "FULL",
  reroll: "Reroll",
  free: "FREE",
  fightStart: "START BATTLE",
  bossPrefix: "BOSS: ",
  againstPrefix: "Against ",
  combatControls: "Combat controls",
  battlePaused: "Battle paused",
  cauldronHeat: "Cauldron Heat +{percent}%",
  battleRunning: "Battle in progress",
  playbackPaused: "Playback and effects are safely paused",
  secondsToDecision: "{seconds}s until the time decision",
  damageForBoth: "Damage for both +{percent}%",
  readingMode: "Clarity mode · volleys are clearly staggered",
  directedSpeed: "Directed playback at {speed}×",
  timeDecisionInSeconds: "Time decision in {seconds}",
  cauldronsCharging: "Cauldrons are charging their spells",
  incoming: "incoming …",
  tempo: "SPEED",
  pauseAndSpeed: "Pause and combat speed",
  resumeFight: "Resume battle",
  pauseFight: "Pause battle",
  resume: "RESUME",
  pause: "PAUSE",
  clear: "CLEAR",
  koShort: "K.O.",
  cauldronVictory: "Cauldron Victory!",
  draw: "Draw",
  stillProtected: "Still protected!",
  lastSealBroken: "Last seal broken",
  sealBreak: "Seal broken",
  trophyYours: "{trophy} is yours.",
  nextRoundGold: "+{gold} gold next round",
  drawResult: "No seal lost and no gold. {opponent} is waiting again.",
  protectedLossResult:
    "The first failed attempt costs no seal. +{gold} consolation gold for the rematch.",
  campaignEndsResult: "{opponent} was stronger this time. Your campaign ends.",
  revengeGoldResult:
    "{opponent} was stronger this time. +{gold} consolation gold for the rematch.",
  relativeHealth: "Relative health when time expires",
  versus: "versus",
  hpDamage: "HP damage: {player} to {enemy}",
  finishCampaign: "FINISH CAMPAIGN",
  takeReward: "CLAIM REWARD · +{gold} GOLD",
  prepareRevenge: "PREPARE REMATCH",
  prepareRevengeGold: "PREPARE REMATCH · +{gold} GOLD",
  viewCampaignResult: "View campaign result →",
  prepareRound: "Prepare round {round} →",
  challengeAgain: "Challenge {opponent} again →",
  bossStanding: "THE BOSS STILL STANDS",
  cauldronCold: "THE CAULDRON HAS GONE COLD",
  defendsTrophy: "{opponent} defends {trophy}.",
  campaignEndsRound: "The campaign ends in round {round}.",
  gameoverSummary:
    "{wins} victories · rough build strength {power}. Your ingredients are ready for another try.",
  startNewCampaign: "START NEW CAMPAIGN",
  freshShopHint: "7 gold · 3 seals · fresh shop",
  cauldronMaster: "CAULDRON MASTER!",
  masteredCampaign: "You mastered “{campaign}”.",
  victorySummary:
    "{wins} victories · {seals} seals left · final build strength {power}",
  bringTrophy: "BRING TROPHY TO THE CAULDRON CABINET",
  seeNextCampaign: "View the next campaign and new families",
  merge: "MERGE",
  cascade: "CASCADE {step}/{total}",
  merged: "MERGED",
  cooldown: "Cooldown",
  inReserveInactive: "In reserve · active only in the cauldron",
  power: "POWER",
  rotatePortrait: "Please rotate to portrait",
  portraitHint: "Kessel-Krawall is designed for one-handed portrait play.",
  prepareCauldron: "Prepare your cauldron.",
  playerWinsFeedback: "Your cauldron wins the exchange!",
  opponentWinsFeedback: "{opponent} keeps the upper hand.",
  drawFeedback: "Both cauldrons are evenly matched — a draw.",
  mergeCascadeFeedback: "{count}-step merge cascade!",
  mergedFeedback: "{item} was merged{reserve}.",
  inReserveFragment: " into reserve",
  parkedFeedback: "Ingredient placed in reserve. It is inactive in combat there.",
  boughtFeedback: "Ingredient bought.",
  freeRerollFeedback: "Free reroll.",
  rerollFeedback: "Shop rerolled.",
  movedReserveFeedback: "Ingredient moved between cauldron and reserve.",
  selectedFeedback: "Ingredient selected. Tap a second slot to swap.",
  rearrangedFeedback: "Ingredients rearranged.",
  reserveEmptyFeedback: "The reserve is empty. Select an ingredient in the cauldron first.",
  selectionCleared: "Selection cleared.",
  reserveSelected: "Reserve selected. Tap a cauldron slot to swap.",
  soldFeedback: "Sold for {gold} gold.",
  battleBegins: "The cauldron brawl begins!",
  trophyFeedback: "{opponent} falls. The campaign trophy is yours!",
  campaignLostFeedback: "The final seal is broken. The campaign ends.",
  reserveUnlockedFeedback:
    "Reserve unlocked! You can store one ingredient there passively.",
  nextOpponentFeedback: "Victory reward received. Next opponent!",
  drawRevengeFeedback: "Draw. {opponent} is waiting for the rematch.",
  protectedRevengeFeedback:
    "Your first failed attempt is protected. Rematch against {opponent}!",
  sealRevengeFeedback: "One seal is broken. Rematch against {opponent}!",
  chooseOpeningFeedback: "Choose your first ingredients for the cauldron.",
  newCauldronFeedback: "A new cauldron enters the contest.",
  campaignBeginsFeedback: "{campaign} begins.",
  unlockCampaignError: "Defeat the Grand Cauldron in Campaign I first.",
  welcomeBack: "Welcome back to the cauldron tournament.",
  alreadyFullscreenFeedback: "Kessel-Krawall is already filling the screen.",
  fullscreenLeftFeedback: "Exited fullscreen.",
  fullscreenUnavailable:
    "Fullscreen is not available here. On iPhone: Share → Add to Home Screen.",
  fullscreenActiveFeedback: "Fullscreen enabled. Good luck in the tournament!",
  fullscreenFailed: "The browser could not enable fullscreen.",
  newBurn: "NEW: Inflicts Burn",
  newCleanse: "NEW: Removes Poison",
  newOverheal: "NEW: Overhealing becomes Shield",
  maxLevel: "MAXIMUM LEVEL REACHED",
  poisonStacks: "Poison stacks",
};

const FAMILY_EN: Record<Family, { name: string; shortBonus: string }> = {
  fire: { name: "Fire", shortBonus: "22% more direct damage" },
  poison: { name: "Poison", shortBonus: "+1 Poison and 5% faster" },
  guard: { name: "Guard", shortBonus: "12 starting shield and 15% stronger" },
  frost: {
    name: "Frost",
    shortBonus: "Every 3rd activation: enemy cooldown +0.65s",
  },
  echo: { name: "Echo", shortBonus: "Every 3rd activation: 55% aftershock" },
};

type ItemText = {
  name: string;
  descriptions: readonly [string, string, string];
};

const ITEM_EN: Record<string, ItemText> = {
  chili: {
    name: "Chili Pepper",
    descriptions: [
      "Hurls 4 fire damage.",
      "Hurls 9 fire damage.",
      "18 damage and leaves Burn behind.",
    ],
  },
  "dragon-tooth": {
    name: "Dragon Tooth",
    descriptions: [
      "Hit; each activation makes it 18% stronger.",
      "Heavy hit; keeps growing during battle.",
      "Massive hit; keeps growing during battle.",
    ],
  },
  "ember-core": {
    name: "Ember Core",
    descriptions: [
      "Damage; speeds up adjacent Fire ingredients.",
      "More damage and adjacent speed.",
      "Ignites extremely fast adjacent Fire ingredients.",
    ],
  },
  "cinder-berry": {
    name: "Cinder Berry",
    descriptions: [
      "Hits poisoned targets 4 harder.",
      "Hits poisoned targets 8 harder.",
      "Hits poisoned targets 14 harder.",
    ],
  },
  "slime-shroom": {
    name: "Slime Shroom",
    descriptions: [
      "Applies 3 Poison. 10 Poison triggers Toxic Shock.",
      "Applies 6 Poison. 10 Poison triggers Toxic Shock.",
      "Applies 10 Poison and immediately triggers Toxic Shock.",
    ],
  },
  nightwing: {
    name: "Nightwing",
    descriptions: [
      "Small hit; speeds up adjacent ingredients.",
      "Hit with strong adjacent speed.",
      "Hit with extreme adjacent speed.",
    ],
  },
  "witch-eye": {
    name: "Witch Eye",
    descriptions: [
      "Deals +5 damage against poisoned targets.",
      "Deals +10 against poisoned targets.",
      "Deals +18 against poisoned targets.",
    ],
  },
  "venom-bulb": {
    name: "Viper Bulb",
    descriptions: [
      "Damage, Poison and speed for Poison ingredients.",
      "More damage, Poison and Poison speed.",
      "Powerful Poison and maximum Poison speed.",
    ],
  },
  "egg-shell": {
    name: "Eggshell",
    descriptions: [
      "Creates 6 Shield.",
      "Creates 13 Shield.",
      "24 Shield and removes Poison.",
    ],
  },
  "healing-tuber": {
    name: "Healing Tuber",
    descriptions: [
      "Heals once below 50% health.",
      "Heals once below 50% health.",
      "Early emergency heal; overhealing becomes Shield.",
    ],
  },
  "gold-spoon": {
    name: "Golden Spoon",
    descriptions: [
      "Heals, shields and empowers adjacent Guard ingredients.",
      "Strong healing and adjacent empowerment.",
      "Powerful dual Guard effect.",
    ],
  },
  "moon-salt": {
    name: "Moon Salt",
    descriptions: [
      "Counters absorbed or unshielded hits.",
      "Stronger counter with Shield and a shard.",
      "Massive counter with Shield and a shard.",
    ],
  },
  "frost-shard": {
    name: "Frost Shard",
    descriptions: [
      "Clean Frost hit. Three Frost activations slow the enemy.",
      "Stronger Frost hit with a faster rhythm.",
      "Massive Frost hit for frequent Frost Lock.",
    ],
  },
  "ice-bell": {
    name: "Ice Bell",
    descriptions: [
      "Shields the cauldron and launches an ice shard.",
      "More Shield and a stronger shard.",
      "Dense ice armor with a powerful counterstrike.",
    ],
  },
  "winter-bloom": {
    name: "Winter Bloom",
    descriptions: [
      "Heals and adds a thin layer of ice as Shield.",
      "Strong healing with a growing ice shield.",
      "Powerful regeneration and dense ice protection.",
    ],
  },
  "rime-clock": {
    name: "Rime Clock",
    descriptions: [
      "Small hit; speeds up both neighbors.",
      "More damage and stronger adjacent speed.",
      "Fast Frost rhythm with extreme adjacent speed.",
    ],
  },
  "mirror-shard": {
    name: "Mirror Shard",
    descriptions: [
      "Direct Echo damage. Three Echo activations create an aftershock.",
      "Stronger hit with a faster aftershock.",
      "Sharp mirror strike for dense Echo chains.",
    ],
  },
  "echo-bell": {
    name: "Echo Bell",
    descriptions: [
      "Hit; speeds up all Echo ingredients.",
      "More damage and a tighter Echo rhythm.",
      "Powerful chime with maximum Echo speed.",
    ],
  },
  "rune-cup": {
    name: "Rune Cup",
    descriptions: [
      "Heals and shields; both can return as an aftershock.",
      "Strong dual effect with Echo potential.",
      "Powerful healing and Shield in the same rhythm.",
    ],
  },
  "time-thread": {
    name: "Time Thread",
    descriptions: [
      "Shields, hits and empowers both neighbors.",
      "More dual effect and stronger neighbors.",
      "Weaves attack, protection and strong adjacent buffs together.",
    ],
  },
};

type OpponentText = Pick<OpponentDefinition, "name" | "title" | "quote" | "threat">;

const OPPONENT_EN: Record<string, OpponentText> = {
  zischbert: { name: "Zischbert", title: "The Firestarter", quote: "This is about to get pleasantly unpleasant.", threat: "Clear fire attacks, but no protection at all" },
  "moor-martha": { name: "Moor Martha", title: "The Patient", quote: "Try not to breathe too deeply, dear.", threat: "Poison grows slowly, but reliably" },
  "schild-siggi": { name: "Shield Siggi", title: "The Immovable", quote: "Knock all you like. I can barely hear you.", threat: "Plenty of Shield, but only weak counter damage" },
  "knister-klara": { name: "Crackle Klara", title: "The Combiner", quote: "First green, then red — and then it gets loud.", threat: "Cinder Berries hit poisoned cauldrons harder" },
  "tox-toni": { name: "Tox Toni", title: "The Bog Whisperer", quote: "One drop is chance. Ten are a plan.", threat: "Active Poison synergy and accelerated stacks" },
  "broesel-berta": { name: "Crumbly Bertha", title: "The Iron Baker", quote: "There is a little fire beneath every good crust.", threat: "Guard synergy keeps heavy fire attacks alive" },
  "meisterin-mirea": { name: "Mistress Mirea", title: "Elite of the Flame Pact", quote: "I do not need a large cauldron. Only the right one.", threat: "Explosive Fire synergy with a perfectly placed Ember Core" },
  grosskessel: { name: "The Grand Cauldron", title: "Master of the Cauldron Tournament", quote: "Small ingredients. Great hopes.", threat: "Cauldron Rage: below 50% health, all effects become 25% stronger" },
  "reif-rudi": { name: "Rime Rudi", title: "The Cold Welcome", quote: "Do not worry. The shivering is part of the welcome.", threat: "Frost Lock disrupts your usual attack rhythm" },
  "hall-hanne": { name: "Echo Hanne", title: "The Second Voice", quote: "I only say everything once. My cauldron does not.", threat: "Echo repeats every third activation at reduced strength" },
  "eis-elsa": { name: "Ice Elsa", title: "The Steadfast", quote: "The cauldron keeps working beneath the ice.", threat: "Ice shields keep their Frost rhythm alive for a long time" },
  "takt-tilda": { name: "Tempo Tilda", title: "The Chain Weaver", quote: "The right neighbor turns a whisper into thunder.", threat: "Time Thread and Rime Clock empower their neighbors" },
  "splitter-sven": { name: "Shard Sven", title: "The Rhythm Breaker", quote: "You had a plan? So did I. For your plan.", threat: "Active Frost synergy regularly disrupts your tempo" },
  "resonanz-rosa": { name: "Resonance Rosa", title: "The Reverberating", quote: "My strongest move rarely comes alone.", threat: "Active Echo synergy repeats offense and defense" },
  "archivarin-aeva": { name: "Archivist Aeva", title: "Elite of the Silent Archive", quote: "Every one of your mistakes is already in my book.", threat: "Frost controls the rhythm while Echo doubles key actions" },
  chronokessel: { name: "The Chrono Cauldron", title: "Guardian of the Frozen Archive", quote: "Your journey does not end here. Only your time.", threat: "Time Fracture: below 50% health, +15% power and a one-time +0.9s delay to your attack rhythm" },
};

type CampaignText = Pick<
  CampaignDefinition,
  "name" | "subtitle" | "description" | "trophyName"
>;

const CAMPAIGN_EN: Record<string, CampaignText> = {
  "grand-tournament": {
    name: "The Grand Cauldron Contest",
    subtitle: "The Learning Campaign",
    description:
      "Eight battles, three clear families and the Grand Cauldron as your final exam.",
    trophyName: "Crown of the Grand Cauldron",
  },
  "frostbound-vault": {
    name: "The Frostbound Archive",
    subtitle: "Frost & Echo",
    description:
      "Control the rhythm of battle with Frost and repeat key actions with Echo.",
    trophyName: "Hourglass of the Chrono Cauldron",
  },
};

const ERROR_EN: Record<string, string> = {
  "Der Shop ist geschlossen.": "The shop is closed.",
  "Dieses Angebot ist nicht mehr verfügbar.": "This offer is no longer available.",
  "Nicht genug Gold.": "Not enough gold.",
  "Kessel und Ablage sind voll – dieser Kauf würde nicht mergen.":
    "The cauldron and reserve are full — this purchase would not merge.",
  "Der Kessel ist voll – dieser Kauf würde nicht mergen.":
    "The cauldron is full — this purchase would not merge.",
  "Im Kampf wird nichts verkauft.": "You cannot sell during battle.",
  "Dieser Platz ist leer.": "This slot is empty.",
  "Die Ablage ist noch nicht freigeschaltet.": "The reserve is not unlocked yet.",
  "Die Ablage ist leer.": "The reserve is empty.",
  "Im Kampf wird nichts umgestellt.": "You cannot rearrange items during battle.",
  "Nicht genug Gold für einen Reroll.": "Not enough gold for a reroll.",
  "Lege zuerst mindestens eine Zutat in den Kessel.":
    "Place at least one ingredient in the cauldron first.",
};

function interpolate(template: string, replacements?: Replacements): string {
  if (!replacements) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    replacements[key] === undefined ? match : String(replacements[key]),
  );
}

export function translate(
  language: Language,
  key: MessageKey,
  replacements?: Replacements,
): string {
  return interpolate(language === "en" ? EN[key] : DE[key], replacements);
}

export function familyText(
  family: Family,
  language: Language,
  german: { name: string; shortBonus: string },
): { name: string; shortBonus: string } {
  return language === "en" ? FAMILY_EN[family] : german;
}

export function itemName(
  definition: ItemDefinition,
  language: Language,
): string {
  return language === "en" ? ITEM_EN[definition.id]?.name ?? definition.name : definition.name;
}

export function itemDescription(
  definition: ItemDefinition,
  level: ItemLevel,
  language: Language,
): string {
  return language === "en"
    ? ITEM_EN[definition.id]?.descriptions[level - 1] ?? definition.descriptions[level - 1]
    : definition.descriptions[level - 1];
}

export function opponentText(
  opponent: OpponentDefinition,
  language: Language,
): OpponentText {
  return language === "en" ? OPPONENT_EN[opponent.id] ?? opponent : opponent;
}

export function campaignText(
  campaign: CampaignDefinition,
  language: Language,
): CampaignText {
  return language === "en" ? CAMPAIGN_EN[campaign.id] ?? campaign : campaign;
}

export function translateGameError(error: string, language: Language): string {
  return language === "en" ? ERROR_EN[error] ?? error : error;
}

export function formatDecimal(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

export function translateCombatLabel(label: string, language: Language): string {
  if (language === "de") return label;
  const exact: Record<string, string> = {
    "Überheilung": "Overhealing",
    "Gift entfernt": "Poison removed",
    "Brand": "Burn",
    "Gift tickt": "Poison tick",
    "Brand tickt": "Burn tick",
    "Froststarre · Takt verzögert": "Frost Lock · rhythm delayed",
    "Kesselzorn entfacht": "Cauldron Rage ignited",
    "Zeitbruch entfacht": "Time Fracture triggered",
    "Zeitbruch · dein Takt springt zurück": "Time Fracture · your rhythm is pushed back",
    "Statuswirkungen ticken gebündelt": "Status effects tick together",
    "Schutz-Synergie": "Guard synergy",
    "Gift-Synergie": "Poison synergy",
    "Feuer-Synergie": "Fire synergy",
    "Frost-Synergie": "Frost synergy",
    "Echo-Synergie": "Echo synergy",
  };
  if (exact[label]) return exact[label];
  const exchange = label.match(/^(\d+)er-Schlagabtausch$/);
  if (exchange) return `${exchange[1]}-action exchange`;
  const playerVolley = label.match(/^Deine (\d+)er-Salve$/);
  if (playerVolley) return `Your ${playerVolley[1]}-action volley`;
  const enemyVolley = label.match(/^Gegnerische (\d+)er-Salve$/);
  if (enemyVolley) return `Enemy ${enemyVolley[1]}-action volley`;
  const toxicShock = label.match(/^Toxinschock · (\d+) Gift$/);
  if (toxicShock) return `Toxic Shock · ${toxicShock[1]} Poison`;
  for (const definition of Object.values(ITEM_EN)) {
    // English labels are stable when a previously translated event is restored.
    if (label === definition.name || label.startsWith(`${definition.name} · `)) return label;
  }
  const germanNames: Record<string, string> = {
    Chilischote: "Chili Pepper", Drachenzahn: "Dragon Tooth", Glutkern: "Ember Core",
    Rußbeere: "Cinder Berry", Schleimpilz: "Slime Shroom", Nachtflügel: "Nightwing",
    Hexenauge: "Witch Eye", Vipernknolle: "Viper Bulb", Eierschale: "Eggshell",
    Heilknolle: "Healing Tuber", Goldlöffel: "Golden Spoon", Mondsalz: "Moon Salt",
    Frostsplitter: "Frost Shard", Eisglocke: "Ice Bell", Winterblüte: "Winter Bloom",
    Reifuhr: "Rime Clock", Spiegelscherbe: "Mirror Shard", Hallglocke: "Echo Bell",
    Runenkelch: "Rune Cup", Zeitfaden: "Time Thread",
  };
  for (const [german, english] of Object.entries(germanNames)) {
    if (label === german) return english;
    if (label === `${german} · vergiftet!`) return `${english} · poisoned!`;
    if (label === `${german} · Nachhall`) return `${english} · aftershock`;
  }
  return label
    .replace(/ · (\d+) Effekte$/, " · $1 effects")
    .replace(/ · (\d+) Quellen$/, " · $1 sources")
    .replace(/^Gift tickt/, "Poison tick")
    .replace(/^Brand tickt/, "Burn tick");
}

export function translateCombatAmount(
  amountLabel: string,
  language: Language,
): string {
  if (language === "de") return amountLabel;
  return amountLabel
    .replace(/ LP\b/g, " HP")
    .replace(/ Schild\b/g, " Shield")
    .replace(/ Gift\b/g, " Poison")
    .replace(/ Brand\b/g, " Burn")
    .replace(/ % Nachhall\b/g, "% aftershock")
    .replace(/ s gegnerische Ladezeit\b/g, "s enemy cooldown")
    .replace(/(\d),(\d)/g, "$1.$2");
}

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, replacements?: Replacements) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const IS_CRAZYGAMES_BUILD =
  process.env.NEXT_PUBLIC_DISTRIBUTION === "crazygames";

function preferredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    // A blocked store should not prevent browser-language detection.
  }
  return navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Each distribution has a deterministic server language; browser preference follows hydration.
  const [language, updateLanguage] = useState<Language>(
    IS_CRAZYGAMES_BUILD ? "en" : "de",
  );

  useEffect(() => {
    const preferred = preferredLanguage();
    const timer = window.setTimeout(() => updateLanguage(preferred), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en"
        ? "Cauldron Rumble · Magical Autobattler"
        : "Kessel-Krawall · Magischer Autobattler";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content =
        language === "en"
          ? "An accessible mobile autobattler with magical ingredients, automatic merges and powerful synergies."
          : "Ein zugänglicher Mobile-Autobattler mit magischen Zutaten, automatischen Merges und starken Synergien.";
    }
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // The language remains active for the current session.
    }
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    updateLanguage(nextLanguage);
  }, []);
  const t = useCallback(
    (key: MessageKey, replacements?: Replacements) =>
      translate(language, key, replacements),
    [language],
  );
  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

export const translationKeys = Object.keys(DE) as MessageKey[];
export const englishTranslationKeys = Object.keys(EN) as MessageKey[];
