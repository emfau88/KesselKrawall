import {
  Application, Assets, Container, Graphics, Sprite, Texture,
} from "pixi.js";
import { blendPoses, CHEER_DURATION, cheerPose, clothVertex, idlePose, windGust } from "../game/arenaMotion";

import { COLS, ROWS, plane, makeSpectator } from "../game/arenaSceneParts";

export type StudyView = "together" | "banner" | "spectator";
type Configuration = { view: StudyView; arena: boolean; wire: boolean; paused: boolean };
export type StudyController = {
  configure: (settings: Configuration) => void;
  cheer: () => void;
  gust: () => void;
  destroy: () => void;
};



function asset(name: string) {
  const folder = `${location.href.replace(/[?#].*$/, "").replace(/\/$/, "")}/`;
  return new URL(`../assets/${name}`, folder).href;
}

export async function createStudy(host: HTMLElement): Promise<StudyController> {
  const app = new Application();
  await app.init({ backgroundAlpha: 0, antialias: true, autoStart: false,
    preference: "webgl", resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true,
    width: host.clientWidth, height: host.clientHeight });
  try {
    const [bannerTexture, arenaTexture, ...parts] = await Promise.all([
      Assets.load<Texture>(asset("animation/tournament-cloth-banner-v1.webp")),
      Assets.load<Texture>(asset("backgrounds/tournament-arena.webp")),
      ...["hood", "torso", "upper-left", "upper-right", "forearm-left", "forearm-right"].map(
        (name) => Assets.load<Texture>(asset(`animation/spectator-${name}-${name === "torso" ? "v2" : "v1"}.webp`))),
    ]);
    const textures = Object.fromEntries(["hood", "torso", "upper-left", "upper-right", "forearm-left", "forearm-right"]
      .map((name, index) => [name, parts[index]]));
    host.appendChild(app.canvas);
    const scene = new Container();
    app.stage.addChild(scene);
    const backdrop = new Sprite(arenaTexture);
    const shade = new Graphics();
    scene.addChild(backdrop, shade);
    const bannerGroup = new Container();
    const clothWidth = 228;
    const clothHeight = clothWidth * bannerTexture.height / bannerTexture.width;
    const cloth = plane(bannerTexture, clothWidth, clothHeight);
    const grid = new Graphics();
    bannerGroup.addChild(cloth, grid);
    const spectator = makeSpectator(textures);
    const rail = new Graphics();
    scene.addChild(bannerGroup, spectator.root, rail);

    let settings: Configuration = { view: "together", arena: false, wire: false, paused: false };
    let time = 0;
    let cheerStart = -Infinity;
    let gustStart = -Infinity;
    let entryPose = idlePose(0);
    let currentPose = entryPose;
    let destroyed = false;
    let width = 1080;
    let height = 600;

    function layout() {
      if (destroyed) return;
      const screenW = host.clientWidth;
      const screenH = host.clientHeight;
      if (!screenW || !screenH) return;
      app.renderer.resize(screenW, screenH);
      const portrait = screenH > screenW;
      width = portrait ? 700 : 1080;
      height = portrait ? 900 : 600;
      scene.scale.set(screenW / width, screenH / height);
      const backgroundScale = Math.max(width / arenaTexture.width, height / arenaTexture.height);
      backdrop.scale.set(backgroundScale);
      backdrop.position.set((width - backdrop.width) / 2, (height - backdrop.height) / 2);
      backdrop.visible = settings.arena;
      shade.clear();
      if (settings.arena) shade.rect(0, 0, width, height).fill({ color: 0x100d19, alpha: .19 });

      const together = settings.view === "together";
      bannerGroup.visible = settings.view !== "spectator";
      spectator.root.visible = settings.view !== "banner";
      rail.visible = spectator.root.visible;
      if (settings.arena) {
        bannerGroup.scale.set(portrait ? .76 : .7);
        bannerGroup.position.set(portrait ? 95 : 140, portrait ? 180 : 30);
        spectator.root.scale.set(portrait ? .73 : .6);
        spectator.root.position.set(portrait ? 490 : 900, portrait ? 770 : 530);
        spectator.root.alpha = .83;
      } else {
        spectator.root.alpha = 1;
        bannerGroup.scale.set(together ? 1 : (portrait ? 1.4 : 1.05));
        bannerGroup.position.set(together ? (portrait ? 85 : 150) : (width - clothWidth * bannerGroup.scale.x) / 2,
          together ? (portrait ? 70 : 42) : (height - clothHeight * bannerGroup.scale.y) / 2);
        spectator.root.scale.set(together ? (portrait ? 1.2 : 1.2) : (portrait ? 1.85 : 1.4));
        spectator.root.position.set(together ? (portrait ? 492 : 765) : width / 2,
          together ? (portrait ? 700 : 493) : (portrait ? 700 : 505));
      }
      rail.clear();
      const scale = spectator.root.scale.x;
      const railX = spectator.root.x - 160 * scale;
      const railY = spectator.root.y;
      const railW = 320 * scale;
      rail.roundRect(railX, railY, railW, 23 * scale, 5 * scale)
        .fill(0x3b2a32).stroke({ color: 0x8b6647, width: 2 * scale });
      rail.rect(railX + 6 * scale, railY + 24 * scale, railW - 12 * scale, 50 * scale).fill(0x19151e);
      rail.moveTo(railX + 12 * scale, railY + 6 * scale).lineTo(railX + railW - 12 * scale, railY + 6 * scale)
        .stroke({ color: 0xc39151, width: 2 * scale, alpha: .65 });
      for (let i = 0; i < 5; i++) {
        rail.roundRect(railX + (30 + i * 60) * scale, railY + 23 * scale, 12 * scale, 45 * scale, 2 * scale)
          .fill(0x4e3840);
      }
    }

    function draw() {
      const cheering = time - cheerStart;
      const idle = idlePose(time);
      if (cheering >= 0 && cheering < CHEER_DURATION) {
        currentPose = cheerPose(cheering);
        if (cheering < .25) currentPose = blendPoses(entryPose, currentPose, cheering / .25);
        if (cheering > 3.4) currentPose = blendPoses(currentPose, idle, (cheering - 3.4) / (CHEER_DURATION - 3.4));
      } else currentPose = idle;
      spectator.pose(currentPose, settings.wire);
      const gust = windGust(time - gustStart);
      const vertices = cloth.vertices;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const i = (row * COLS + col) * 2;
          const [x, y] = clothVertex(col / (COLS - 1) * clothWidth,
            row / (ROWS - 1) * clothHeight, clothWidth, clothHeight, time, gust);
          vertices[i] = x;
          vertices[i + 1] = y;
        }
      }
      grid.clear();
      grid.visible = settings.wire && bannerGroup.visible;
      if (grid.visible) {
        for (let row = 0; row < ROWS; row += 2) {
          for (let col = 0; col < COLS; col++) {
            const i = (row * COLS + col) * 2;
            if (col === 0) grid.moveTo(vertices[i], vertices[i + 1]);
            else grid.lineTo(vertices[i], vertices[i + 1]);
          }
          grid.stroke({ color: 0xffd889, width: .7, alpha: .5 });
        }
        for (let col = 0; col < COLS; col += 2) {
          for (let row = 0; row < ROWS; row++) {
            const i = (row * COLS + col) * 2;
            if (row === 0) grid.moveTo(vertices[i], vertices[i + 1]);
            else grid.lineTo(vertices[i], vertices[i + 1]);
          }
          grid.stroke({ color: 0xffd889, width: .7, alpha: .5 });
        }
      }
      host.dataset.animationState = cheering < CHEER_DURATION ? "cheer" : "idle";
      host.dataset.motionTime = time.toFixed(3);
      app.render();
    }

    const resize = new ResizeObserver(() => { layout(); draw(); });
    resize.observe(host);
    const tick = (ticker: { deltaMS: number }) => {
      if (destroyed || document.hidden || settings.paused) return;
      time += Math.min(ticker.deltaMS / 1000, .05);
      draw();
    };
    app.ticker.maxFPS = 60;
    app.ticker.add(tick);
    const visibility = () => {
      if (document.hidden || settings.paused) app.stop();
      else app.start();
    };
    document.addEventListener("visibilitychange", visibility);
    layout();
    draw();
    app.start();
    return {
      configure(next) {
        settings = next;
        layout();
        draw();
        visibility();
      },
      cheer() {
        if (settings.paused) return;
        entryPose = { ...currentPose };
        cheerStart = time;
      },
      gust() { if (!settings.paused) gustStart = time; },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        resize.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        app.destroy(true, { children: true, texture: false, textureSource: false });
      },
    };
  } catch (error) {
    app.destroy(true, { children: true, texture: false, textureSource: false });
    throw error;
  }
}
