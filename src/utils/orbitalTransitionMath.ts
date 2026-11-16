import * as THREE from 'three';
import { CELESTIAL_BODIES, CELESTIAL_BODY_ORDER } from '../config/celestialBodies';
import {
  CelestialBodyConfig,
  CelestialBodyId,
  OrbitalSlot,
  SlotAssignmentMap,
  ViewportTier,
} from '../types/experience';
import { TravelRuntimeState } from '../components/scene/HyperspaceTransition';

export interface BodyTransformResult {
  position: [number, number, number];
  scale: number;
}

const CAMERA_Z = 8.2;
const TWO_PI_OVER_3 = (Math.PI * 2) / 3; // 120 graus

export const INITIAL_SLOT_ASSIGNMENTS: SlotAssignmentMap = {
  earth: 'center',
  moon: 'left',
  mars: 'right',
};

/**
 * Posições cardeais do plano orbital (0° em primeiro plano, -120° à esquerda ao fundo, +120° à direita ao fundo).
 * Mantemos uma inclinação orbital suave e contínua para que a translação ocorra naturalmente
 * em profundidade (eixo X-Z), passando por trás (-Z) e pela frente (+Z), nunca por cima.
 */
const CANONICAL_SLOTS: Record<
  OrbitalSlot,
  Record<ViewportTier, [number, number, number]>
> = {
  center: {
    desktop: [0.28, 0.05, 0.0],
    tablet: [0.0, 0.06, 0.0],
    mobile: [0.0, 0.08, 0.0],
  },
  left: {
    desktop: [-4.15, 0.68, -5.2],
    tablet: [-3.25, 0.55, -5.1],
    mobile: [-1.35, 1.98, -4.9],
  },
  right: {
    desktop: [4.0, -0.52, -5.2],
    tablet: [3.25, -0.42, -5.1],
    mobile: [1.35, 1.98, -4.9],
  },
};

export function slotToAngle(slot: OrbitalSlot): number {
  if (slot === 'center') return 0;
  if (slot === 'left') return -TWO_PI_OVER_3;
  return TWO_PI_OVER_3;
}

/**
 * Calcula a translação orbital de 120° para todos os 3 corpos quando `destinationId` é selecionado:
 * todos os 3 astros transladam juntos ao longo do plano orbital (um vem pela frente para o primeiro plano,
 * o anterior recua pela lateral e o terceiro passa por trás em profundidade -Z).
 */
export function computeRotatedSlotAssignments(
  currentSlots: SlotAssignmentMap,
  destinationId: CelestialBodyId
): { nextSlots: SlotAssignmentMap; deltaAngle: number } {
  const destSlot = currentSlots[destinationId];
  if (destSlot === 'center') {
    return { nextSlots: { ...currentSlots }, deltaAngle: 0 };
  }

  const rotatePositive = destSlot === 'left';
  const deltaAngle = rotatePositive ? TWO_PI_OVER_3 : -TWO_PI_OVER_3;

  const rotateSingleSlot = (slot: OrbitalSlot): OrbitalSlot => {
    if (rotatePositive) {
      if (slot === 'left') return 'center';
      if (slot === 'center') return 'right';
      return 'left';
    } else {
      if (slot === 'right') return 'center';
      if (slot === 'center') return 'left';
      return 'right';
    }
  };

  return {
    nextSlots: {
      earth: rotateSingleSlot(currentSlots.earth),
      moon: rotateSingleSlot(currentSlots.moon),
      mars: rotateSingleSlot(currentSlots.mars),
    },
    deltaAngle,
  };
}

/**
 * Calcula os 3 pontos cardeais da órbita (`center`, `left`, `right`) ajustados para a tela atual.
 */
function getClampedCardinalPoints(
  viewportTier: ViewportTier,
  aspect: number
): Record<OrbitalSlot, [number, number, number]> {
  const isMobileLandscape = viewportTier === 'mobile' && aspect > 1.05;
  const effectiveTier: ViewportTier = isMobileLandscape ? 'tablet' : viewportTier;

  const centerPos = CANONICAL_SLOTS.center[effectiveTier];
  const rawLeft = CANONICAL_SLOTS.left[effectiveTier];
  const rawRight = CANONICAL_SLOTS.right[effectiveTier];

  const clampXAtZ = (x: number, z: number) => {
    const distFromCam = CAMERA_Z - z;
    const halfHeight = distFromCam * Math.tan(THREE.MathUtils.degToRad(21));
    const halfWidth = halfHeight * aspect;
    const safeMaxX = Math.max(0.88, halfWidth - 0.56);
    return THREE.MathUtils.clamp(x, -safeMaxX, safeMaxX);
  };

  return {
    center: [centerPos[0], centerPos[1], centerPos[2]],
    left: [clampXAtZ(rawLeft[0], rawLeft[2]), rawLeft[1], rawLeft[2]],
    right: [clampXAtZ(rawRight[0], rawRight[2]), rawRight[1], rawRight[2]],
  };
}

