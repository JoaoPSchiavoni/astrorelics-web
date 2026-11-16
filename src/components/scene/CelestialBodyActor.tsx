import React, { MutableRefObject, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SPACE_ARTIFACTS, SPACE_ARTIFACT_ORDER } from '../../config/spaceArtifacts';
import {
  CelestialBodyConfig,
  CelestialBodyId,
  ExperienceState,
  SpaceArtifactId,
  ViewportTier,
} from '../../types/experience';
import { LoadedCelestialAsset } from '../../utils/modelPreloader';
import { getLocalizedBody, useLanguage } from '../../utils/i18n';
import {
  computeAllTransitionTransforms,
  getSlotTransform,
} from '../../utils/orbitalTransitionMath';
import { FallbackCelestialSphere } from './FallbackCelestialSphere';
import { AtmosphereHalo } from './AtmosphereHalo';
import { ExplorationDragState } from './ExplorationControls';
import { TravelRuntimeState } from './HyperspaceTransition';
import { ArtifactPinMarker, latLonToVector3 } from './ArtifactSceneActors';

interface CelestialBodyActorProps {
  config: CelestialBodyConfig;
  asset: LoadedCelestialAsset | undefined;
  selectedId: CelestialBodyId;
  highlightedId: CelestialBodyId | null;
  activeArtifactId: SpaceArtifactId | null;
  experienceState: ExperienceState;
  viewportTier: ViewportTier;
  reducedMotion: boolean;
  dragStateRef: MutableRefObject<ExplorationDragState>;
  travelRef: MutableRefObject<TravelRuntimeState>;
  onHighlightBody: (id: CelestialBodyId) => void;
  onInitiateTravel: (id: CelestialBodyId) => void;
  onSelectArtifact: (id: SpaceArtifactId) => void;
}

