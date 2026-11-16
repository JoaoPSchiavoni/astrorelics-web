import React, { MutableRefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CelestialBodyId,
  SlotAssignmentMap,
  SpaceArtifactId,
  TravelPhase,
} from '../../types/experience';
import { getBaseFov } from '../../utils/cameraFraming';

export interface TravelRuntimeState {
  isTraveling: boolean;
  elapsed: number;
  duration: number;
  progress: number;
  warpIntensity: number;
  phase: TravelPhase;
  fromId: CelestialBodyId;
  toId: CelestialBodyId;
  fromSlots: SlotAssignmentMap;
  toSlots: SlotAssignmentMap;
  /** Quando definido, a viagem em velocidade da luz leva o usuário ao objeto 3D (ou retorna dele) */
  targetArtifactId?: SpaceArtifactId | null;
  /** Indica salto estilo Star Wars Hyperdrive rumo a um artefato 3D */
  isArtifactJump?: boolean;
}

interface HyperspaceTransitionProps {
  travelRef: MutableRefObject<TravelRuntimeState>;
  reducedMotion: boolean;
  streakCount?: number;
  onPhaseChange: (phase: TravelPhase) => void;
  onTravelComplete: (
    destinationId: CelestialBodyId,
    targetArtifactId?: SpaceArtifactId | null
  ) => void;
}

interface StreakParticle {
  x: number;
  y: number;
  z: number;
  speed: number;
  thickness: number;
  lengthFactor: number;
}

