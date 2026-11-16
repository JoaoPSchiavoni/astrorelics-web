import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  BatteryCharging,
  ThermometerSnowflake,
  Database,
  Award,
  RotateCcw,
  Compass,
  Sparkles,
  AlertTriangle,
  Wind,
  Flame,
  CheckCircle2,
  Lock,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { getMissions, MISSION_ORDER } from '../../config/missions';
import {
  getEchoesPremise,
  getEchoesSignals,
} from '../../config/missions/echoesOfSpaceConfig';
import { SpaceArtifactId } from '../../types/experience';
import {
  EchoesHotspot3D,
  EchoesPersistedState,
  EchoesSignalId,
} from '../../types/echoesMission';
import {
  MissionChoice,
  MissionEnding,
  MissionEnvironmentMood,
  MissionId,
  MissionNode,
  MissionPathConfig,
  MissionTelemetryState,
} from '../../types/mission';
import { useLanguage } from '../../utils/i18n';
import { applyTelemetryDelta, UnlockedEndingsMap } from '../../utils/missionProgress';
import { soundEffects } from '../../utils/soundEffects';
import { ArtifactCartoonIcon } from './ArtifactCartoonIcons';
import { EchoesOfSpacePanel } from './EchoesOfSpacePanel';

export type ActiveMissionMode = 'echoes_of_space' | MissionId;

interface MissionOverlayPanelProps {
  isOpen: boolean;
  activeMissionMode: ActiveMissionMode;
  onSelectMissionMode: (mode: ActiveMissionMode) => void;
  unlockedEndings: UnlockedEndingsMap;
  activeArtifactId: SpaceArtifactId | null;
  echoesState: EchoesPersistedState;
  activeEchoesSignalId: EchoesSignalId | null;
  selectedHotspotId: string | null;
  revealCluesList: boolean;
  onToggleRevealCluesList: () => void;
  onSelectEchoesSignal: (signalId: EchoesSignalId | null) => void;
  onInspectHotspot: (hotspot: EchoesHotspot3D) => void;
  onUpdateEchoesState: (updater: (prev: EchoesPersistedState) => EchoesPersistedState) => void;
  onResetEchoes: () => void;
  onClose: () => void;
  onFocusArtifact: (artifactId: SpaceArtifactId) => void;
  onUnlockEnding: (missionId: MissionId, endingId: string) => void;
  onActiveRunChange: (hasActiveRun: boolean) => void;
  onResetOrientation?: () => void;
}

interface BreadcrumbEntry {
  nodeId: string;
  stepNumber: number;
  choiceCode: 'A' | 'B' | 'C';
  choiceSummary: string;
}

const MOOD_STYLES: Record<
  MissionEnvironmentMood,
  {
    border: string;
    badgeBg: string;
    badgeText: string;
    screenTint: string;
    icon: React.ReactNode;
  }
> = {
  normal: {
    border: 'border-sky-400/40',
    badgeBg: 'bg-sky-500/15 border-sky-400/35',
    badgeText: 'text-sky-200',
    screenTint: 'opacity-0',
    icon: <Radio className="w-3.5 h-3.5 text-sky-400" />,
  },
  dust: {
    border: 'border-amber-400/60',
    badgeBg: 'bg-amber-500/20 border-amber-400/45',
    badgeText: 'text-amber-200',
    screenTint:
      'opacity-100 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(180,83,9,0.22)_100%)]',
    icon: <Wind className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
  },
  freeze: {
    border: 'border-cyan-300/65',
    badgeBg: 'bg-cyan-500/20 border-cyan-300/45',
    badgeText: 'text-cyan-100',
    screenTint:
      'opacity-100 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,182,212,0.25)_100%)]',
    icon: <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />,
  },
  heat: {
    border: 'border-orange-400/60',
    badgeBg: 'bg-orange-500/20 border-orange-400/45',
    badgeText: 'text-orange-200',
    screenTint:
      'opacity-100 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(234,88,12,0.20)_100%)]',
    icon: <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />,
  },
  alert: {
    border: 'border-rose-400/65',
    badgeBg: 'bg-rose-500/20 border-rose-400/45',
    badgeText: 'text-rose-200',
    screenTint:
      'opacity-100 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(225,29,72,0.20)_100%)]',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />,
  },
};

