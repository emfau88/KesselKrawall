"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { AtmosphereController, AtmosphereSettings } from "./arenaAtmosphereRenderer";

export const ArenaAtmosphere = memo(function ArenaAtmosphere({ paused, celebration, preview = false, life = true }: {
  paused: boolean;
  celebration: string | null;
  preview?: boolean;
  life?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<AtmosphereController | null>(null);
  const latestSettings = useRef<AtmosphereSettings>({ paused, celebration, life });
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let instance: AtmosphereController | undefined;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    const folder = `${location.href.replace(/[?#].*$/, "").replace(/\/$/, "")}/`;
    const assetBase = preview ? new URL("../assets/animation/", folder) : undefined;
    import("./arenaAtmosphereRenderer").then(({ createArenaAtmosphere }) => createArenaAtmosphere(element, assetBase))
      .then((result) => {
        instance = result;
        if (cancelled) { result.destroy(); return; }
        controller.current = result;
        result.configure({ ...latestSettings.current, paused: latestSettings.current.paused || media.matches });
        setReady(true);
      }).catch(() => {
        // Decorative rendering must never interrupt the game on unsupported devices.
        if (!cancelled) element.dataset.renderer = "unavailable";
      });
    return () => {
      cancelled = true;
      media.removeEventListener("change", update);
      instance?.destroy();
      controller.current = null;
    };
  }, [preview]);

  useEffect(() => {
    latestSettings.current = { paused: paused || reducedMotion, celebration, life };
    controller.current?.configure(latestSettings.current);
  }, [ready, paused, reducedMotion, celebration, life]);

  return <div className="arena-atmosphere" ref={host} aria-hidden="true"
    data-ready={ready} data-motion-paused={paused || reducedMotion} />;
});
