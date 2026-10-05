"use client";

import { useEffect, useRef, useState } from "react";
import type { StudyController, StudyView } from "./render-study";
import styles from "./study.module.css";

export default function AnimationStudy() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<StudyController | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState<StudyView>("together");
  const [wire, setWire] = useState(false);
  const [arena, setArena] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let instance: StudyController | undefined;
    import("./render-study").then(({ createStudy }) => createStudy(element)).then((result) => {
      instance = result;
      if (cancelled) { result.destroy(); return; }
      controller.current = result;
      setReady(true);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Die Animation konnte nicht geladen werden.");
    });
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => {
      cancelled = true;
      instance?.destroy();
      controller.current = null;
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    controller.current?.configure({ view, wire, arena, paused: paused || reducedMotion });
  }, [ready, view, wire, arena, paused, reducedMotion]);

  return (
    <main className={styles.study}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>KESSEL KRAWALL · ANIMATIONSPROBE</p>
            <h1>Stoff & Jubel</h1>
            <p>Ein wehender Turnierbanner und ein Alchemistenfan auf der Tribüne.</p>
          </div>
          <a href="../">Zum Spiel</a>
        </header>

        <div className={styles.views} aria-label="Ansicht wählen">
          {([["together", "Zusammen"], ["banner", "Banner"], ["spectator", "Zuschauer"]] as const).map(([key, label]) => (
            <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>
          ))}
          <button className={styles.arenaButton} aria-pressed={arena} onClick={() => setArena(!arena)}>
            {arena ? "Nahansicht zeigen" : "In der Arena ansehen"}
          </button>
        </div>

        <div className={styles.stage} ref={host} role="img"
          aria-label="Animierter violetter Stoffbanner und dunkle Zuschauersilhouette mit beweglichen Armen"
          data-ready={ready} data-paused={paused || reducedMotion}>
          {!ready && <p className={styles.loading} role="status">{error || "Bildteile und Animation werden geladen …"}</p>}
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} disabled={!ready || reducedMotion || paused || view === "banner"}
            onClick={() => controller.current?.cheer()}>Jubel abspielen</button>
          <button disabled={!ready || reducedMotion || paused || view === "spectator"}
            onClick={() => controller.current?.gust()}>Windstoß</button>
          <button disabled={!ready || reducedMotion} aria-pressed={paused} onClick={() => setPaused(!paused)}>
            {paused ? "Fortsetzen" : "Pausieren"}
          </button>
          <label><input type="checkbox" checked={wire} onChange={(event) => setWire(event.target.checked)} /> Bewegungsraster zeigen</label>
        </div>
        {reducedMotion && <p className={styles.motionNote}>Deine Einstellung für reduzierte Bewegung ist aktiv. Die Vorschau steht still.</p>}
        <div className={styles.notes}>
          <p><strong>Stoffbanner</strong>Die Aufhängung bleibt fest. Wellen laufen durch den Stoff; der Saum folgt verzögert.</p>
          <p><strong>Zuschauer</strong>Ruhiges Atmen und Kopfbewegungen. Beim Jubel: kurz ausholen, Arme heben, versetzt nachwippen und weich ausklingen.</p>
        </div>
        <p className={styles.motionNote}><a href="../arenaprobe">Neue Arena mit Feuer, Licht und Stoff ansehen →</a></p>
      </div>
    </main>
  );
}