export const MissionOverlayPanel: React.FC<MissionOverlayPanelProps> = ({
  isOpen,
  activeMissionMode,
  onSelectMissionMode,
  unlockedEndings,
  activeArtifactId,
  echoesState,
  activeEchoesSignalId,
  selectedHotspotId,
  revealCluesList,
  onToggleRevealCluesList,
  onSelectEchoesSignal,
  onInspectHotspot,
  onUpdateEchoesState,
  onResetEchoes,
  onClose,
  onFocusArtifact,
  onUnlockEnding,
  onActiveRunChange,
  onResetOrientation,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const missionsMap = getMissions(lang);
  const echoesPremise = getEchoesPremise(lang);
  const echoesSignals = getEchoesSignals(lang);

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const sheetDragStartYRef = useRef<number | null>(null);

  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentEndingId, setCurrentEndingId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<MissionTelemetryState>(
    missionsMap.opportunity_deep_journey.initialTelemetry
  );
  const [lastDelta, setLastDelta] = useState<{
    battery?: number;
    temp?: number;
    data?: number;
  } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);
  const [showEndingsGallery, setShowEndingsGallery] = useState<boolean>(false);
  const [echoesDustOverlayPercent, setEchoesDustOverlayPercent] = useState<number>(0);

  const isEchoesMode = activeMissionMode === 'echoes_of_space';
  const selectedMissionId: MissionId = isEchoesMode
    ? 'opportunity_deep_journey'
    : activeMissionMode;
  const mission = missionsMap[selectedMissionId];

  const activePath: MissionPathConfig | null =
    activePathId ? mission.paths.find((p) => p.id === activePathId) ?? null : null;

  const currentNode: MissionNode | null =
    !isEchoesMode && currentNodeId && mission.nodes[currentNodeId]
      ? mission.nodes[currentNodeId]
      : null;

  const currentEnding: MissionEnding | null =
    !isEchoesMode && currentEndingId && mission.endings[currentEndingId]
      ? mission.endings[currentEndingId]
      : null;

  const unlockedForMission = unlockedEndings[selectedMissionId] ?? [];

  useEffect(() => {
    const activeBranchRun = Boolean(!isEchoesMode && currentNodeId && !currentEndingId);
    const activeEchoesRun = Boolean(isEchoesMode && activeEchoesSignalId);
    onActiveRunChange(activeBranchRun || activeEchoesRun);
  }, [isEchoesMode, currentNodeId, currentEndingId, activeEchoesSignalId, onActiveRunChange]);

  const handleStartPath = (path: MissionPathConfig) => {
    soundEffects.playMissionClick();
    if (activeArtifactId !== mission.relatedArtifactId) {
      onFocusArtifact(mission.relatedArtifactId);
    }

    setActivePathId(path.id);
    setCurrentNodeId(path.startNodeId);
    setCurrentEndingId(null);
    setTelemetry({ ...mission.initialTelemetry });
    setLastDelta(null);
    setBreadcrumbs([]);
    setShowEndingsGallery(false);
  };

  const handleSelectChoice = (choice: MissionChoice) => {
    if (!currentNode) return;

    const prevTelemetry = telemetry;
    const nextTelemetry = applyTelemetryDelta(prevTelemetry, choice.telemetryDelta);
    setTelemetry(nextTelemetry);
    setLastDelta({
      battery: nextTelemetry.battery - prevTelemetry.battery,
      temp: nextTelemetry.temperatureC - prevTelemetry.temperatureC,
      data: nextTelemetry.scienceDataMb - prevTelemetry.scienceDataMb,
    });

    setBreadcrumbs((prev) => [
      ...prev,
      {
        nodeId: currentNode.id,
        stepNumber: currentNode.stepNumber,
        choiceCode: choice.code,
        choiceSummary: choice.label,
      },
    ]);

    if (choice.endingId && mission.endings[choice.endingId]) {
      setCurrentEndingId(choice.endingId);
      setCurrentNodeId(null);
      onUnlockEnding(mission.id, choice.endingId);
      soundEffects.playMissionComplete();
      return;
    }

    if (choice.nextNodeId && mission.nodes[choice.nextNodeId]) {
      const nextNode = mission.nodes[choice.nextNodeId];
      setCurrentNodeId(nextNode.id);

      if (
        nextNode.environmentMood === 'alert' ||
        nextNode.environmentMood === 'freeze' ||
        nextNode.environmentMood === 'dust' ||
        nextNode.environmentMood === 'heat'
      ) {
        soundEffects.playMissionAlert();
      } else {
        soundEffects.playMissionClick();
      }
    }
  };

  const handleReturnToHub = () => {
    soundEffects.playResetTone();
    setActivePathId(null);
    setCurrentNodeId(null);
    setCurrentEndingId(null);
    setLastDelta(null);
    setBreadcrumbs([]);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (isEchoesMode || !currentNode || currentEnding) return;
      const key = e.key.toUpperCase();
      if (key === 'A' || key === '1') {
        const c = currentNode.choices.find((ch) => ch.code === 'A');
        if (c) handleSelectChoice(c);
      } else if (key === 'B' || key === '2') {
        const c = currentNode.choices.find((ch) => ch.code === 'B');
        if (c) handleSelectChoice(c);
      } else if (key === 'C' || key === '3') {
        const c = currentNode.choices.find((ch) => ch.code === 'C');
        if (c) handleSelectChoice(c);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement | null)?.closest('button')) return;
    sheetDragStartYRef.current = e.clientY;
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (sheetDragStartYRef.current === null) return;
    const dy = e.clientY - sheetDragStartYRef.current;
    sheetDragStartYRef.current = null;
    if (dy > 24) {
      setIsMinimized(true);
    } else if (dy < -24) {
      setIsMinimized(false);
    }
  };

  if (!isOpen) return null;

  const activeMood: MissionEnvironmentMood = currentNode?.environmentMood ?? 'normal';
  const moodStyle = MOOD_STYLES[activeMood];

  const batteryColor =
    telemetry.battery <= 6
      ? 'bg-rose-500 text-rose-300'
      : telemetry.battery <= 12
      ? 'bg-amber-400 text-amber-200'
      : 'bg-emerald-400 text-emerald-200';

  const headerIconId: SpaceArtifactId = isEchoesMode
    ? activeEchoesSignalId
      ? echoesSignals[activeEchoesSignalId].relatedArtifactId
      : 'j002e3_s_ivb'
    : mission.relatedArtifactId;

  const headerTitle = isEchoesMode ? echoesPremise.title : mission.title;
  const headerBadge = isEchoesMode
    ? isEn
      ? '3D INVESTIGATION · 3 FILES'
      : 'INVESTIGAÇÃO 3D · 3 ARQUIVOS'
    : mission.missionBadge;
  const headerYear = isEchoesMode ? '5–8 min' : mission.yearLabel;

  const activeEchoesSignalCfg =
    isEchoesMode && activeEchoesSignalId ? echoesSignals[activeEchoesSignalId] : null;
  const discoveredForActiveSignal =
    activeEchoesSignalId ? echoesState.discoveredClues[activeEchoesSignalId] ?? [] : [];
  const activeSelectedHotspot =
    activeEchoesSignalCfg && selectedHotspotId
      ? activeEchoesSignalCfg.hotspots.find((h) => h.id === selectedHotspotId) ?? null
      : null;

  return (
    <>
      {isEchoesMode && echoesDustOverlayPercent > 15 ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-10 pointer-events-none transition-all duration-300"
          style={{
            background: `radial-gradient(circle at 35% 50%, rgba(180,83,9,${
              (echoesDustOverlayPercent / 100) * 0.25
            }), rgba(69,26,3,${(echoesDustOverlayPercent / 100) * 0.62}))`,
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-10 pointer-events-none transition-opacity duration-700 ${moodStyle.screenTint}`}
        />
      )}

      {/* Painel de Missões: Bottom Sheet retrátil no mobile (< 768px) e Painel Lateral Direito intacto no desktop (>= 768px) */}
      <aside
        aria-label={isEn ? 'Interactive Missions Center' : 'Centro de Missões Interativas'}
        className={`fixed z-30 pointer-events-auto flex flex-col transition-all duration-300 ${
          isMinimized
            ? 'inset-x-2.5 bottom-2.5 pb-safe md:pb-0 md:inset-x-auto md:right-6 lg:right-24 md:top-20 md:bottom-24 md:w-[530px]'
            : 'inset-x-2.5 bottom-2.5 top-[4.5rem] pb-safe md:pb-0 md:inset-x-auto md:right-6 lg:right-24 md:top-20 md:bottom-24 md:w-[530px]'
        }`}
      >
        <div
          className={`flex flex-col h-full rounded-2xl bg-[#040B18]/95 backdrop-blur-2xl border ${moodStyle.border} shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden transition-colors duration-300`}
        >
          {/* Cabeçalho Fixo do Painel (com alça de arraste para recolher/expandir no mobile) */}
          <div
            onPointerDown={handleHeaderPointerDown}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
            className="px-3.5 sm:px-4 pt-2 pb-2.5 sm:py-3 bg-[#07142B]/95 border-b border-slate-800/90 shrink-0 select-none touch-none-ui"
          >
            <div
              onClick={() => setIsMinimized((prev) => !prev)}
              className="md:hidden w-10 h-1 rounded-full bg-slate-600/80 mx-auto mb-2 cursor-pointer"
            />
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div
                onClick={() => {
                  if (isMinimized) setIsMinimized(false);
                }}
                className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer md:cursor-default"
              >
                <div
                  className="w-10 h-10 rounded-xl bg-[#040A17] border p-1 shrink-0"
                  style={{ borderColor: isEchoesMode ? '#38BDF8' : mission.accentColor }}
                >
                  <ArtifactCartoonIcon id={headerIconId} className="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-300 truncate">
                      {headerBadge}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate hidden xs:inline">
                      {headerYear}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-sm sm:text-base text-white truncate mt-0.5">
                    {headerTitle}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isEchoesMode && (currentNode || currentEnding) && (
                  <button
                    type="button"
                    onClick={handleReturnToHub}
                    title={isEn ? 'Back to paths selection' : 'Voltar para a seleção de caminhos'}
                    className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-8 px-2.5 rounded-lg bg-[#0B1E3D] hover:bg-[#122B54] border border-sky-400/35 text-xs font-medium text-sky-200 flex items-center justify-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">{isEn ? 'Paths' : 'Caminhos'}</span>
                  </button>
                )}

                {/* Botão Mobile de Minimizar / Ver 3D */}
                <button
                  type="button"
                  onClick={() => setIsMinimized((prev) => !prev)}
                  aria-expanded={!isMinimized}
                  aria-label={
                    isMinimized
                      ? isEn
                        ? 'Expand mission panel'
                        : 'Expandir painel de missão'
                      : isEn
                      ? 'Minimize mission panel to inspect 3D'
                      : 'Minimizar painel para ver modelo 3D'
                  }
                  className="md:hidden min-h-[44px] px-2.5 rounded-xl bg-[#0A1D3B] border border-sky-400/50 text-xs font-display font-semibold text-sky-100 flex items-center gap-1 transition-colors"
                >
                  {isMinimized ? (
                    <>
                      <span>{isEn ? 'Expand' : 'Expandir'}</span>
                      <ChevronUp className="w-4 h-4 text-sky-400" />
                    </>
                  ) : (
                    <>
                      <span>{isEn ? '3D View' : 'Ver 3D'}</span>
                      <ChevronDown className="w-4 h-4 text-sky-400" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEchoesDustOverlayPercent(0);
                    onClose();
                  }}
                  aria-label={isEn ? 'Close missions panel' : 'Fechar painel de missões'}
                  title={isEn ? 'Close (Esc)' : 'Fechar (Esc)'}
                  className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-[#0A1931] hover:bg-[#13294B] border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Resumo interativo quando minimizado no mobile (exibe progresso de pistas e pista recém-clicada no 3D) */}
            {isMinimized && (
              <div className="md:hidden mt-2 pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {activeEchoesSignalCfg ? (
                      <p className="text-xs text-sky-200 font-medium truncate">
                        <strong className="text-amber-300">
                          {discoveredForActiveSignal.length}/3 {isEn ? 'clues' : 'pistas'}
                        </strong>{' '}
                        ·{' '}
                        {isEn
                          ? 'Drag in 360° & tap glowing points'
                          : 'Gire em 360° e toque nos pontos luminosos'}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 truncate">
                        {isEn
                          ? '3D view active · Tap Expand to return to mission'
                          : 'Visão 3D livre · Toque em Expandir para voltar à missão'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onResetOrientation && (
                      <button
                        type="button"
                        onClick={onResetOrientation}
                        aria-label={isEn ? 'Reset 3D angle' : 'Restaurar ângulo 3D'}
                        className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-[#050C1A] border border-slate-700 text-xs text-sky-200 flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                      </button>
                    )}

                    {activeEchoesSignalCfg && discoveredForActiveSignal.length >= 3 && (
                      <button
                        type="button"
                        onClick={() => setIsMinimized(false)}
                        className="min-h-[44px] px-3 rounded-xl bg-amber-400 text-[#020814] font-display font-bold text-xs flex items-center gap-1 shadow-lg animate-pulse"
                      >
                        <span>{isEn ? '3/3 Found! Continue →' : '3/3 Pistas! Continuar →'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {activeSelectedHotspot && (
                  <div className="rounded-xl px-3 py-2 bg-[#071D26]/95 border border-emerald-400/50 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-emerald-200 flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {activeSelectedHotspot.label}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 shrink-0">
                        {isEn ? 'Recorded' : 'Registrada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200 italic mt-0.5 line-clamp-2">
                      {activeSelectedHotspot.observation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conteúdo do Painel (oculto no mobile apenas quando minimizado; sempre visível no desktop >= md) */}
          <div
            className={`${
              isMinimized ? 'hidden md:flex' : 'flex'
            } flex-col flex-1 min-h-0 overflow-hidden`}
          >
          {/* Seletor de Missões no Topo */}
          <div className="px-4 py-2 bg-[#030915] border-b border-slate-800/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEffects.playMissionClick();
                setEchoesDustOverlayPercent(0);
                onSelectMissionMode('echoes_of_space');
              }}
              className={`min-h-[44px] md:min-h-0 px-3 py-1.5 rounded-xl text-xs font-display font-semibold flex items-center gap-1.5 border whitespace-nowrap transition-all ${
                isEchoesMode
                  ? 'bg-[#0F274E] border-sky-400 text-white shadow-[0_0_14px_rgba(56,189,248,0.25)]'
                  : 'bg-[#061022] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>{isEn ? 'Echoes of Space' : 'Ecos do Espaço'}</span>
              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-[10px] font-mono text-sky-300">
                {echoesState.reconstructedSignals.length}/3
              </span>
            </button>

            {MISSION_ORDER.map((id) => {
              const m = missionsMap[id];
              const isSelected = !isEchoesMode && id === activeMissionMode;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    soundEffects.playMissionClick();
                    setEchoesDustOverlayPercent(0);
                    onSelectEchoesSignal(null);
                    onSelectMissionMode(id);
                  }}
                  className={`min-h-[44px] md:min-h-0 px-3 py-1.5 rounded-xl text-xs font-display font-semibold flex items-center gap-1.5 border whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#0F274E] border-amber-400/70 text-white shadow-sm'
                      : 'bg-[#061022] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{m.title.split('–')[0].trim()}</span>
                  {m.comingSoon ? (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] text-slate-400 uppercase">
                      {isEn ? 'Soon' : 'Em breve'}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[10px] font-mono text-amber-300">
                      {(unlockedEndings[id] ?? []).length}/7
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Barra de Telemetria Viva (Exibida durante a missão Opportunity ou na tela de final) */}
          {!isEchoesMode && (currentNode || currentEnding) && (
            <div className="px-4 py-2.5 bg-[#030813]/95 border-b border-slate-800/90 grid grid-cols-3 gap-2 shrink-0">
              {/* Bateria */}
              <div className="rounded-xl bg-[#071224] border border-slate-800/90 px-2.5 py-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <BatteryCharging className="w-3 h-3 text-amber-400" />
                    {isEn ? 'Battery' : 'Bateria'}
                  </span>
                  {lastDelta?.battery ? (
                    <span
                      className={`font-mono font-semibold ${
                        lastDelta.battery < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {lastDelta.battery > 0 ? `+${lastDelta.battery}%` : `${lastDelta.battery}%`}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span
                    className={`font-mono text-xs sm:text-sm font-bold ${
                      telemetry.battery <= 8 ? 'text-rose-400 animate-pulse' : 'text-white'
                    }`}
                  >
                    {telemetry.battery}%
                  </span>
                  <span className="text-[9px] text-slate-500">Solar</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      batteryColor.split(' ')[0]
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, telemetry.battery * 4))}%` }}
                  />
                </div>
              </div>

              {/* Temperatura */}
              <div className="rounded-xl bg-[#071224] border border-slate-800/90 px-2.5 py-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <ThermometerSnowflake className="w-3 h-3 text-cyan-400" />
                    {isEn ? 'Temp' : 'Temperatura'}
                  </span>
                  {lastDelta?.temp ? (
                    <span
                      className={`font-mono font-semibold ${
                        lastDelta.temp < 0 ? 'text-cyan-300' : 'text-orange-300'
                      }`}
                    >
                      {lastDelta.temp > 0 ? `+${lastDelta.temp}°C` : `${lastDelta.temp}°C`}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span
                    className={`font-mono text-xs sm:text-sm font-bold ${
                      telemetry.temperatureC <= -75
                        ? 'text-cyan-300 animate-pulse'
                        : telemetry.temperatureC >= -32
                        ? 'text-orange-300'
                        : 'text-white'
                    }`}
                  >
                    {telemetry.temperatureC}°C
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {telemetry.temperatureC <= -75
                      ? isEn
                        ? 'Freezing'
                        : 'Congelando'
                      : isEn
                      ? 'Normal'
                      : 'Normal'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      telemetry.temperatureC <= -75
                        ? 'bg-cyan-400'
                        : telemetry.temperatureC >= -32
                        ? 'bg-orange-400'
                        : 'bg-sky-400'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(12, ((telemetry.temperatureC + 95) / 110) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Dados Científicos */}
              <div className="rounded-xl bg-[#071224] border border-slate-800/90 px-2.5 py-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Database className="w-3 h-3 text-emerald-400" />
                    {isEn ? 'Discoveries' : 'Descobertas'}
                  </span>
                  {lastDelta?.data ? (
                    <span className="font-mono font-semibold text-emerald-400">
                      +{lastDelta.data} MB
                    </span>
                  ) : null}
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="font-mono text-xs sm:text-sm font-bold text-emerald-300">
                    {telemetry.scienceDataMb} MB
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {isEn ? 'Saved' : 'Salvos'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (telemetry.scienceDataMb / 140) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Corpo Rolável do Painel */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar">
            {isEchoesMode ? (
              <EchoesOfSpacePanel
                echoesState={echoesState}
                activeSignalId={activeEchoesSignalId}
                selectedHotspotId={selectedHotspotId}
                revealCluesList={revealCluesList}
                onToggleRevealCluesList={onToggleRevealCluesList}
                onSelectSignal={onSelectEchoesSignal}
                onFocusArtifact={onFocusArtifact}
                onInspectHotspot={(hotspot) => {
                  onInspectHotspot(hotspot);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsMinimized(true);
                  }
                }}
                onUpdateEchoesState={onUpdateEchoesState}
                onResetEchoes={onResetEchoes}
                onExploreFreely={() => {
                  setEchoesDustOverlayPercent(0);
                  onSelectEchoesSignal(null);
                  onClose();
                }}
                onDustLevelChange={setEchoesDustOverlayPercent}
                onRequestMinimize={() => setIsMinimized(true)}
              />
            ) : (
              <>
                {!currentNode && !currentEnding && (
                  <>
                    {mission.comingSoon ? (
                      <div className="rounded-2xl bg-[#071327] border border-slate-800 p-5 text-center space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#040B18] border border-amber-400/40 p-2">
                          <ArtifactCartoonIcon
                            id={mission.relatedArtifactId}
                            className="w-full h-full"
                          />
                        </div>
                        <h3 className="font-display font-bold text-base text-white">
                          {mission.title}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {mission.introBriefing}
                        </p>
                        <button
                          type="button"
                          onClick={() => onFocusArtifact(mission.relatedArtifactId)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-xs font-display font-semibold text-sky-200 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            {isEn ? 'Inspect 3D Model Now' : 'Inspecionar Modelo 3D Agora'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl bg-gradient-to-br from-[#091936] to-[#050E20] border border-amber-400/35 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-display font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                              <Compass className="w-3.5 h-3.5 text-amber-400" />
                              {isEn
                                ? 'Mission Briefing · 4 Steps per Path'
                                : 'Resumo da Missão · 4 Passos por Caminho'}
                            </span>

                            {activeArtifactId !== mission.relatedArtifactId && (
                              <button
                                type="button"
                                onClick={() => onFocusArtifact(mission.relatedArtifactId)}
                                className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-[11px] font-semibold text-amber-200 flex items-center gap-1 transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>{isEn ? 'View 3D Rover' : 'Ver Robô 3D'}</span>
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-slate-200/95 leading-relaxed">
                            {mission.introBriefing}
                          </p>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="text-xs font-medium text-slate-200">
                                {isEn ? 'Endings Discovered:' : 'Finais Descobertos:'}{' '}
                                <strong className="text-amber-300 font-mono">
                                  {unlockedForMission.length}/{mission.endingOrder.length}
                                </strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowEndingsGallery((prev) => !prev)}
                              className="text-[11px] font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-2"
                            >
                              {showEndingsGallery
                                ? isEn
                                  ? 'Hide Gallery'
                                  : 'Ocultar Galeria'
                                : isEn
                                ? 'View Endings Gallery'
                                : 'Ver Galeria de Finais'}
                            </button>
                          </div>
                        </div>

                        {showEndingsGallery && (
                          <div className="rounded-2xl bg-[#061124] border border-slate-800 p-3.5 space-y-2 animate-fadeIn">
                            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-300">
                              {isEn ? 'Endings Archive (Opportunity)' : 'Arquivo de Finais (Opportunity)'}
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                              {mission.endingOrder.map((endingId) => {
                                const end = mission.endings[endingId];
                                const isUnlocked = unlockedForMission.includes(endingId);
                                return (
                                  <div
                                    key={endingId}
                                    className={`rounded-xl p-2.5 border flex items-start gap-2.5 ${
                                      isUnlocked
                                        ? 'bg-[#0A1C3A]/90 border-amber-400/45 text-white'
                                        : 'bg-[#040A16]/70 border-slate-800/80 text-slate-500'
                                    }`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {isUnlocked ? (
                                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                      ) : (
                                        <Lock className="w-4 h-4 text-slate-600" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-slate-900 text-amber-300">
                                          {isEn ? `Ending ${end.number}` : `Final ${end.number}`}
                                        </span>
                                        <span className="text-xs font-display font-bold truncate">
                                          {isUnlocked
                                            ? end.title
                                            : isEn
                                            ? 'Locked Ending'
                                            : 'Final Bloqueado'}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-300 mt-0.5">
                                        {isUnlocked
                                          ? end.subtitle
                                          : isEn
                                          ? `Available in ${end.pathTitle}`
                                          : `Disponível no ${end.pathTitle}`}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2.5">
                          <h3 className="text-xs font-display font-bold uppercase tracking-wider text-sky-300 px-0.5">
                            {isEn
                              ? 'Choose Your Exploration Route (3 Paths):'
                              : 'Escolha por Onde Explorar (3 Caminhos):'}
                          </h3>

                          {mission.paths.map((path) => {
                            const unlockedInPath = path.endingNumbers.filter((num) =>
                              unlockedForMission.includes(`final_${num}`)
                            ).length;

                            return (
                              <button
                                key={path.id}
                                type="button"
                                onClick={() => handleStartPath(path)}
                                className="w-full text-left group rounded-2xl bg-[#07142B]/90 hover:bg-[#0D2144] border border-slate-800 hover:border-sky-400/60 p-3.5 transition-all duration-200 shadow-md hover:shadow-[0_0_24px_rgba(56,189,248,0.18)]"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                                        style={{
                                          backgroundColor: `${path.accentColor}33`,
                                          border: `1px solid ${path.accentColor}`,
                                        }}
                                      >
                                        {path.focusBadge}
                                      </span>
                                      <span className="text-[11px] font-mono text-slate-400">
                                        {isEn ? 'Endings:' : 'Finais:'} {unlockedInPath}/
                                        {path.endingNumbers.length}
                                      </span>
                                    </div>

                                    <h4 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-sky-200 mt-1.5">
                                      {path.title}
                                    </h4>
                                  </div>

                                  <div className="w-8 h-8 rounded-xl bg-[#040B18] border border-slate-700 group-hover:border-sky-400 flex items-center justify-center shrink-0 mt-1 group-hover:translate-x-0.5 transition-all">
                                    <ArrowRight className="w-4 h-4 text-sky-400" />
                                  </div>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                                  {path.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}

                {currentNode && !currentEnding && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="rounded-xl bg-[#061226] border border-slate-800/90 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-bold text-sky-300">
                          {activePath?.title}
                        </span>
                        <span className="font-mono text-[11px] text-amber-300 font-semibold">
                          {isEn
                            ? `Step ${currentNode.stepNumber} of 4`
                            : `Passo ${currentNode.stepNumber} de 4`}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 mt-2">
                        {[1, 2, 3, 4].map((step) => {
                          const isDone = step < currentNode.stepNumber;
                          const isCurrent = step === currentNode.stepNumber;
                          return (
                            <div
                              key={step}
                              className={`h-1.5 rounded-full transition-all ${
                                isCurrent
                                  ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]'
                                  : isDone
                                  ? 'bg-sky-400'
                                  : 'bg-slate-800'
                              }`}
                            />
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {currentNode.stepStageLabel}
                      </p>
                    </div>

                    {breadcrumbs.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 px-1">
                        <span className="text-slate-500 font-mono">
                          {isEn ? 'Route:' : 'Rota:'}
                        </span>
                        {breadcrumbs.map((b, i) => (
                          <React.Fragment key={`${b.nodeId}-${i}`}>
                            <span className="px-2 py-0.5 rounded bg-[#081730] border border-slate-700/80 text-sky-200 font-mono">
                              {isEn ? `S${b.stepNumber}` : `P${b.stepNumber}`}: [{b.choiceCode}]
                            </span>
                            {i < breadcrumbs.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-slate-600" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    <div className="rounded-2xl bg-[#07152E]/95 border border-sky-400/35 p-4 space-y-2.5 shadow-lg">
                      {currentNode.environmentBadge && (
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${moodStyle.badgeBg} ${moodStyle.badgeText}`}
                        >
                          {moodStyle.icon}
                          <span>{currentNode.environmentBadge}</span>
                        </div>
                      )}

                      <h3 className="font-display font-bold text-base sm:text-lg text-white leading-snug">
                        {currentNode.title}
                      </h3>

                      {currentNode.subtitle && (
                        <p className="text-[11px] font-mono text-sky-300/90">
                          {currentNode.subtitle}
                        </p>
                      )}

                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed pt-1">
                        {currentNode.narrative}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-display font-bold uppercase tracking-wider text-amber-300">
                          {isEn ? 'Choose Your Action:' : 'Escolha sua Ação:'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                          {isEn ? 'Keys:' : 'Atalhos:'} A, B
                          {currentNode.choices.length > 2 ? ', C' : ''}
                        </span>
                      </div>

                      {currentNode.choices.map((choice) => (
                        <button
                          key={choice.code}
                          type="button"
                          onClick={() => handleSelectChoice(choice)}
                          className="w-full text-left group rounded-2xl bg-[#081730]/90 hover:bg-[#0F2852] border border-slate-700/90 hover:border-amber-400 p-3.5 transition-all duration-200 shadow-md hover:shadow-[0_0_25px_rgba(245,158,11,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-amber-400/15 group-hover:bg-amber-400 border border-amber-400/50 text-amber-300 group-hover:text-[#030914] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                              [{choice.code}]
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-white group-hover:text-amber-100 leading-relaxed">
                                {choice.label}
                              </p>

                              {choice.consequenceHint && (
                                <p className="text-[11px] font-mono text-sky-300/85 mt-1.5 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>{choice.consequenceHint}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentEnding && (
                  <div className="space-y-4 animate-fadeIn">
                    <div
                      className="rounded-2xl bg-gradient-to-br from-[#0B2147] via-[#07152E] to-[#040B18] border-2 p-4 sm:p-5 space-y-3 shadow-[0_0_35px_rgba(245,158,11,0.25)]"
                      style={{ borderColor: currentEnding.accentColor }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/50 text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          {isEn
                            ? `ENDING ${currentEnding.number} OF ${mission.endingOrder.length} UNLOCKED`
                            : `FINAL ${currentEnding.number} DE ${mission.endingOrder.length} DESBLOQUEADO`}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300">
                          {unlockedForMission.length}/{mission.endingOrder.length}{' '}
                          {isEn ? 'Collected' : 'na Coleção'}
                        </span>
                      </div>

                      <div>
                        <p className="text-[11px] font-display font-semibold uppercase tracking-wider text-sky-300">
                          {currentEnding.pathTitle}
                        </p>
                        <h3 className="font-display font-bold text-xl sm:text-2xl text-white mt-0.5">
                          “{currentEnding.title}”
                        </h3>
                        <p className="text-xs font-medium text-amber-200/95 mt-0.5">
                          {currentEnding.subtitle}
                        </p>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed pt-1 border-t border-slate-800/80">
                        {currentEnding.epilogue}
                      </p>

                      <div className="rounded-xl bg-[#040A17]/90 border border-slate-800 p-3 space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                          {isEn ? 'Recorded Discovery:' : 'Descoberta Registrada:'}
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {currentEnding.scientificVerdict}
                        </p>
                      </div>

                      {breadcrumbs.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                            {isEn ? 'Choices Made (4 Steps):' : 'Escolhas Feitas (4 Passos):'}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {breadcrumbs.map((b, idx) => (
                              <span
                                key={`${b.nodeId}-${idx}`}
                                className="px-2 py-0.5 rounded bg-[#081730] border border-sky-400/30 text-[11px] font-mono text-sky-200"
                              >
                                {isEn ? `Step ${b.stepNumber}` : `Passo ${b.stepNumber}`}: [{b.choiceCode}]
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activePath && (
                        <button
                          type="button"
                          onClick={() => handleStartPath(activePath)}
                          className="min-h-[44px] md:min-h-0 h-11 md:h-10 px-4 rounded-xl bg-[#0B2147] hover:bg-[#123166] border border-sky-400/50 text-xs font-display font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            {isEn
                              ? `Replay ${activePath.title.split(':')[0]}`
                              : `Repetir ${activePath.title.split(':')[0]}`}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleReturnToHub}
                        className="min-h-[44px] md:min-h-0 h-11 md:h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#030914] font-display font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                      >
                        <Compass className="w-4 h-4" />
                        <span>{isEn ? 'Explore Another Path' : 'Explorar Outro Caminho'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        </div>
      </aside>
    </>
  );
};
