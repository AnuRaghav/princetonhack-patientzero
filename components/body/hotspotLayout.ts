import type { CuratedCaseSlug } from "@/lib/curatedCases";

/** Which avatar rig to align spheres to — sim lab uses `default`. */
export type BodyLayoutPresetId = "default" | CuratedCaseSlug;

type LayoutNumbers = {
  headYFrac: number;
  headZFrac: number;
  chestYFrac: number;
  stomachYFrac: number;
  depthMidFrac: number;
  depthStomachFrac: number;
  relArm: number;
  relLeg: number;
  relShoulderJ: number;
  relKneeJ: number;
  legSpread: number;
  kneeSpread: number;
  yArms: number;
  yLegs: number;
  yShoulderJ: number;
  yKneeJ: number;
  lateralCap: number;
  rHead: number;
  rChest: number;
  rStomach: number;
  rArm: number;
  rLeg: number;
  rJoint: number;
};

const BASE: LayoutNumbers = {
  headYFrac: 1.03,
  headZFrac: 0.54,
  chestYFrac: 0.87,
  stomachYFrac: 0.74,
  depthMidFrac: 0.54,
  depthStomachFrac: 0.46,
  relArm: 0.22,
  relLeg: 0.15,
  relShoulderJ: 0.2,
  relKneeJ: 0.13,
  legSpread: 1.1,
  kneeSpread: 1.05,
  yArms: 0.87,
  yLegs: 0.47,
  yShoulderJ: 0.76,
  yKneeJ: 0.34,
  lateralCap: 0.26,
  rHead: 0.055,
  rChest: 0.072,
  rStomach: 0.068,
  rArm: 0.054,
  rLeg: 0.058,
  rJoint: 0.038,
};

/** Fine-tune per GLB rig — tweak these until spheres sit on mesh in orbit view. */
const PRESET: Partial<Record<CuratedCaseSlug, Partial<LayoutNumbers>>> = {
  "maria-wolf": {
    relArm: 0.2,
    relLeg: 0.14,
    relShoulderJ: 0.19,
    relKneeJ: 0.125,
    yArms: 0.89,
    yLegs: 0.46,
    yShoulderJ: 0.775,
    yKneeJ: 0.33,
    depthMidFrac: 0.52,
    depthStomachFrac: 0.44,
    headYFrac: 1.04,
  },
  "jason-mehta": {
    relArm: 0.24,
    relLeg: 0.16,
    relShoulderJ: 0.21,
    relKneeJ: 0.135,
    yArms: 0.86,
    yLegs: 0.48,
    yShoulderJ: 0.755,
    yKneeJ: 0.35,
    depthMidFrac: 0.55,
    chestYFrac: 0.865,
    stomachYFrac: 0.735,
  },
};

export type ModelBounds = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
};

export type HotspotLayout = {
  head: { position: [number, number, number]; radius: number };
  chest: { position: [number, number, number]; radius: number };
  stomach: { position: [number, number, number]; radius: number };
  armsLeft: { position: [number, number, number]; radius: number };
  armsRight: { position: [number, number, number]; radius: number };
  legsLeft: { position: [number, number, number]; radius: number };
  legsRight: { position: [number, number, number]; radius: number };
  jointsShoulderLeft: { position: [number, number, number]; radius: number };
  jointsShoulderRight: { position: [number, number, number]; radius: number };
  jointsKneeLeft: { position: [number, number, number]; radius: number };
  jointsKneeRight: { position: [number, number, number]; radius: number };
};

function mergePreset(preset: BodyLayoutPresetId): LayoutNumbers {
  if (preset === "default") return { ...BASE };
  const delta = PRESET[preset];
  return { ...BASE, ...delta };
}

function pos(x: number, y: number, z: number): [number, number, number] {
  return [x, y, z];
}

/**
 * Place hotspots from mesh AABB. Lateral spots use midline ± torso-scaled offsets so T-pose
 * wingspan does not push markers into empty space.
 */
export function computeHotspotLayout(bounds: ModelBounds, preset: BodyLayoutPresetId): HotspotLayout {
  const p = mergePreset(preset);
  const [minX, minY, minZ] = bounds.min;
  const [sizeX, sizeY, sizeZ] = bounds.size;

  const cx = minX + sizeX * 0.5;
  const midDepth = minZ + sizeZ * p.depthMidFrac;
  const stomachDepth = minZ + sizeZ * p.depthStomachFrac;

  const lateralFromTorso = (relToHeight: number) =>
    Math.min(sizeY * relToHeight, sizeX * p.lateralCap);

  const latArm = lateralFromTorso(p.relArm);
  const latLeg = lateralFromTorso(p.relLeg);
  const latShoulderJoint = lateralFromTorso(p.relShoulderJ);
  const latKneeJoint = lateralFromTorso(p.relKneeJ);

  const at = (x: number, y: number, z: number): [number, number, number] => [
    minX + sizeX * x,
    minY + sizeY * y,
    minZ + sizeZ * z,
  ];

  return {
    head: { position: at(0.5, p.headYFrac, p.headZFrac), radius: sizeY * p.rHead },
    chest: { position: pos(cx, minY + sizeY * p.chestYFrac, midDepth), radius: sizeY * p.rChest },
    stomach: {
      position: pos(cx, minY + sizeY * p.stomachYFrac, stomachDepth),
      radius: sizeY * p.rStomach,
    },
    armsLeft: {
      position: pos(cx - latArm, minY + sizeY * p.yArms, midDepth),
      radius: sizeY * p.rArm,
    },
    armsRight: {
      position: pos(cx + latArm, minY + sizeY * p.yArms, midDepth),
      radius: sizeY * p.rArm,
    },
    legsLeft: {
      position: pos(cx - latLeg * p.legSpread, minY + sizeY * p.yLegs, midDepth),
      radius: sizeY * p.rLeg,
    },
    legsRight: {
      position: pos(cx + latLeg * p.legSpread, minY + sizeY * p.yLegs, midDepth),
      radius: sizeY * p.rLeg,
    },
    jointsShoulderLeft: {
      position: pos(cx - latShoulderJoint, minY + sizeY * p.yShoulderJ, midDepth),
      radius: sizeY * p.rJoint,
    },
    jointsShoulderRight: {
      position: pos(cx + latShoulderJoint, minY + sizeY * p.yShoulderJ, midDepth),
      radius: sizeY * p.rJoint,
    },
    jointsKneeLeft: {
      position: pos(cx - latKneeJoint * p.kneeSpread, minY + sizeY * p.yKneeJ, midDepth),
      radius: sizeY * p.rJoint,
    },
    jointsKneeRight: {
      position: pos(cx + latKneeJoint * p.kneeSpread, minY + sizeY * p.yKneeJ, midDepth),
      radius: sizeY * p.rJoint,
    },
  };
}