export const CelestialBodyActor: React.FC<CelestialBodyActorProps> = ({
  config,
  asset,
  selectedId,
  highlightedId,
  activeArtifactId,
  experienceState,
  viewportTier,
  reducedMotion,
  dragStateRef,
  travelRef,
  onHighlightBody,
  onInitiateTravel,
  onSelectArtifact,
}) => {
  const { viewport, gl } = useThree();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const localizedBody = getLocalizedBody(config.id, lang);
  const rootGroupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const [isHovered, setIsHovered] = useState(false);
  const lastClickTimeRef = useRef<number>(0);
  const idleSpinAngleRef = useRef<number>(0);

  const isSelected = selectedId === config.id;
  const isHighlighted = !isSelected && (highlightedId === config.id || isHovered);

  // Filtra os artefatos que estão pousados na superfície deste corpo celeste (Lua ou Marte)
  const surfaceArtifacts = useMemo(
    () =>
      SPACE_ARTIFACT_ORDER.map((id) => SPACE_ARTIFACTS[id]).filter(
        (a) =>
          a.placementType === 'body-surface' &&
          a.relatedBodyId === config.id &&
          Boolean(a.surfaceLatLon)
      ),
    [config.id]
  );

  const clonedModelScene = useMemo(() => {
    if (asset?.source === 'glb' && asset.normalizedGroup) {
      return asset.normalizedGroup.clone(true);
    }
    return null;
  }, [asset]);

  const targetPosVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const group = rootGroupRef.current;
    const spinGroup = spinGroupRef.current;
    if (!group || !spinGroup) return;

    const travel = travelRef.current;
    const inspectingArtifact =
      Boolean(activeArtifactId) ||
      Boolean(travel.isTraveling && travel.targetArtifactId);

    if (travel.isTraveling && !travel.isArtifactJump) {
      const allTransforms = computeAllTransitionTransforms(
        travel,
        viewportTier,
        viewport.aspect,
        reducedMotion
      );
      const currentTransform = allTransforms[config.id];

      group.position.x = THREE.MathUtils.damp(
        group.position.x,
        currentTransform.position[0],
        16,
        safeDelta
      );
      group.position.y = THREE.MathUtils.damp(
        group.position.y,
        currentTransform.position[1],
        16,
        safeDelta
      );
      group.position.z = THREE.MathUtils.damp(
        group.position.z,
        currentTransform.position[2],
        16,
        safeDelta
      );
      const dampedScale = THREE.MathUtils.damp(
        group.scale.x,
        currentTransform.scale,
        16,
        safeDelta
      );
      group.scale.setScalar(dampedScale);
    } else {
      const assignedSlot = travel.toSlots[config.id];
      const target = getSlotTransform(
        config,
        assignedSlot,
        viewportTier,
        viewport.aspect
      );

      // Quando um objeto 3D está em inspeção, recua suavemente os corpos celestes para o fundo
      if (inspectingArtifact) {
        const pushX =
          assignedSlot === 'center'
            ? viewportTier === 'desktop'
              ? -4.6
              : -2.4
            : target.position[0] * 1.15;
        const pushY =
          assignedSlot === 'center' ? -1.45 : target.position[1] * 1.05;
        const pushZ = assignedSlot === 'center' ? -6.8 : target.position[2] - 2.5;
        targetPosVec.set(pushX, pushY, pushZ);
      } else {
        targetPosVec.set(target.position[0], target.position[1], target.position[2]);
      }

      group.position.x = THREE.MathUtils.damp(group.position.x, targetPosVec.x, 7.5, safeDelta);
      group.position.y = THREE.MathUtils.damp(group.position.y, targetPosVec.y, 7.5, safeDelta);
      group.position.z = THREE.MathUtils.damp(group.position.z, targetPosVec.z, 7.5, safeDelta);

      const desiredScale = inspectingArtifact
        ? target.scale * (assignedSlot === 'center' ? 0.34 : 0.72)
        : target.scale * (isHighlighted ? 1.07 : 1.0);

      const nextScale = THREE.MathUtils.damp(group.scale.x, desiredScale, 7.5, safeDelta);
      group.scale.setScalar(nextScale);
    }

    if (
      !reducedMotion &&
      (!isSelected || inspectingArtifact || !dragStateRef.current.isDragging)
    ) {
      const transitionSpinBoost = travel.isTraveling
        ? Math.sin(travel.progress * Math.PI) * 0.65
        : 0;
      idleSpinAngleRef.current += (config.idleRotationSpeed + transitionSpinBoost) * safeDelta;
    }

    if (isSelected && !inspectingArtifact) {
      const targetPitch = config.initialRotation[0] + dragStateRef.current.userRotationOffset.x;
      const targetYaw =
        config.initialRotation[1] +
        dragStateRef.current.userRotationOffset.y +
        idleSpinAngleRef.current;

      spinGroup.rotation.x = THREE.MathUtils.damp(spinGroup.rotation.x, targetPitch, 12, safeDelta);
      spinGroup.rotation.y = THREE.MathUtils.damp(spinGroup.rotation.y, targetYaw, 12, safeDelta);
      spinGroup.rotation.z = THREE.MathUtils.damp(
        spinGroup.rotation.z,
        config.initialRotation[2],
        8,
        safeDelta
      );
    } else {
      spinGroup.rotation.x = THREE.MathUtils.damp(
        spinGroup.rotation.x,
        config.initialRotation[0],
        5,
        safeDelta
      );
      spinGroup.rotation.y = config.initialRotation[1] + idleSpinAngleRef.current;
      spinGroup.rotation.z = config.initialRotation[2];
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += safeDelta * 0.35;
    }
  });

  const isRecentDrag = () => {
    return (
      dragStateRef.current.isDragging ||
      performance.now() - dragStateRef.current.lastDragEndTime < 150
    );
  };

  const handleBackgroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (experienceState !== 'exploring' || (isSelected && !activeArtifactId)) return;
    if (isRecentDrag()) return;

    const now = performance.now();
    const deltaClick = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    // No mobile ou se o planeta já estiver destacado, o toque inicia a viagem diretamente sem exigir duplo clique rápido
    if (
      viewportTier === 'mobile' ||
      highlightedId === config.id ||
      (deltaClick > 20 && deltaClick < 380)
    ) {
      onInitiateTravel(config.id);
      return;
    }

    onHighlightBody(config.id);
  };

  const handleBackgroundDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (experienceState !== 'exploring' || (isSelected && !activeArtifactId)) return;
    if (isRecentDrag()) return;

    onInitiateTravel(config.id);
  };

  return (
    <group ref={rootGroupRef} name={`celestial-actor-${config.id}`}>
      {/* Esfera de colisão generosa */}
      <mesh
        scale={isSelected && !activeArtifactId ? 1.01 : 1.42}
        onClick={handleBackgroundClick}
        onDoubleClick={handleBackgroundDoubleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (experienceState !== 'exploring' || (isSelected && !activeArtifactId)) return;
          setIsHovered(true);
          gl.domElement.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setIsHovered(false);
          if (!dragStateRef.current.isDragging) {
            gl.domElement.style.cursor = experienceState === 'exploring' ? 'grab' : 'default';
          }
        }}
      >
        <sphereGeometry args={[1.0, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Grupo com inclinação axial e rotação interativa do corpo celeste + Pins de superfície */}
      <group rotation={[0, 0, config.axialTilt * 0.25]}>
        <group ref={spinGroupRef}>
          {clonedModelScene ? (
            <primitive object={clonedModelScene} />
          ) : (
            <FallbackCelestialSphere config={config} />
          )}

          {/* Pins 3D com ícones cartoonizados fixados nas coordenadas de pouso na Lua e em Marte */}
          {surfaceArtifacts.map((artifact) => {
            const [lat, lon] = artifact.surfaceLatLon!;
            const pos = latLonToVector3(lat, lon, 1.07);
            const stemEnd = latLonToVector3(lat, lon, 1.0);
            const isCompactScreen =
              viewportTier === 'mobile' ||
              (viewport.aspect > 1.05 && gl.domElement.clientHeight < 500);
            // Em telas de smartphone, oculta os pins HTML nos planetas ao fundo para não encavalar
            // com o rótulo do astro distante; ao selecionar o planeta (ou no desktop/tablet), eles aparecem.
            const showPinHtml = isSelected || !isCompactScreen;
            return (
              <group key={artifact.id}>
                {/* Ponto luminoso na superfície onde o equipamento foi deixado */}
                <mesh position={stemEnd} raycast={() => null}>
                  <sphereGeometry args={[0.028, 12, 12]} />
                  <meshBasicMaterial color={artifact.accentColor} />
                </mesh>
                {showPinHtml && (
                  <group position={pos}>
                    <ArtifactPinMarker
                      artifact={artifact}
                      activeArtifactId={activeArtifactId}
                      experienceState={experienceState}
                      compact={!isSelected}
                      onSelectArtifact={onSelectArtifact}
                    />
                  </group>
                )}
              </group>
            );
          })}
        </group>
      </group>

      {/* Halo atmosférico discreto para Terra e Marte */}
      <AtmosphereHalo atmosphere={config.atmosphere} />

      {/* Anel orbital sutil de marcação quando o corpo está ao fundo */}
      {!isSelected && !activeArtifactId && experienceState === 'exploring' && (
        <mesh ref={ringRef} scale={isHighlighted ? 1.28 : 1.18} raycast={() => null}>
          <ringGeometry args={[0.98, 1.015, 48]} />
          <meshBasicMaterial
            color={isHighlighted ? '#38BDF8' : '#64748B'}
            transparent
            opacity={isHighlighted ? 0.72 : 0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Marcador espacial dos corpos ao fundo */}
      {!isSelected && !activeArtifactId && experienceState === 'exploring' && (
        <Html
          position={[0, -1.32, 0]}
          center
          zIndexRange={[10, 0]}
          style={{
            pointerEvents: 'auto',
            userSelect: 'none',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (experienceState !== 'exploring') return;
              const now = performance.now();
              if (
                viewportTier === 'mobile' ||
                highlightedId === config.id ||
                now - lastClickTimeRef.current < 380
              ) {
                onInitiateTravel(config.id);
              } else {
                onHighlightBody(config.id);
              }
              lastClickTimeRef.current = now;
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (experienceState !== 'exploring') return;
              onInitiateTravel(config.id);
            }}
            className={`group flex flex-col items-center cursor-pointer transition-all duration-200 ${
              isHighlighted ? 'scale-105' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <button
              type="button"
              aria-label={
                isEn
                  ? `Travel to ${localizedBody.name}`
                  : `Viajar para ${localizedBody.name}`
              }
              className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-3.5 py-1.5 sm:px-2.5 sm:py-1 rounded-full backdrop-blur-md border transition-colors flex items-center justify-center gap-1.5 ${
                isHighlighted
                  ? 'bg-[#08152C]/95 border-sky-400/80 text-white shadow-[0_0_20px_rgba(56,189,248,0.28)]'
                  : 'bg-[#040915]/85 border-slate-700/70 text-slate-100 hover:border-sky-400/50'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isHighlighted ? 'bg-sky-400 animate-pulse' : 'bg-sky-400/75'
                }`}
              />
              <span className="text-xs font-display font-semibold tracking-wide whitespace-nowrap">
                {localizedBody.name}
              </span>
            </button>

            {isHighlighted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInitiateTravel(config.id);
                }}
                className="mt-1.5 px-2.5 py-1 rounded-md bg-[#061022]/95 border border-sky-400/50 text-[11px] text-sky-300 font-medium whitespace-nowrap shadow-lg animate-fadeIn"
              >
                {viewportTier === 'mobile'
                  ? isEn
                    ? 'Tap to travel →'
                    : 'Toque para viajar →'
                  : isEn
                  ? 'Click to travel →'
                  : 'Clique para viajar →'}
              </button>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
