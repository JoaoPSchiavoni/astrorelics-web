import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SPACE_ARTIFACTS } from './config/spaceArtifacts';
import {
  CelestialBodyId,
  ExperienceState,
  SpaceArtifactId,
  TravelPhase,
} from './types/experience';
import { useDeviceProfile } from './hooks/useDeviceProfile';
import { useBackNavigation } from './hooks/useBackNavigation';
import {
  LoadedCelestialAsset,
  loadSpaceArtifactModel,
  preloadAllCelestialModels,
} from './utils/modelPreloader';
import {
  computeRotatedSlotAssignments,
  INITIAL_SLOT_ASSIGNMENTS,
} from './utils/orbitalTransitionMath';
import { soundEffects } from './utils/soundEffects';
import { SpaceExperienceCanvas } from './components/scene/SpaceExperienceCanvas';
import { ExplorationDragState } from './components/scene/ExplorationControls';
import { TravelRuntimeState } from './components/scene/HyperspaceTransition';
import { HeaderHud } from './components/ui/HeaderHud';
import { DestinationInfoPanel } from './components/ui/DestinationInfoPanel';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { WebGLFallbackScreen } from './components/ui/WebGLFallbackScreen';
import { MissionButton } from './components/ui/MissionButton';
import {
  ActiveMissionMode,
  MissionOverlayPanel,
} from './components/ui/MissionOverlayPanel';
import { getEchoesSignals } from './config/missions/echoesOfSpaceConfig';
import { OPPORTUNITY_MISSION } from './config/missions/opportunityMission';
import {
  EchoesHotspot3D,
  EchoesPersistedState,
  EchoesSignalId,
} from './types/echoesMission';
import { MissionId } from './types/mission';
import {
  loadEchoesState,
  resetEchoesState,
  saveEchoesState,
} from './utils/echoesProgress';
import {
  Language,
  LanguageContext,
  loadLanguage,
  saveLanguage,
} from './utils/i18n';
import {
  loadUnlockedEndings,
  saveUnlockedEnding,
  UnlockedEndingsMap,
} from './utils/missionProgress';

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export const App: React.FC = () => {
  const [webglSupported] = useState<boolean>(() => checkWebGLSupport());

  const [experienceState, setExperienceState] = useState<ExperienceState>('loading');
  const [selectedId, setSelectedId] = useState<CelestialBodyId>('earth');
  const [highlightedId, setHighlightedId] = useState<CelestialBodyId | null>(null);
  const [targetTravelId, setTargetTravelId] = useState<CelestialBodyId | null>(null);
  const [travelPhase, setTravelPhase] = useState<TravelPhase>('idle');
  const [activeArtifactId, setActiveArtifactId] = useState<SpaceArtifactId | null>(null);

  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [loadStatusLabel, setLoadStatusLabel] = useState<string>('Inicializando telemetria...');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedAssets, setLoadedAssets] = useState<
    Partial<Record<CelestialBodyId, LoadedCelestialAsset>>
  >({});

  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => soundEffects.isEnabled());

  // Inicializa a trilha de fundo oficial (áudio contínuo de 10 min)
  useEffect(() => {
    const cleanup = soundEffects.initAutoPlay((active) => {
      setAudioEnabled(active);
    });

    return () => {
      cleanup();
    };
  }, []);

  const {
    viewportTier,
    isLandscapeMobile,
    reducedMotion,
    isLowPower,
  } = useDeviceProfile();

  const [hasInteracted3D, setHasInteracted3D] = useState<boolean>(false);

  const handleUserInteractionStart = useCallback(() => {
    setHasInteracted3D(true);
  }, []);

  const dragStateRef = useRef<ExplorationDragState>({
    userRotationOffset: new THREE.Vector2(0, 0),
    targetRotationOffset: new THREE.Vector2(0, 0),
    userZoom: 1.0,
    targetZoom: 1.0,
    isDragging: false,
    lastDragEndTime: 0,
  });

  const parallaxOffsetRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

  const travelRef = useRef<TravelRuntimeState>({
    isTraveling: false,
    elapsed: 0,
    duration: 1.55,
    progress: 0,
    warpIntensity: 0,
    phase: 'idle',
    fromId: 'earth',
    toId: 'earth',
    fromSlots: { ...INITIAL_SLOT_ASSIGNMENTS },
    toSlots: { ...INITIAL_SLOT_ASSIGNMENTS },
    targetArtifactId: null,
    isArtifactJump: false,
  });

  const runPreload = useCallback(async (force = false) => {
    setExperienceState('loading');
    setLoadProgress(0);
    setLoadError(null);

    try {
      const assets = await preloadAllCelestialModels((state) => {
        setLoadProgress(state.progress);
        setLoadStatusLabel(state.currentLabel);
        setLoadedAssets(state.assets);
      }, force);

      setLoadedAssets(assets);
      setLoadProgress(100);
      setLoadStatusLabel('Telemetria visual pronta');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os modelos 3D dos corpos celestes.';
      setLoadError(msg);
      setExperienceState('error');
    }
  }, []);

  useEffect(() => {
    if (webglSupported) {
      runPreload(false);
    }
  }, [webglSupported, runPreload]);

  const handleContinueWithProvisional = useCallback(() => {
    setLoadedAssets({
      earth: { id: 'earth', source: 'provisional-sphere', resolvedPath: null, normalizedGroup: null },
      moon: { id: 'moon', source: 'provisional-sphere', resolvedPath: null, normalizedGroup: null },
      mars: { id: 'mars', source: 'provisional-sphere', resolvedPath: null, normalizedGroup: null },
    });
    setLoadError(null);
    setExperienceState('exploring');
  }, []);

  const handleHighlightBody = useCallback((id: CelestialBodyId | null) => {
    setHighlightedId((prev) => {
      if (id && id !== prev) {
        soundEffects.playHighlightPing();
      }
      return id;
    });
  }, []);

  const handleResetOrientation = useCallback(() => {
    if (experienceState !== 'exploring') return;
    dragStateRef.current.targetRotationOffset.set(0, 0);
    dragStateRef.current.targetZoom = 1.0;
    parallaxOffsetRef.current.set(0, 0);
    soundEffects.playResetTone();
  }, [experienceState]);

  // Inicia viagem espacial para outro corpo celeste (ou retorna de um artefato 3D para o planeta)
  const handleInitiateTravel = useCallback(
    (destinationId: CelestialBodyId) => {
      if (experienceState !== 'exploring' || travelRef.current.isTraveling) {
        return;
      }

      // Se já estamos nesse planeta e apenas fechando um artefato 3D, retorna imediatamente com suavidade
      if (destinationId === selectedId && activeArtifactId !== null) {
        dragStateRef.current.targetRotationOffset.set(0, 0);
        dragStateRef.current.userRotationOffset.set(0, 0);
        dragStateRef.current.targetZoom = 1.0;
        parallaxOffsetRef.current.set(0, 0);
        setActiveArtifactId(null);
        soundEffects.playResetTone();
        return;
      }

      if (destinationId === selectedId && activeArtifactId === null) {
        return;
      }

      const duration = reducedMotion ? 0.65 : 1.35;

      dragStateRef.current.targetRotationOffset.set(0, 0);
      dragStateRef.current.userRotationOffset.set(0, 0);
      dragStateRef.current.targetZoom = 1.0;
      parallaxOffsetRef.current.set(0, 0);

      const currentSlots = { ...travelRef.current.toSlots };
      const { nextSlots } = computeRotatedSlotAssignments(currentSlots, destinationId);

      travelRef.current = {
        isTraveling: true,
        elapsed: 0,
        duration,
        progress: 0,
        warpIntensity: 0,
        phase: 'acceleration',
        fromId: selectedId,
        toId: destinationId,
        fromSlots: currentSlots,
        toSlots: nextSlots,
        targetArtifactId: null,
        isArtifactJump: false,
      };

      setActiveArtifactId(null);
      setHighlightedId(null);
      setTargetTravelId(destinationId);
      setTravelPhase('acceleration');
      setExperienceState('traveling');

      if (!reducedMotion) {
        soundEffects.playHyperspaceTravel(duration);
      } else {
        soundEffects.playHighlightPing();
      }
    },
    [experienceState, selectedId, activeArtifactId, reducedMotion]
  );

  // Inicia salto na velocidade da luz estilo Star Wars rumo ao objeto 3D selecionado
  const handleSelectArtifact = useCallback(
    (artifactId: SpaceArtifactId) => {
      if (
        experienceState !== 'exploring' ||
        travelRef.current.isTraveling ||
        activeArtifactId === artifactId
      ) {
        return;
      }

      // Garante que o modelo 3D esteja carregando/em cache imediatamente
      void loadSpaceArtifactModel(artifactId);

      const artifact = SPACE_ARTIFACTS[artifactId];
      const destinationBodyId = artifact.relatedBodyId;
      const duration = reducedMotion ? 0.55 : 0.85;

      dragStateRef.current.targetRotationOffset.set(0, 0);
      dragStateRef.current.userRotationOffset.set(0, 0);
      dragStateRef.current.targetZoom = 1.0;
      parallaxOffsetRef.current.set(0, 0);

      const currentSlots = { ...travelRef.current.toSlots };
      const { nextSlots } = computeRotatedSlotAssignments(currentSlots, destinationBodyId);

      travelRef.current = {
        isTraveling: true,
        elapsed: 0,
        duration,
        progress: 0,
        warpIntensity: 0,
        phase: 'acceleration',
        fromId: selectedId,
        toId: destinationBodyId,
        fromSlots: currentSlots,
        toSlots: nextSlots,
        targetArtifactId: artifactId,
        isArtifactJump: true,
      };

      setHighlightedId(null);
      setTargetTravelId(destinationBodyId);
      setTravelPhase('acceleration');
      setExperienceState('traveling');

      if (!reducedMotion) {
        soundEffects.playHyperspaceTravel(duration);
      } else {
        soundEffects.playHighlightPing();
      }
    },
    [experienceState, selectedId, activeArtifactId, reducedMotion]
  );

  const handleCloseArtifact = useCallback(() => {
    if (experienceState !== 'exploring') return;
    dragStateRef.current.targetRotationOffset.set(0, 0);
    dragStateRef.current.userRotationOffset.set(0, 0);
    dragStateRef.current.targetZoom = 1.0;
    parallaxOffsetRef.current.set(0, 0);
    setActiveArtifactId(null);
    soundEffects.playResetTone();
  }, [experienceState]);

  const handleTravelComplete = useCallback(
    (destinationId: CelestialBodyId, targetArtifactId?: SpaceArtifactId | null) => {
      setSelectedId(destinationId);
      setActiveArtifactId(targetArtifactId ?? null);
      setTargetTravelId(null);
      setTravelPhase('idle');
      setExperienceState('exploring');
    },
    []
  );

  const handleToggleAudio = useCallback(() => {
    const next = soundEffects.setEnabled(!soundEffects.isEnabled());
    setAudioEnabled(next);
  }, []);

  const [lang, setLangState] = useState<Language>(() => loadLanguage());

  const handleSetLang = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    saveLanguage(nextLang);
  }, []);

  const handleToggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'pt' ? 'en' : 'pt';
      saveLanguage(next);
      return next;
    });
  }, []);

  const [isMissionPanelOpen, setIsMissionPanelOpen] = useState<boolean>(false);
  const [activeMissionMode, setActiveMissionMode] =
    useState<ActiveMissionMode>('echoes_of_space');
  const [hasActiveMissionRun, setHasActiveMissionRun] = useState<boolean>(false);
  const [unlockedEndings, setUnlockedEndings] = useState<UnlockedEndingsMap>(() =>
    loadUnlockedEndings()
  );

  // Estado persistente e controles de "AstroRelics: Ecos do Espaço"
  const [echoesState, setEchoesState] = useState<EchoesPersistedState>(() =>
    loadEchoesState()
  );
  const [activeEchoesSignalId, setActiveEchoesSignalId] =
    useState<EchoesSignalId | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  // Por padrão, as pistas começam ocultas para manter o mistério (o usuário pode clicar no botão para mostrá-las)
  const [revealCluesList, setRevealCluesList] = useState<boolean>(false);

  const handleUpdateEchoesState = useCallback(
    (updater: (prev: EchoesPersistedState) => EchoesPersistedState) => {
      setEchoesState((prev) => {
        const next = updater(prev);
        return saveEchoesState(next);
      });
    },
    []
  );

  const handleResetEchoes = useCallback(() => {
    const fresh = resetEchoesState();
    setEchoesState(fresh);
    setActiveEchoesSignalId(null);
    setSelectedHotspotId(null);
    setRevealCluesList(false);
  }, []);

  const handleInspectHotspot = useCallback(
    (hotspot: EchoesHotspot3D) => {
      soundEffects.playMissionClick();
      setSelectedHotspotId(hotspot.id);

      // Orienta suavemente o modelo 3D até o ponto de interesse inspecionado
      dragStateRef.current.targetRotationOffset.set(
        hotspot.targetRotation[0],
        hotspot.targetRotation[1]
      );

      handleUpdateEchoesState((prev) => {
        const existing = prev.discoveredClues[hotspot.signalId] ?? [];
        if (existing.includes(hotspot.id)) return prev;
        return {
          ...prev,
          discoveredClues: {
            ...prev.discoveredClues,
            [hotspot.signalId]: [...existing, hotspot.id],
          },
        };
      });
    },
    [handleUpdateEchoesState]
  );

  const handleToggleMissionPanel = useCallback(() => {
    soundEffects.playMissionClick();
    setIsMissionPanelOpen((prev) => !prev);
  }, []);

  useBackNavigation({
    activeArtifactId,
    isMissionPanelOpen,
    onCloseMissionPanel: () => setIsMissionPanelOpen(false),
    onCloseArtifact: handleCloseArtifact,
  });

  const handleUnlockEnding = useCallback((missionId: MissionId, endingId: string) => {
    const updated = saveUnlockedEnding(missionId, endingId);
    setUnlockedEndings(updated);
  }, []);

  if (!webglSupported) {
    return <WebGLFallbackScreen />;
  }

  const opportunityUnlockedCount =
    unlockedEndings.opportunity_deep_journey?.length ?? 0;

  const localizedEchoesSignals = getEchoesSignals(lang);
  const activeEchoesSignal = activeEchoesSignalId
    ? localizedEchoesSignals[activeEchoesSignalId]
    : null;

  const activeHotspotsFor3D =
    isMissionPanelOpen &&
    activeMissionMode === 'echoes_of_space' &&
    activeEchoesSignal &&
    activeArtifactId === activeEchoesSignal.relatedArtifactId
      ? activeEchoesSignal.hotspots
      : [];

  const discoveredHotspotIdsFor3D = activeEchoesSignalId
    ? echoesState.discoveredClues[activeEchoesSignalId] ?? []
    : [];

  const isUnidentifiedInvestigationMode = Boolean(
    isMissionPanelOpen &&
      activeMissionMode === 'echoes_of_space' &&
      activeEchoesSignal &&
      activeArtifactId === activeEchoesSignal.relatedArtifactId &&
      !echoesState.reconstructedSignals.includes(activeEchoesSignal.id)
  );

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang: handleSetLang,
        toggleLang: handleToggleLang,
      }}
    >
      <div className="relative w-full h-full overflow-hidden bg-[#02040A]">
        {(experienceState === 'loading' || experienceState === 'error') && (
          <LoadingScreen
            progress={loadProgress}
            statusLabel={loadStatusLabel}
            errorMessage={loadError}
            onRetry={() => runPreload(true)}
            onContinueWithFallback={handleContinueWithProvisional}
            onFinishTransition={() => setExperienceState('exploring')}
          />
        )}

        <SpaceExperienceCanvas
          selectedId={selectedId}
          highlightedId={highlightedId}
          activeArtifactId={activeArtifactId}
          experienceState={experienceState}
          viewportTier={viewportTier}
          reducedMotion={reducedMotion}
          loadedAssets={loadedAssets}
          dragStateRef={dragStateRef}
          parallaxOffsetRef={parallaxOffsetRef}
          travelRef={travelRef}
          onHighlightBody={handleHighlightBody}
          onInitiateTravel={handleInitiateTravel}
          onSelectArtifact={handleSelectArtifact}
          onTravelPhaseChange={setTravelPhase}
          onTravelComplete={handleTravelComplete}
          onUserInteractionStart={handleUserInteractionStart}
          activeHotspots={activeHotspotsFor3D}
          discoveredHotspotIds={discoveredHotspotIdsFor3D}
          selectedHotspotId={selectedHotspotId}
          revealCluesList={revealCluesList}
          onSelectHotspot={handleInspectHotspot}
          isLowPower={isLowPower}
        />

        <HeaderHud
          selectedId={selectedId}
          targetTravelId={targetTravelId}
          experienceState={experienceState}
          travelPhase={travelPhase}
          audioEnabled={audioEnabled}
          reducedMotion={reducedMotion}
          onSelectDestination={handleInitiateTravel}
          onToggleAudio={handleToggleAudio}
          isMissionOpen={isMissionPanelOpen}
          echoesReconstructedCount={echoesState.reconstructedSignals.length}
          hasActiveMissionRun={hasActiveMissionRun}
          onToggleMission={handleToggleMissionPanel}
          isLandscapeMobile={isLandscapeMobile}
        />

        {experienceState !== 'loading' && experienceState !== 'error' && (
          <>
            <MissionButton
              isOpen={isMissionPanelOpen}
              echoesReconstructedCount={echoesState.reconstructedSignals.length}
              unlockedCount={opportunityUnlockedCount}
              totalEndings={OPPORTUNITY_MISSION.endingOrder.length}
              hasActiveRun={hasActiveMissionRun}
              onToggle={handleToggleMissionPanel}
              isLandscapeMobile={isLandscapeMobile}
            />

            <MissionOverlayPanel
              isOpen={isMissionPanelOpen}
              activeMissionMode={activeMissionMode}
              onSelectMissionMode={setActiveMissionMode}
              unlockedEndings={unlockedEndings}
              activeArtifactId={activeArtifactId}
              echoesState={echoesState}
              activeEchoesSignalId={activeEchoesSignalId}
              selectedHotspotId={selectedHotspotId}
              revealCluesList={revealCluesList}
              onToggleRevealCluesList={() => setRevealCluesList((prev) => !prev)}
              onSelectEchoesSignal={(sigId) => {
                setActiveEchoesSignalId(sigId);
                setSelectedHotspotId(null);
                setRevealCluesList(false);
              }}
              onInspectHotspot={handleInspectHotspot}
              onUpdateEchoesState={handleUpdateEchoesState}
              onResetEchoes={handleResetEchoes}
              onClose={() => setIsMissionPanelOpen(false)}
              onFocusArtifact={handleSelectArtifact}
              onUnlockEnding={handleUnlockEnding}
              onActiveRunChange={setHasActiveMissionRun}
              onResetOrientation={handleResetOrientation}
            />
          </>
        )}

        <DestinationInfoPanel
          selectedId={selectedId}
          highlightedId={highlightedId}
          activeArtifactId={activeArtifactId}
          experienceState={experienceState}
          loadedAsset={loadedAssets[selectedId]}
          onResetOrientation={handleResetOrientation}
          onTravelToHighlighted={handleInitiateTravel}
          onSelectArtifact={handleSelectArtifact}
          onCloseArtifact={handleCloseArtifact}
          unidentifiedInvestigationMode={isUnidentifiedInvestigationMode}
          unidentifiedSignalTitle={
            activeEchoesSignal
              ? `${activeEchoesSignal.signalCode}: “${activeEchoesSignal.unidentifiedTitle}”`
              : undefined
          }
          isMissionPanelOpen={isMissionPanelOpen}
          hasInteracted3D={hasInteracted3D}
          isLandscapeMobile={isLandscapeMobile}
        />
      </div>
    </LanguageContext.Provider>
  );
};

export default App;
