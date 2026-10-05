import { Container, Graphics, MeshSimple, Sprite, Texture } from "pixi.js";
import type { SpectatorPose } from "./arenaMotion";

export const COLS = 15;
export const ROWS = 29;

export function plane(texture: Texture, width: number, height: number) {
  const vertices = new Float32Array(COLS * ROWS * 2);
  const uvs = new Float32Array(vertices.length);
  const indices: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = (row * COLS + col) * 2;
      vertices[i] = col / (COLS - 1) * width;
      vertices[i + 1] = row / (ROWS - 1) * height;
      uvs[i] = col / (COLS - 1);
      uvs[i + 1] = row / (ROWS - 1);
      if (row < ROWS - 1 && col < COLS - 1) {
        const corner = row * COLS + col;
        indices.push(corner, corner + 1, corner + COLS, corner + 1, corner + COLS + 1, corner + COLS);
      }
    }
  }
  return new MeshSimple({ texture, vertices, uvs, indices: new Uint32Array(indices) });
}

function part(texture: Texture, width: number, height: number, x: number, y: number, anchorY = .15) {
  const sprite = new Sprite(texture);
  sprite.anchor.set(.5, anchorY);
  sprite.width = width;
  sprite.height = height;
  sprite.position.set(x, y);
  return sprite;
}

/** Independently articulated upper/lower arms, overlapping at the joint caps. */
export function makeSpectator(textures: Record<string, Texture>) {
  const root = new Container();
  const body = new Container();
  root.addChild(body);
  const left = new Container();
  left.position.set(-50, -105);
  const leftLower = new Container();
  leftLower.position.set(0, 73);
  left.addChild(part(textures["upper-left"], 68, 112, 0, 0));
  leftLower.addChild(part(textures["forearm-left"], 59, 111, 0, 0));
  left.addChild(leftLower);
  const right = new Container();
  right.position.set(50, -105);
  const rightLower = new Container();
  rightLower.position.set(0, 73);
  right.addChild(part(textures["upper-right"], 68, 112, 0, 0));
  rightLower.addChild(part(textures["forearm-right"], 59, 111, 0, 0));
  right.addChild(rightLower);
  const torso = part(textures.torso, 137, 180, 0, 34, 1);
  const head = new Container();
  head.position.set(0, -140);
  head.addChild(part(textures.hood, 159, 167, -3, 8, 1));
  body.addChild(left, right, torso, head);
  const rig = new Graphics();
  root.addChild(rig);

  function pose(value: SpectatorPose, showRig: boolean) {
    body.rotation = value.lean;
    body.y = value.rise;
    body.scale.y = value.stretch;
    head.rotation = value.head;
    left.rotation = value.leftArm;
    leftLower.rotation = value.leftElbow;
    right.rotation = value.rightArm;
    rightLower.rotation = value.rightElbow;
    rig.clear();
    rig.visible = showRig;
    if (showRig) {
      const world = (item: Container, x: number, y: number) => root.toLocal(item.toGlobal({ x, y }));
      for (const [upper, lower] of [[left, leftLower], [right, rightLower]]) {
        const shoulder = world(upper, 0, 0);
        const elbow = world(lower, 0, 0);
        const wrist = world(lower, 0, 78);
        rig.moveTo(shoulder.x, shoulder.y).lineTo(elbow.x, elbow.y).lineTo(wrist.x, wrist.y)
          .stroke({ color: 0xffcf79, width: 2, alpha: .85 });
        for (const point of [shoulder, elbow, wrist]) rig.circle(point.x, point.y, 4).fill(0xffd387);
      }
      const neck = world(head, 0, 0);
      const hip = world(body, 0, 0);
      rig.moveTo(hip.x, hip.y).lineTo(neck.x, neck.y).stroke({ color: 0xffcf79, width: 2, alpha: .8 });
    }
  }
  return { root, pose };
}