/**
 * Avalia a elipse orbital 3D pura no espaço (X, Y, Z) para qualquer ângulo `theta`.
 * - Não eleva artificialmente o eixo Y ("não passa por cima").
 * - No arco frontal (`cos(theta) > -0.5`), o astro passa pela frente (Z próximo de 0).
 * - No arco traseiro (`cos(theta) < -0.5`), o astro passa por trás em profundidade (Z até -8.2),
 *   permitindo que o astro em primeiro plano passe naturalmente na frente dos outros sem colisão 3D.
 */
export function evaluateOrbitalEllipse(
  theta: number,
  config: CelestialBodyConfig,
  viewportTier: ViewportTier,
  aspect: number
): BodyTransformResult {
  const pts = getClampedCardinalPoints(viewportTier, aspect);
  const PF = pts.center;
  const PL = pts.left;
  const PR = pts.right;

  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const sqrt3 = Math.sqrt(3);

  // Interpolação trigonométrica exata da elipse 3D pelos 3 pontos cardeais (0, -2pi/3, +2pi/3)
  const ax = (PF[0] + PL[0] + PR[0]) / 3;
  const ay = (PF[1] + PL[1] + PR[1]) / 3;
  const az = (PF[2] + PL[2] + PR[2]) / 3;

  const bx = (2 * PF[0] - PL[0] - PR[0]) / 3;
  const by = (2 * PF[1] - PL[1] - PR[1]) / 3;
  const bz = (2 * PF[2] - PL[2] - PR[2]) / 3;

  const cx = (PR[0] - PL[0]) / sqrt3;
  const cy = (PR[1] - PL[1]) / sqrt3;
  const cz = (PR[2] - PL[2]) / sqrt3;

  // Profundidade extra suave no arco traseiro (-Z) para garantir que a passagem por trás
  // tenha amplo distanciamento tridimensional em relação ao astro que está na frente
  const backDepthMask = cosT < -0.5 ? (-0.5 - cosT) / 0.5 : 0;
  const extraBackDepthZ = -1.35 * backDepthMask;

  const x = ax + bx * cosT + cx * sinT;
  const y = ay + by * cosT + cy * sinT;
  const z = az + bz * cosT + cz * sinT + extraBackDepthZ;

  // Escala contínua ao longo da translação: máxima na frente (theta = 0) e reduzida ao passar por trás
  const fgScaleFactor =
    viewportTier === 'mobile' ? 0.62 : viewportTier === 'tablet' ? 0.88 : 1.0;
  const bgScaleFactor =
    viewportTier === 'mobile' ? 0.66 : viewportTier === 'tablet' ? 0.88 : 1.0;

  const fgScale = config.foregroundRadius * fgScaleFactor;
  const bgScale = config.backgroundRadius * bgScaleFactor;

  const frontWeight = THREE.MathUtils.clamp((cosT + 0.5) / 1.5, 0, 1);
  // Curva harmônica suave para o crescimento/encolhimento durante a translação
  const smoothScaleWeight = frontWeight * frontWeight * (3 - 2 * frontWeight);
  const farBackFactor = 1.0 - backDepthMask * 0.16;

  const scale = THREE.MathUtils.lerp(bgScale * farBackFactor, fgScale, smoothScaleWeight);

  return {
    position: [x, y, z],
    scale,
  };
}

/**
 * Calcula a posição e escala estacionárias de um corpo celeste de acordo com seu slot orbital.
 */
export function getSlotTransform(
  config: CelestialBodyConfig,
  slot: OrbitalSlot,
  viewportTier: ViewportTier,
  aspect: number
): BodyTransformResult {
  return evaluateOrbitalEllipse(slotToAngle(slot), config, viewportTier, aspect);
}

/**
 * Calcula a translação orbital conjunta e suave dos 3 corpos celestes durante uma transição.
 * Utiliza interpolação harmônica cosseno (`0.5 - 0.5 * cos(p * PI)`) sem forças bruscas,
 * fazendo com que os astros passem suavemente pela frente e por trás uns dos outros.
 */
export function computeAllTransitionTransforms(
  travel: TravelRuntimeState,
  viewportTier: ViewportTier,
  aspect: number,
  _reducedMotion: boolean
): Record<CelestialBodyId, BodyTransformResult> {
  const p = THREE.MathUtils.clamp(travel.progress, 0, 1);
  // Curva harmônica pura (cosseno) combinada com smoothstep para aceleração e chegada ultra suaves
  const cosineT = 0.5 - 0.5 * Math.cos(p * Math.PI);
  const smoothAngularT = 0.5 - 0.5 * Math.cos(cosineT * Math.PI);

  const startAngleDest = slotToAngle(travel.fromSlots[travel.toId]);
  const deltaOrbitAngle = startAngleDest < 0 ? TWO_PI_OVER_3 : -TWO_PI_OVER_3;

  const result = {} as Record<CelestialBodyId, BodyTransformResult>;

  for (const id of CELESTIAL_BODY_ORDER) {
    const config = CELESTIAL_BODIES[id];
    const startTheta = slotToAngle(travel.fromSlots[id]);
    const currentTheta = startTheta + deltaOrbitAngle * smoothAngularT;

    result[id] = evaluateOrbitalEllipse(currentTheta, config, viewportTier, aspect);
  }

  return result;
}