export const HyperspaceTransition: React.FC<HyperspaceTransitionProps> = ({
  travelRef,
  reducedMotion,
  streakCount = 520,
  onPhaseChange,
  onTravelComplete,
}) => {
  const { camera, size } = useThree();
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const tunnelGlowRef = useRef<THREE.Mesh>(null);
  const lastPhaseRef = useRef<TravelPhase>('idle');

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { particles, material, tunnelMaterial } = useMemo(() => {
    const list: StreakParticle[] = [];
    let seed = 9876543;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < streakCount; i++) {
      // Túnel cilíndrico estilo Star Wars Hyperdrive envolvendo toda a visão da câmera
      const angle = rand() * Math.PI * 2;
      const radius = 1.05 + Math.pow(rand(), 0.72) * 13.5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.82;
      const z = -68 + rand() * 75;
      const speed = 48 + rand() * 56;
      const thickness = 0.012 + rand() * 0.022;
      const lengthFactor = 0.75 + rand() * 1.15;

      list.push({ x, y, z, speed, thickness, lengthFactor });
    }

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#E0F2FE'),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const tMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#38BDF8'),
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { particles: list, material: mat, tunnelMaterial: tMat };
  }, [streakCount]);

  // Cores estelares estilo Star Wars (branco incandescente, azul-hiperespaço e ciano)
  React.useLayoutEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh) return;

    const palette = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#F0F9FF'),
      new THREE.Color('#BAE6FD'),
      new THREE.Color('#38BDF8'),
      new THREE.Color('#60A5FA'),
    ];

    for (let i = 0; i < streakCount; i++) {
      mesh.setColorAt(i, palette[i % palette.length]);
    }
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [streakCount]);

  useFrame((_, delta) => {
    const state = travelRef.current;
    const perspCam = camera as THREE.PerspectiveCamera;
    const aspect = size.height > 0 ? size.width / size.height : 1.0;
    const baseFov = getBaseFov(aspect);

    if (!state.isTraveling) {
      if (lastPhaseRef.current !== 'idle') {
        lastPhaseRef.current = 'idle';
      }
      state.warpIntensity = THREE.MathUtils.damp(state.warpIntensity, 0, 10, delta);
      if (Math.abs(perspCam.fov - baseFov) > 0.02) {
        perspCam.fov = THREE.MathUtils.damp(perspCam.fov, baseFov, 8, delta);
        perspCam.updateProjectionMatrix();
      }
      if (instancedRef.current) {
        instancedRef.current.visible = false;
      }
      if (tunnelGlowRef.current) {
        tunnelGlowRef.current.visible = false;
      }
      return;
    }

    const safeDelta = Math.min(delta, 0.05);
    state.elapsed += safeDelta;
    const rawProgress = Math.min(1, state.elapsed / state.duration);
    state.progress = rawProgress;

    let nextPhase: TravelPhase = 'acceleration';
    if (rawProgress >= 0.72) {
      nextPhase = 'arrival';
    } else if (rawProgress >= 0.27) {
      nextPhase = 'cruise';
    }

    if (nextPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = nextPhase;
      state.phase = nextPhase;
      onPhaseChange(nextPhase);
    }

    if (reducedMotion) {
      state.warpIntensity = 0;
      if (instancedRef.current) {
        instancedRef.current.visible = false;
      }
      if (tunnelGlowRef.current) {
        tunnelGlowRef.current.visible = false;
      }
    } else {
      let warp = 0;
      if (rawProgress < 0.27) {
        const t = rawProgress / 0.27;
        warp = t * t * (3 - 2 * t);
      } else if (rawProgress < 0.72) {
        warp = 1.0;
      } else {
        const t = (rawProgress - 0.72) / 0.28;
        const easeOut = 1 - Math.pow(1 - t, 3);
        warp = Math.max(0, 1 - easeOut);
      }

      state.warpIntensity = warp;
      const isJump = Boolean(state.isArtifactJump);

      // Efeito de câmera estilo salto na velocidade da luz (Star Wars Hyperdrive)
      const fovBoost = isJump ? 13.5 : 4.2;
      const targetFov = baseFov + warp * fovBoost;
      perspCam.fov = THREE.MathUtils.damp(perspCam.fov, targetFov, 8.0, safeDelta);
      perspCam.updateProjectionMatrix();

      const mesh = instancedRef.current;
      if (mesh) {
        mesh.visible = warp > 0.005;
        material.opacity = Math.min(0.96, warp * (isJump ? 0.96 : 0.85));

        const speedMultiplier = (isJump ? 0.35 : 0.18) + warp * (isJump ? 2.75 : 1.75);
        // No salto para artefatos, as estrelas se esticam em longos feixes de luz estilo Star Wars
        const streakStretch = 0.05 + Math.pow(warp, 1.25) * (isJump ? 18.5 : 7.2);

        for (let i = 0; i < streakCount; i++) {
          const p = particles[i];
          p.z += p.speed * speedMultiplier * safeDelta;
          if (p.z > 8.0) {
            p.z -= 72;
          }

          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.set(
            p.thickness * (isJump ? 1.25 : 1.0),
            p.thickness * (isJump ? 1.25 : 1.0),
            Math.max(0.04, streakStretch * p.lengthFactor)
          );
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }

      if (tunnelGlowRef.current) {
        tunnelGlowRef.current.visible = isJump && warp > 0.05;
        tunnelMaterial.opacity = isJump ? Math.pow(warp, 1.6) * 0.16 : 0;
        tunnelGlowRef.current.rotation.z += safeDelta * 1.8;
      }
    }

    if (rawProgress >= 1) {
      state.isTraveling = false;
      state.warpIntensity = 0;
      state.phase = 'idle';
      lastPhaseRef.current = 'idle';
      if (instancedRef.current) {
        instancedRef.current.visible = false;
      }
      if (tunnelGlowRef.current) {
        tunnelGlowRef.current.visible = false;
      }
      onTravelComplete(state.toId, state.targetArtifactId);
    }
  });

  return (
    <group name="hyperspace-starwars-effect">
      <instancedMesh
        ref={instancedRef}
        args={[undefined, undefined, streakCount]}
        material={material}
        visible={false}
        frustumCulled={false}
        raycast={() => null}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
};
