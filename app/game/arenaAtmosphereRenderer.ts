import { Application, Assets, Container, Graphics, Rectangle, RenderTexture, Sprite, Texture } from "pixi.js";
import { COLS, ROWS, plane } from "./arenaSceneParts";
import { clothVertex, windGust } from "./arenaMotion";
import { ARENA_BANNERS, ARENA_CANDLES, ARENA_FIRES, ARENA_LIGHTS, ARENA_VAPOR,
  candleMotion, emberAt, fitArenaPlate, lightStrength, vaporVertex } from "./arenaLife";
import flameAtlas from "../../public/assets/animation/brazier-flame-atlas-v1.json";
import vaporAtlas from "../../public/assets/animation/alchemy-vapor-atlas-v1.json";

export type AtmosphereSettings = { paused: boolean; celebration: string | null; life?: boolean };
export type AtmosphereController = {
  configure: (settings: AtmosphereSettings) => void;
  destroy: () => void;
};

export async function createArenaAtmosphere(host: HTMLElement, assetBase?: URL): Promise<AtmosphereController> {
  const app = new Application();
  await app.init({ backgroundAlpha: 0, antialias: true, autoStart: false,
    preference: "webgl", powerPreference: "low-power", resolution: Math.min(devicePixelRatio || 1, 2),
    autoDensity: true, width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) });
  const ownedTextures: Texture[] = [];
  const vaporTargets: RenderTexture[] = [];
  let lightTexture: Texture | undefined;
  try {
    const file = (name: string) => new URL(name, assetBase ?? new URL("assets/animation/", document.baseURI)).href;
    const [clothTexture, fireTexture, vaporTexture] = await Promise.all([
      Assets.load<Texture>(file("tournament-cloth-banner-v1.webp")),
      Assets.load<Texture>(file("brazier-flame-atlas-v1.webp")),
      Assets.load<Texture>(file("alchemy-vapor-atlas-v1.webp")),
    ]);
    const frames = flameAtlas.frames.map((_, index) => {
      const frame = new Texture({ source: fireTexture.source, frame: new Rectangle(
        index % flameAtlas.columns * flameAtlas.cellWidth,
        Math.floor(index / flameAtlas.columns) * flameAtlas.cellHeight,
        flameAtlas.cellWidth, flameAtlas.cellHeight,
      ) });
      ownedTextures.push(frame);
      return frame;
    });
    const vaporFrames = vaporAtlas.frames.map((_, index) => {
      const texture = new Texture({ source: vaporTexture.source, frame: new Rectangle(
        index % vaporAtlas.columns * vaporAtlas.cellWidth,
        Math.floor(index / vaporAtlas.columns) * vaporAtlas.cellHeight,
        vaporAtlas.cellWidth, vaporAtlas.cellHeight,
      ) });
      ownedTextures.push(texture);
      return texture;
    });
    // A soft light mask adds illumination without introducing a visible halo edge.
    const lightCanvas = document.createElement("canvas");
    lightCanvas.width = lightCanvas.height = 128;
    const context = lightCanvas.getContext("2d");
    if (!context) throw new Error("Light texture could not be created");
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,.4)");
    gradient.addColorStop(.18, "rgba(255,255,255,.2)");
    gradient.addColorStop(.5, "rgba(255,255,255,.055)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    lightTexture = Texture.from(lightCanvas);
    const world = new Container();
    const lights = ARENA_LIGHTS.map((source) => {
      const light = new Sprite(lightTexture);
      light.anchor.set(.5);
      light.position.set(source.x, source.y);
      light.width = source.width;
      light.height = source.lightHeight;
      light.tint = source.tint;
      light.blendMode = "add";
      world.addChild(light);
      return light;
    });
    const fires = ARENA_FIRES.map((source) => {
      const layers = [new Sprite(frames[0]), new Sprite(frames[0])];
      layers.forEach((fire) => {
        fire.position.set(source.x, source.y + 1);
        fire.scale.set(source.height / flameAtlas.referenceHeight);
        world.addChild(fire);
      });
      return layers;
    });
    const candles = ARENA_CANDLES.map((source) => {
      const flame = new Sprite(frames[0]);
      flame.position.set(source.x, source.y);
      flame.scale.set(source.height / flameAtlas.referenceHeight * .68, source.height / flameAtlas.referenceHeight);
      world.addChild(flame);
      return flame;
    });
    const furnace = new Container();
    furnace.position.set(1594, 187);
    const furnaceMask = new Graphics().ellipse(6, 0, 37, 63).fill(0xffffff);
    furnaceMask.rotation = .12;
    furnace.addChild(furnaceMask);
    const furnaceFires = [
      { x: 9, y: 55, height: 78, phase: .57 },
      { x: 25, y: 49, height: 55, phase: .91 },
    ].map((source) => {
      const flame = new Sprite(frames[0]);
      flame.position.set(source.x, source.y);
      flame.scale.set(source.height / flameAtlas.referenceHeight);
      flame.alpha = .24;
      flame.blendMode = "add";
      furnace.addChild(flame);
      return { flame, source };
    });
    furnace.mask = furnaceMask;
    world.addChild(furnace);
    const vapors = ARENA_VAPOR.map((source) => {
      const target = RenderTexture.create({ width: 256, height: 256, resolution: 1 });
      vaporTargets.push(target);
      const composite = new Container();
      const layers = [new Sprite(vaporFrames[0]), new Sprite(vaporFrames[0])];
      layers.forEach((vapor) => {
        vapor.position.set(128, 237);
        vapor.scale.set(256 / vaporAtlas.cellWidth);
        // Add the weighted images on a transparent target: exact premultiplied
        // interpolation, avoiding the opacity dips from two source-over sprites.
        vapor.blendMode = "add";
        composite.addChild(vapor);
      });
      const mesh = plane(target, 256, 256);
      const scale = source.height / (vaporAtlas.referenceHeight * 256 / vaporAtlas.cellHeight);
      mesh.scale.set(source.mirror ? -scale : scale, scale);
      mesh.position.set(source.x, source.y);
      mesh.alpha = .43;
      world.addChild(mesh);
      return { layers, target, composite, mesh };
    });
    const embers = Array.from({ length: 8 }, (_, index) => {
      const ember = new Sprite(Texture.WHITE);
      ember.anchor.set(.5);
      ember.width = 1 + index % 2 * .35;
      ember.height = 1.8 + index % 3 * .2;
      ember.tint = index % 2 ? 0xffd393 : 0xffa94b;
      ember.blendMode = "add";
      world.addChild(ember);
      return ember;
    });
    app.stage.addChild(world);
    const clothWidth = 228;
    const clothHeight = clothWidth * clothTexture.height / clothTexture.width;
    const bannerWorld = new Container();
    const banners = ARENA_BANNERS.map((source) => {
      const banner = plane(clothTexture, clothWidth, clothHeight);
      banner.scale.set(source.width / clothWidth);
      banner.position.set(source.x, source.y);
      banner.alpha = source.alpha;
      bannerWorld.addChild(banner);
      return banner;
    });
    app.stage.addChild(bannerWorld);
    host.appendChild(app.canvas);
    let time = 0;
    let gustStart = -Infinity;
    let lastCelebration: string | null = null;
    let settings: AtmosphereSettings = { paused: true, celebration: null };
    let destroyed = false;
    let compact = false;

    function layout() {
      if (destroyed) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      app.renderer.resize(w, h);
      compact = w < 600;
      app.ticker.maxFPS = compact ? 30 : 60;
      const fit = fitArenaPlate(w, h);
      world.scale.set(fit.scale);
      world.position.set(fit.x, fit.y);
      bannerWorld.scale.set(fit.scale);
      bannerWorld.position.set(fit.x, fit.y);
    }

    function draw(render = true) {
      const elapsed = time - gustStart;
      const gust = windGust(elapsed);
      banners.forEach((banner, index) => {
        const vertices = banner.vertices;
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            const i = (row * COLS + col) * 2;
            const [x, y] = clothVertex(col / (COLS - 1) * clothWidth,
              row / (ROWS - 1) * clothHeight, clothWidth, clothHeight, time + ARENA_BANNERS[index].phase, gust);
            vertices[i] = x;
            vertices[i + 1] = y;
          }
        }
      });
      const fireFrames: number[] = [];
      fires.forEach((layers, index) => {
        const source = ARENA_FIRES[index];
        const position = (time * (11.5 + index * .3) + source.phase * 12) % frames.length;
        const frame = Math.floor(position);
        // A brief dissolve takes the edge off adjacent painted frames and the loop seam.
        const mix = Math.max(0, (position % 1 - .65) / .35);
        layers.forEach((fire, layer) => {
          const cell = (frame + layer) % frames.length;
          fire.texture = frames[cell];
          fire.anchor.set(flameAtlas.frames[cell].anchorX, flameAtlas.frames[cell].anchorY);
          fire.alpha = .88 * (layer ? mix : 1 - mix);
        });
        fireFrames.push(frame);
      });
      candles.forEach((flame, index) => {
        const frame = Math.floor((time * (9.3 + index % 3 * .27) + index * 2.7) % frames.length);
        flame.texture = frames[frame];
        flame.anchor.set(flameAtlas.frames[frame].anchorX, flameAtlas.frames[frame].anchorY);
        const motion = candleMotion(time, index);
        const scale = ARENA_CANDLES[index].height / flameAtlas.referenceHeight;
        flame.scale.set(scale * .68, scale * motion.stretch);
        flame.rotation = motion.lean;
        flame.alpha = motion.alpha;
      });
      furnaceFires.forEach(({ flame, source }) => {
        const frame = Math.floor((time * 10.7 + source.phase * 12) % frames.length);
        flame.texture = frames[frame];
        flame.anchor.set(flameAtlas.frames[frame].anchorX, flameAtlas.frames[frame].anchorY);
        flame.alpha = .24 * lightStrength(time, source.phase);
      });
      const vaporCells: number[] = [];
      vapors.forEach(({ layers, target, composite, mesh }, index) => {
        const source = ARENA_VAPOR[index];
        const position = (time * 1.6 + source.phase) % vaporFrames.length;
        const frame = Math.floor(position);
        const mix = position % 1;
        layers.forEach((vapor, layer) => {
          const cell = (frame + layer) % vaporFrames.length;
          vapor.texture = vaporFrames[cell];
          vapor.anchor.set(vaporAtlas.frames[cell].anchorX, vaporAtlas.frames[cell].anchorY);
          vapor.alpha = layer ? mix : 1 - mix;
        });
        app.renderer.render({ container: composite, target, clear: true });
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            const i = (row * COLS + col) * 2;
            const [x, y] = vaporVertex(col / (COLS - 1) * 256, row / (ROWS - 1) * 256, time + source.phase);
            mesh.vertices[i] = x;
            mesh.vertices[i + 1] = y;
          }
        }
        vaporCells.push(frame);
      });
      lights.forEach((light, index) => {
        const source = ARENA_LIGHTS[index];
        light.alpha = source.strength * lightStrength(time, source.phase);
      });
      embers.forEach((ember, index) => {
        // One spark per bowl in a narrow arena; two per bowl on desktop.
        const source = ARENA_FIRES[index % ARENA_FIRES.length];
        const motion = emberAt(time, index);
        ember.visible = !compact || index < 4;
        ember.position.set(source.x + motion.x, source.y + motion.y);
        ember.alpha = motion.alpha;
      });
      host.dataset.motionTime = time.toFixed(3);
      host.dataset.animationState = gust > 0 ? "gust" : "idle";
      host.dataset.fireFrames = fireFrames.join(",");
      host.dataset.vaporFrames = vaporCells.join(",");
      if (render) app.render();
    }

    const resize = new ResizeObserver(() => { layout(); draw(); });
    resize.observe(host);
    const visibility = () => {
      if (settings.paused || document.hidden) app.stop();
      else app.start();
    };
    document.addEventListener("visibilitychange", visibility);
    app.ticker.maxFPS = 60;
    app.ticker.add((ticker) => {
      if (settings.paused || document.hidden || destroyed) return;
      time += Math.min(ticker.deltaMS / 1000, .05);
      draw(false);
    });
    layout();
    draw();
    return {
      configure(next) {
        settings = next;
        world.visible = next.life !== false;
        // A precomputed combat winner must never trigger this before presentation ends.
        if (next.celebration && next.celebration !== lastCelebration && !next.paused) {
          lastCelebration = next.celebration;
          gustStart = time;
        }
        draw();
        visibility();
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        resize.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        app.destroy(true, { children: true, texture: false, textureSource: false });
        ownedTextures.forEach((texture) => texture.destroy(false));
        vapors.forEach(({ composite }) => composite.destroy({ children: true, texture: false, textureSource: false }));
        vaporTargets.forEach((target) => target.destroy(true));
        lightTexture?.destroy(true);
      },
    };
  } catch (error) {
    app.destroy(true, { children: true, texture: false, textureSource: false });
    ownedTextures.forEach((texture) => texture.destroy(false));
    vaporTargets.forEach((target) => target.destroy(true));
    lightTexture?.destroy(true);
    throw error;
  }
}
