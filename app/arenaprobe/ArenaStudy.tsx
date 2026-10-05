"use client";

import { useState } from "react";
import { ArenaAtmosphere } from "../game/ArenaAtmosphere";
import styles from "./arena-study.module.css";

export default function ArenaStudy() {
  const [animated, setAnimated] = useState(true);
  const [paused, setPaused] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [gust, setGust] = useState(0);
  return <main className={styles.study}>
    <div className={styles.content}>
      <header className={styles.header}>
        <div><p>KESSEL KRAWALL · ARENAPROBE</p><h1>Feuer & Stoff</h1>
          <span>Flackernde Kerzen und Ofenfeuer, grüner Dampf und kleine Banner im Hintergrund.</span></div>
        <a href="../">Zum Spiel</a>
      </header>
      <div className={styles.controls}>
        <button aria-pressed={animated} onClick={() => setAnimated(true)}>Neue Arena</button>
        <button aria-pressed={!animated} onClick={() => setAnimated(false)}>Vorher vergleichen</button>
        <button aria-pressed={portrait} onClick={() => setPortrait(!portrait)}>{portrait ? "Breite Ansicht" : "Handyansicht"}</button>
        <button disabled={!animated} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Fortsetzen" : "Pausieren"}</button>
        <button disabled={!animated || paused} onClick={() => setGust((value) => value + 1)}>Windstoß</button>
      </div>
      <div className={`${styles.stage} ${portrait ? styles.portrait : ""}`} role="img"
        aria-label="Alchemistenarena mit zwei kleinen Bannern, animierten Kerzen, Ofenfeuer und grünem Dampf">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.backdrop} alt="" src={`../assets/backgrounds/${animated ? "tournament-arena-motion-v2.webp" : "tournament-arena-clean-v1.webp"}`} />
        <div className={styles.shade} />
        <ArenaAtmosphere paused={paused} celebration={gust ? `preview-${gust}` : null} preview life={animated} />
        <span className={styles.label}>{animated ? "NEUE ARENA" : "VORHER · STARRE FEUERSTELLEN"}</span>
      </div>
      <p className={styles.note}>Die gleichen Animationen laufen bereits im Kampf. In dieser Ansicht kannst du ihre Platzierung ohne Kessel und Karten ansehen. Die Handyansicht zeigt den schmalen Bildausschnitt; reduzierte Bewegung hält die Animation an.</p>
    </div>
  </main>;
}
