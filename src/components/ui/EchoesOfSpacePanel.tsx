import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Lock,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  EyeOff,
  Sliders,
  FileText,
  Compass,
  Radio,
  Sun,
  Zap,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import {
  ECHOES_SIGNAL_ORDER,
  getEchoesPremise,
  getEchoesSignals,
  getOpportunityDustCards,
  getScientificCredits,
  OpportunityDustCard,
} from '../../config/missions/echoesOfSpaceConfig';
import { SpaceArtifactId } from '../../types/experience';
import {
  EchoesHotspot3D,
  EchoesInvestigationStep,
  EchoesPersistedState,
  EchoesSignalId,
} from '../../types/echoesMission';
import { isSignalUnlocked } from '../../utils/echoesProgress';
import { useLanguage } from '../../utils/i18n';
import { soundEffects } from '../../utils/soundEffects';
import { ArtifactCartoonIcon } from './ArtifactCartoonIcons';

interface EchoesOfSpacePanelProps {
  echoesState: EchoesPersistedState;
  activeSignalId: EchoesSignalId | null;
  selectedHotspotId: string | null;
  revealCluesList: boolean;
  onToggleRevealCluesList: () => void;
  onSelectSignal: (signalId: EchoesSignalId | null) => void;
  onFocusArtifact: (artifactId: SpaceArtifactId) => void;
  onInspectHotspot: (hotspot: EchoesHotspot3D) => void;
  onUpdateEchoesState: (updater: (prev: EchoesPersistedState) => EchoesPersistedState) => void;
  onResetEchoes: () => void;
  onExploreFreely: () => void;
  onDustLevelChange: (dustPercent: number) => void;
  onRequestMinimize?: () => void;
}

export const EchoesOfSpacePanel: React.FC<EchoesOfSpacePanelProps> = ({
  echoesState,
  activeSignalId,
  selectedHotspotId,
  revealCluesList,
  onToggleRevealCluesList,
  onSelectSignal,
  onFocusArtifact,
  onInspectHotspot,
  onUpdateEchoesState,
  onResetEchoes,
  onExploreFreely,
  onDustLevelChange,
  onRequestMinimize,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const premise = getEchoesPremise(lang);
  const signals = getEchoesSignals(lang);
  const credits = getScientificCredits(lang);

  // Controle de visualização interna: 'map' | 'signal' | 'final_reconstruction' | 'credits'
  const [viewMode, setViewMode] = useState<
    'map' | 'signal' | 'final_reconstruction' | 'credits'
  >(() => (activeSignalId ? 'signal' : 'map'));

  // Estado da etapa ativa dentro da investigação selecionada
  const [activeStep, setActiveStep] = useState<EchoesInvestigationStep>('locate_clues');

  // Sistema de Dicas Graduais (0 = fechado, 1 = região, 2 = ação, 3 = orientação direta)
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [inactivityPulse, setInactivityPulse] = useState<boolean>(false);

  // Feedback de hipótese incorreta (sem punição, com orientação específica)
  const [hypothesisFeedback, setHypothesisFeedback] = useState<string | null>(null);

  // --- Estado do Mini-Lab 1 (J002E3: Analisador Espectral) ---
  const [selectedSpectralRef, setSelectedSpectralRef] = useState<
    'rock' | 'rocket_paint' | null
  >(null);
  const [spectralFeedback, setSpectralFeedback] = useState<string | null>(null);

  // --- Estado do Mini-Lab 2 (Retrorefletor Lunar: Feixe Laser) ---
  const [laserAzimuth, setLaserAzimuth] = useState<number>(38);
  const [laserElevation, setLaserElevation] = useState<number>(22);
  const [lastShotResult, setLastShotResult] = useState<{
    hit: boolean;
    az: number;
    el: number;
    message: string;
  } | null>(null);
  const [isLaserAnimating, setIsLaserAnimating] = useState<boolean>(false);

  // --- Estado do Mini-Lab 3 (Opportunity: Ordenação + Poeira) ---
  const [orderedCardIds, setOrderedCardIds] = useState<string[]>([
    'card_light',
    'card_energy',
    'card_dust',
  ]);
  const [selectedCardId, setSelectedCardId] = useState<string>('card_dust');
  const [draggedCardIdx, setDraggedCardIdx] = useState<number | null>(null);
  const [dustPercent, setDustPercent] = useState<number>(20);
  const [hasTestedHighDust, setHasTestedHighDust] = useState<boolean>(false);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(
    'ms_planned_90'
  );

  // --- Estado do Desfecho Final ("O que ficou para trás") ---
  const [selectedSignalForMatch, setSelectedSignalForMatch] =
    useState<EchoesSignalId>('j002e3');
  const [showEvidenceInFinal, setShowEvidenceInFinal] = useState<boolean>(false);
  const [archiveBannerDismissed, setArchiveBannerDismissed] = useState<boolean>(false);

  const signalConfig = activeSignalId ? signals[activeSignalId] : null;
  const reconstructedCount = echoesState.reconstructedSignals.length;

  const localizedDustCardsMap = getOpportunityDustCards(lang).reduce<
    Record<string, OpportunityDustCard>
  >((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const orderedCards = orderedCardIds
    .map((id) => localizedDustCardsMap[id])
    .filter(Boolean);

  // Sincroniza viewMode e calcula a etapa correta ao abrir um sinal
  useEffect(() => {
    if (!activeSignalId) {
      if (viewMode === 'signal') setViewMode('map');
      onDustLevelChange(0);
      return;
    }

    setViewMode('signal');
    setHintLevel(0);
    setHypothesisFeedback(null);
    setArchiveBannerDismissed(false);

    const isReconstructed = echoesState.reconstructedSignals.includes(activeSignalId);
    const clues = echoesState.discoveredClues[activeSignalId] ?? [];
    const expDone = echoesState.completedExperiments.includes(activeSignalId);

    if (isReconstructed) {
      setActiveStep('resolved');
    } else if (expDone) {
      setActiveStep('interpret');
    } else if (clues.length >= 3) {
      setActiveStep('experiment');
    } else {
      setActiveStep('locate_clues');
    }

    if (activeSignalId !== 'opportunity') {
      onDustLevelChange(0);
    }
  }, [
    activeSignalId,
    echoesState.reconstructedSignals,
    echoesState.discoveredClues,
    echoesState.completedExperiments,
    onDustLevelChange,
    viewMode,
  ]);

  // Temporizador suave de 25s sem avanço para sugerir dica gradual
  useEffect(() => {
    setInactivityPulse(false);
    if (viewMode !== 'signal' || activeStep === 'resolved') return;

    const timer = window.setTimeout(() => {
      setInactivityPulse(true);
    }, 25000);

    return () => window.clearTimeout(timer);
  }, [viewMode, activeSignalId, activeStep, echoesState]);

  const handleOpenSignal = (signalId: EchoesSignalId) => {
    const cfg = signals[signalId];
    soundEffects.playMissionClick();
    onSelectSignal(signalId);
    onFocusArtifact(cfg.relatedArtifactId);
  };

  const handleCycleHint = () => {
    soundEffects.playMissionClick();
    setInactivityPulse(false);
    setHintLevel((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : 1));
  };

  // --- Lógica do Mini-Lab 1: Analisador Espectral do J002E3 ---
  const handleSelectSpectralReference = (choice: 'rock' | 'rocket_paint') => {
    setSelectedSpectralRef(choice);
    if (choice === 'rocket_paint') {
      soundEffects.playMissionComplete();
      setSpectralFeedback(
        isEn
          ? 'Match confirmed! The high reflection peak matches white titanium-dioxide paint used on rocket stages.'
          : 'Compatibilidade confirmada! O brilho alto corresponde à tinta branca protetora usada em estágios de foguete.'
      );
      onUpdateEchoesState((prev) => ({
        ...prev,
        analyzerCompletedJ002: true,
        completedExperiments: prev.completedExperiments.includes('j002e3')
          ? prev.completedExperiments
          : [...prev.completedExperiments, 'j002e3'],
      }));
    } else {
      soundEffects.playMissionAlert();
      setSpectralFeedback(
        isEn
          ? 'Pattern mismatch: natural space rocks absorb most sunlight and have a low curve. Compare the tall bars (88%–94%) with the reference beside it.'
          : 'Padrão diferente: pedras espaciais absorvem quase toda a luz e têm barras baixas. Compare as barras altas (88%–94%) com a referência ao lado.'
      );
    }
  };

  // --- Lógica do Mini-Lab 2: Pulso Laser Terra-Lua (LRRR) ---
  const TARGET_AZ = 65;
  const TARGET_EL = 40;
  const TOLERANCE = 12;

  const handleFireLaserPulse = () => {
    if (isLaserAnimating) return;
    soundEffects.playMissionClick();
    setIsLaserAnimating(true);

    const dAz = laserAzimuth - TARGET_AZ;
    const dEl = laserElevation - TARGET_EL;
    const isHit = Math.abs(dAz) <= TOLERANCE && Math.abs(dEl) <= TOLERANCE;

    window.setTimeout(() => {
      setIsLaserAnimating(false);
      if (isHit) {
        soundEffects.playMissionComplete();
        setLastShotResult({
          hit: true,
          az: laserAzimuth,
          el: laserElevation,
          message: isEn
            ? 'Return signal detected in 2.56 s! The laser hit the lunar mirrors in the Sea of Tranquility and bounced straight back to Earth.'
            : 'Sinal de retorno recebido em 2,56 s! O feixe atingiu os espelhos na Lua e voltou diretamente para a estação na Terra.',
        });
        onUpdateEchoesState((prev) => ({
          ...prev,
          completedExperiments: prev.completedExperiments.includes('lrrr')
            ? prev.completedExperiments
            : [...prev.completedExperiments, 'lrrr'],
        }));
      } else {
        soundEffects.playMissionAlert();
        if (isEn) {
          const horizHint =
            dAz < -TOLERANCE
              ? 'too far left (increase Direction)'
              : dAz > TOLERANCE
              ? 'too far right (decrease Direction)'
              : 'horizontally aligned';
          const vertHint =
            dEl < -TOLERANCE
              ? 'below the reflector (increase Elevation)'
              : dEl > TOLERANCE
              ? 'above the reflector (decrease Elevation)'
              : 'at the right height';
          setLastShotResult({
            hit: false,
            az: laserAzimuth,
            el: laserElevation,
            message: `Beam missed the target: ${horizHint} and ${vertHint}. Check where the line passed in the diagram and adjust your next shot.`,
          });
        } else {
          const horizHint =
            dAz < -TOLERANCE
              ? 'muito à esquerda (aumente a Direção)'
              : dAz > TOLERANCE
              ? 'muito à direita (reduza a Direção)'
              : 'bem alinhado na horizontal';
          const vertHint =
            dEl < -TOLERANCE
              ? 'abaixo da região do refletor (aumente a Altura)'
              : dEl > TOLERANCE
              ? 'acima da região do refletor (reduza a Altura)'
              : 'na altura correta';
          setLastShotResult({
            hit: false,
            az: laserAzimuth,
            el: laserElevation,
            message: `O feixe passou fora do alvo: ${horizHint} e ${vertHint}. Veja onde a linha passou no desenho e ajuste para a próxima tentativa.`,
          });
        }
      }
    }, 550);
  };

  // --- Lógica do Mini-Lab 3: Ordenação + Poeira do Opportunity ---
  const isSequenceCorrect =
    orderedCards[0]?.correctOrder === 1 &&
    orderedCards[1]?.correctOrder === 2 &&
    orderedCards[2]?.correctOrder === 3;

  const handleMoveCard = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= orderedCardIds.length) return;
    soundEffects.playMissionClick();
    const copy = [...orderedCardIds];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setOrderedCardIds(copy);
  };

  const handleDustSliderChange = (nextVal: number) => {
    setDustPercent(nextVal);
    onDustLevelChange(nextVal);
    if (nextVal >= 65) {
      setHasTestedHighDust(true);
      if (isSequenceCorrect && !echoesState.completedExperiments.includes('opportunity')) {
        soundEffects.playMissionComplete();
        onUpdateEchoesState((prev) => ({
          ...prev,
          completedExperiments: [...prev.completedExperiments, 'opportunity'],
        }));
      }
    }
  };

  useEffect(() => {
    if (
      activeSignalId === 'opportunity' &&
      isSequenceCorrect &&
      hasTestedHighDust &&
      !echoesState.completedExperiments.includes('opportunity')
    ) {
      onUpdateEchoesState((prev) => ({
        ...prev,
        completedExperiments: [...prev.completedExperiments, 'opportunity'],
      }));
    }
  }, [
    activeSignalId,
    isSequenceCorrect,
    hasTestedHighDust,
    echoesState.completedExperiments,
    onUpdateEchoesState,
  ]);

  // --- Lógica de Interpretação (Etapa 3) ---
  const handleSelectHypothesis = (hypId: string) => {
    if (!signalConfig) return;
    const hyp = signalConfig.hypotheses.find((h) => h.id === hypId);
    if (!hyp) return;

    if (hyp.isCorrect) {
      soundEffects.playMissionComplete();
      setHypothesisFeedback(null);
      onDustLevelChange(0);
      onUpdateEchoesState((prev) => ({
        ...prev,
        reconstructedSignals: prev.reconstructedSignals.includes(signalConfig.id)
          ? prev.reconstructedSignals
          : [...prev.reconstructedSignals, signalConfig.id],
      }));
      setActiveStep('resolved');
    } else {
      soundEffects.playMissionAlert();
      setHypothesisFeedback(hyp.specificGuidance);
    }
  };

  // --- Lógica de Conexão Final de Legados ("O que ficou para trás") ---
  const handleMatchLegacy = (legacyMatchId: string) => {
    const expected = signals[selectedSignalForMatch].legacyMatchId;
    if (legacyMatchId === expected) {
      soundEffects.playMissionComplete();
      onUpdateEchoesState((prev) => {
        const nextMatched = {
          ...prev.finalLegacyMatched,
          [selectedSignalForMatch]: legacyMatchId,
        };
        const allDone =
          Boolean(nextMatched.j002e3) &&
          Boolean(nextMatched.lrrr) &&
          Boolean(nextMatched.opportunity);

        if (!allDone) {
          const nextPending = ECHOES_SIGNAL_ORDER.find((id) => !nextMatched[id]);
          if (nextPending) setSelectedSignalForMatch(nextPending);
        }

        return {
          ...prev,
          finalLegacyMatched: nextMatched,
          isArchiveCompleted: allDone,
        };
      });
    } else {
      soundEffects.playMissionAlert();
    }
  };

  const discoveredClueIdsForCurrent = signalConfig
    ? echoesState.discoveredClues[signalConfig.id] ?? []
    : [];

  return (
    <div className="space-y-4">
      {/* Barra de Topo do Sistema de Arquivos: Progresso "Arquivos reconstruídos: X de 3" + Créditos */}
      <div className="rounded-xl bg-[#061226] border border-sky-400/35 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-400 animate-pulse shrink-0" />
          <span className="text-xs font-display font-bold text-white">
            {isEn ? 'Reconstructed files:' : 'Arquivos reconstruídos:'}{' '}
            <strong className="text-amber-300 font-mono">
              {reconstructedCount} {isEn ? 'of' : 'de'} 3
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {viewMode !== 'map' && (
            <button
              type="button"
              onClick={() => {
                soundEffects.playMissionClick();
                onSelectSignal(null);
                setViewMode('map');
                onDustLevelChange(0);
              }}
              className="min-h-[44px] md:min-h-0 px-2.5 py-1 rounded-lg bg-[#0B2145] hover:bg-[#123163] border border-sky-400/40 text-[11px] font-semibold text-sky-200 flex items-center gap-1 transition-colors"
            >
              <Compass className="w-3 h-3 text-sky-400" />
              <span>{isEn ? 'Signal Map' : 'Mapa de Sinais'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEffects.playMissionClick();
              setViewMode((prev) => (prev === 'credits' ? 'map' : 'credits'));
            }}
            className="min-h-[44px] md:min-h-0 px-2.5 py-1 rounded-lg bg-[#081730] hover:bg-[#0E2448] border border-slate-700 text-[11px] text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
            title={
              isEn
                ? 'Scientific sources, simplifications & 3D model credits'
                : 'Fontes científicas, simplificações e créditos dos modelos 3D'
            }
          >
            <BookOpen className="w-3 h-3 text-amber-400" />
            <span>{isEn ? 'Sources & Note' : 'Fontes & Nota'}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MODO CRÉDITOS E TRANSPARÊNCIA CIENTÍFICA
         ===================================================================== */}
      {viewMode === 'credits' && (
        <div className="rounded-2xl bg-[#061226] border border-slate-700/90 p-4 space-y-3.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-amber-300 uppercase tracking-wider">
              {isEn
                ? 'Scientific Accuracy, Simplifications & Credits'
                : 'Rigor Científico, Simplificações e Créditos'}
            </h3>
            <button
              type="button"
              onClick={() => setViewMode(activeSignalId ? 'signal' : 'map')}
              className="text-xs text-sky-300 underline"
            >
              {isEn ? 'Back' : 'Voltar'}
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-emerald-300">
              {isEn
                ? '1. Documented Historical & Scientific Facts'
                : '1. Fatos Históricos e Científicos Documentados'}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200 list-disc pl-4 leading-relaxed">
              {credits.documentedFacts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-sky-300">
              {isEn
                ? '2. Educational & Visual Simplifications'
                : '2. Simplificações Educativas e Visuais'}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
              {credits.educationalSimplifications.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-amber-300">
              {isEn
                ? '3. Narrative Framing & 3D Credits'
                : '3. Construção Narrativa & Créditos 3D'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {credits.fictionalElements[0]}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {credits.modelCredits[0]}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. MAPA ESPACIAL DE SINAIS (ABERTURA E PROGRESSÃO)
         ===================================================================== */}
      {viewMode === 'map' && (
        <div className="space-y-3.5 animate-fadeIn">
          {/* Mensagem do Sistema de Arquivos */}
          <div className="rounded-2xl bg-gradient-to-br from-[#091C3A] via-[#061329] to-[#040B18] border border-sky-400/45 p-4 space-y-2.5 shadow-lg">
            <div className="text-[10px] font-mono uppercase tracking-widest text-sky-300">
              {premise.systemHeader}
            </div>
            <blockquote className="text-xs sm:text-sm text-slate-100 italic leading-relaxed border-l-2 border-amber-400 pl-3">
              {premise.openingQuote}
            </blockquote>
            <p className="text-[11px] text-slate-400 leading-snug">
              {premise.fictionalFramingNote}
            </p>

            {/* Ação imediata de abertura */}
            {reconstructedCount === 0 && (
              <button
                type="button"
                onClick={() => handleOpenSignal('j002e3')}
                className="w-full mt-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#020814] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>{premise.firstActionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lista dos 3 Sinais no Mapa */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-display font-bold uppercase tracking-wider text-sky-300">
                {isEn ? 'Archive Signal Map' : 'Mapa de Sinais do Arquivo'}
              </h3>
              {reconstructedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playResetTone();
                    onResetEchoes();
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isEn ? 'Reset archive' : 'Reiniciar arquivo'}</span>
                </button>
              )}
            </div>

            {ECHOES_SIGNAL_ORDER.map((sigId, idx) => {
              const sig = signals[sigId];
              const unlocked = isSignalUnlocked(sigId, echoesState);
              const reconstructed = echoesState.reconstructedSignals.includes(sigId);
              const cluesCount = (echoesState.discoveredClues[sigId] ?? []).length;

              return (
                <div
                  key={sigId}
                  className={`rounded-2xl border p-3.5 transition-all ${
                    reconstructed
                      ? 'bg-[#071D26]/90 border-emerald-400/55 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                      : unlocked
                      ? 'bg-[#07152D]/95 border-sky-400/50 hover:border-amber-400/70'
                      : 'bg-[#040A16]/75 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl border p-1.5 shrink-0 flex items-center justify-center ${
                          reconstructed
                            ? 'bg-[#04151F] border-emerald-400'
                            : unlocked
                            ? 'bg-[#040B18] border-amber-400/60'
                            : 'bg-[#030710] border-slate-800'
                        }`}
                      >
                        {reconstructed ? (
                          <ArtifactCartoonIcon
                            id={sig.relatedArtifactId}
                            className="w-full h-full"
                          />
                        ) : unlocked ? (
                          <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-sky-300 border border-slate-700">
                            {sig.signalCode}
                          </span>
                          {reconstructed ? (
                            <span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              {isEn ? 'Identified' : 'Identificado'}
                            </span>
                          ) : unlocked ? (
                            <span className="text-[10px] font-mono text-amber-300">
                              {isEn ? 'Clues:' : 'Pistas:'} {cluesCount}/3
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              {isEn ? 'Awaiting Signal #01' : 'Aguardando Sinal #01'}
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-bold text-sm sm:text-base text-white mt-1">
                          {reconstructed
                            ? sig.reconstructedTitle
                            : isEn
                            ? `Unknown Signal #0${idx + 1}: “${sig.unidentifiedTitle}”`
                            : `Sinal Desconhecido #0${idx + 1}: “${sig.unidentifiedTitle}”`}
                        </h4>

                        <p className="text-xs text-slate-300 mt-0.5">
                          {reconstructed
                            ? `${sig.reconstructedMission} · ${sig.reconstructedYear}`
                            : sig.unidentifiedLocation}
                        </p>

                        {reconstructed && (
                          <p className="text-[11px] text-emerald-200/90 italic mt-1.5 border-l-2 border-emerald-400/60 pl-2">
                            “{sig.legacySentence}”
                          </p>
                        )}
                      </div>
                    </div>

                    {unlocked && (
                      <button
                        type="button"
                        onClick={() => handleOpenSignal(sigId)}
                        className={`shrink-0 px-3 py-2 rounded-xl font-display font-semibold text-xs flex items-center gap-1.5 transition-all ${
                          reconstructed
                            ? 'bg-[#0B2638] hover:bg-[#11364F] text-emerald-200 border border-emerald-400/40'
                            : 'bg-sky-400 hover:bg-sky-300 text-[#020814] shadow-md'
                        }`}
                      >
                        <span>
                          {reconstructed
                            ? isEn
                              ? 'Revisit'
                              : 'Revisitar'
                            : isEn
                            ? 'Investigate'
                            : 'Investigar'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão para o Desfecho quando as 3 investigações estiverem concluídas */}
          {reconstructedCount === 3 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-emerald-500/20 border-2 border-amber-400 p-4 space-y-2.5 shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 font-display font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>
                  {isEn ? 'All 3 signals identified!' : 'Os 3 sinais foram identificados!'}
                </span>
              </div>
              <p className="text-xs text-slate-100 leading-relaxed">
                {isEn
                  ? 'Every individual record has been recovered. Open the final stage to connect each object to its legacy.'
                  : 'Todos os registros individuais foram recuperados. Acesse a etapa final para conectar cada objeto ao seu legado.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playMissionClick();
                  setViewMode('final_reconstruction');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#020814] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>
                  {isEn
                    ? 'Open Final Reconstruction: “What Was Left Behind”'
                    : 'Abrir Reconstrução Final: “O que ficou para trás”'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          2. VISÃO DE INVESTIGAÇÃO ATIVA (ETAPAS 1, 2 E 3 + DICAS GRADUAIS)
         ===================================================================== */}
      {viewMode === 'signal' && signalConfig && (
        <div className="space-y-3.5 animate-fadeIn">
          {/* Cabeçalho da Investigação: Pergunta Central + Botão de Dica Sempre Disponível */}
          <div className="rounded-2xl bg-[#07152D] border border-sky-400/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-400/30">
                {signalConfig.signalCode} · “{signalConfig.unidentifiedTitle}”
              </span>

              {activeStep !== 'resolved' && (
                <button
                  type="button"
                  onClick={handleCycleHint}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-display font-semibold flex items-center gap-1.5 transition-all ${
                    inactivityPulse
                      ? 'bg-amber-400 text-[#020814] border-white animate-pulse shadow-[0_0_16px_rgba(251,191,36,0.7)]'
                      : hintLevel > 0
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#0A1E3F] hover:bg-[#102B57] border-amber-400/40 text-amber-300'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    {hintLevel === 0
                      ? isEn
                        ? 'Get Hint'
                        : 'Pedir Dica'
                      : isEn
                      ? `Hint ${hintLevel}/3 (Next)`
                      : `Dica ${hintLevel}/3 (Próxima)`}
                  </span>
                </button>
              )}
            </div>

            <h3 className="font-display font-bold text-sm sm:text-base text-white leading-snug">
              {isEn ? 'Central Question:' : 'Pergunta Central:'} “{signalConfig.centralQuestion}”
            </h3>

            {/* Mensagem curta e dispensável do sistema de arquivo */}
            {!archiveBannerDismissed && activeStep === 'locate_clues' && (
              <div className="rounded-xl bg-[#040C1B] border border-slate-800 p-2.5 flex items-start justify-between gap-2 text-xs text-slate-300">
                <span>{signalConfig.introArchiveMessage}</span>
                <button
                  type="button"
                  onClick={() => setArchiveBannerDismissed(true)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 shrink-0"
                >
                  OK
                </button>
              </div>
            )}

            {/* Gaveta de Dica Gradual (Nível 1: Região -> Nível 2: Ação -> Nível 3: Direta) */}
            {hintLevel > 0 && activeStep !== 'resolved' && (
              <div className="rounded-xl bg-amber-500/15 border border-amber-400/50 p-3 text-xs text-amber-100 space-y-1 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] uppercase text-amber-300">
                    {isEn
                      ? `System Assistance · Level ${hintLevel} of 3`
                      : `Auxílio do Sistema · Nível ${hintLevel} de 3`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHintLevel(0)}
                    className="text-[10px] text-amber-300 hover:underline"
                  >
                    {isEn ? 'Close hint' : 'Fechar dica'}
                  </button>
                </div>
                <p className="leading-relaxed">
                  {hintLevel === 1 && signalConfig.hintsByStep[activeStep].regionHint}
                  {hintLevel === 2 && signalConfig.hintsByStep[activeStep].actionHint}
                  {hintLevel === 3 && signalConfig.hintsByStep[activeStep].directHint}
                </p>
              </div>
            )}
          </div>

          {/* Barra das 3 Etapas Visíveis da Investigação */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#030914] border border-slate-800">
            {(
              [
                {
                  id: 'locate_clues',
                  num: 1,
                  label: isEn ? 'Locate clues' : 'Localizar pistas',
                },
                {
                  id: 'experiment',
                  num: 2,
                  label: isEn ? 'Interact' : 'Interagir',
                },
                {
                  id: 'interpret',
                  num: 3,
                  label: isEn ? 'Interpret' : 'Interpretar',
                },
              ] as const
            ).map((st) => {
              const clues = echoesState.discoveredClues[signalConfig.id] ?? [];
              const expDone = echoesState.completedExperiments.includes(signalConfig.id);
              const isSolved = echoesState.reconstructedSignals.includes(signalConfig.id);

              const isUnlockedStep =
                st.id === 'locate_clues' ||
                (st.id === 'experiment' && (clues.length >= 3 || isSolved)) ||
                (st.id === 'interpret' && (expDone || isSolved));

              const isActive = activeStep === st.id;
              const isCompletedStep =
                (st.id === 'locate_clues' && clues.length >= 3) ||
                (st.id === 'experiment' && expDone) ||
                (st.id === 'interpret' && isSolved);

              return (
                <button
                  key={st.id}
                  type="button"
                  disabled={!isUnlockedStep}
                  onClick={() => {
                    soundEffects.playMissionClick();
                    setActiveStep(st.id);
                    setHintLevel(0);
                  }}
                  className={`min-h-[44px] md:min-h-0 py-1.5 px-2 rounded-lg text-[11px] font-display font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-[#0F274D] text-white border border-sky-400/50 shadow'
                      : isCompletedStep
                      ? 'text-emerald-300 hover:bg-white/5'
                      : isUnlockedStep
                      ? 'text-slate-300 hover:bg-white/5'
                      : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                      isCompletedStep
                        ? 'bg-emerald-400 text-[#020814]'
                        : isActive
                        ? 'bg-sky-400 text-[#020814]'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompletedStep ? '✓' : st.num}
                  </span>
                  <span className="truncate">{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* =================================================================
              ETAPA 1: LOCALIZAR PISTAS (MODO MISTÉRIO 3D COM BOTÃO DE MOSTRAR/ESCONDER PISTAS)
             ================================================================= */}
          {activeStep === 'locate_clues' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="rounded-xl bg-[#051022] border border-slate-800 p-3.5 space-y-3">
                {/* Cabeçalho com contador de pistas + Botão Mostrar / Esconder Pistas */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-display font-bold text-sky-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {isEn
                      ? `Clues Found (${discoveredClueIdsForCurrent.length} of 3)`
                      : `Pistas Encontradas (${discoveredClueIdsForCurrent.length} de 3)`}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {onRequestMinimize && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playMissionClick();
                          onRequestMinimize();
                        }}
                        className="md:hidden min-h-[44px] px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400 text-xs font-display font-bold text-sky-100 flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                        <span>{isEn ? 'Explore 3D Model' : 'Explorar Modelo 3D'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playMissionClick();
                        onToggleRevealCluesList();
                      }}
                      className={`min-h-[44px] md:min-h-0 px-3 py-1.5 rounded-xl border text-xs font-display font-semibold flex items-center gap-1.5 transition-all ${
                        revealCluesList
                          ? 'bg-[#0E2750] border-sky-400 text-sky-100 shadow-sm'
                          : 'bg-[#091A36] hover:bg-[#112A54] border-amber-400/50 text-amber-200'
                      }`}
                    >
                      {revealCluesList ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-sky-300" />
                          <span>{isEn ? 'Hide clues' : 'Esconder pistas'}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isEn ? 'Show clues' : 'Mostrar pistas'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Modo Mistério (Pistas ocultas na lista): o usuário procura os brilhos discretos no modelo 3D */}
                {!revealCluesList ? (
                  <div className="space-y-2.5">
                    <div className="rounded-xl bg-[#030A18] border border-sky-400/25 p-3 text-xs text-slate-300 leading-relaxed">
                      {isEn ? (
                        <>
                          <strong className="text-amber-300">Mystery Mode active:</strong> Rotate the 3D model and look closely for{' '}
                          <strong>3 discreet glowing markers</strong> on its surface. If you prefer an easier view, click{' '}
                          <strong>“Show clues”</strong> above.
                        </>
                      ) : (
                        <>
                          <strong className="text-amber-300">Modo Mistério ativo:</strong> Gire o modelo 3D e procure com atenção{' '}
                          <strong>3 marcadores luminosos discretos</strong> diretamente sobre o objeto. Se preferir ver onde estão, clique em{' '}
                          <strong>“Mostrar pistas”</strong> acima.
                        </>
                      )}
                    </div>

                    {/* Lista apenas as pistas que o jogador já descobriu clicando no 3D */}
                    {discoveredClueIdsForCurrent.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-mono uppercase text-emerald-300 font-semibold">
                          {isEn ? 'Evidence Collected So Far:' : 'Evidências Já Coletadas:'}
                        </div>
                        {signalConfig.hotspots
                          .filter((h) => discoveredClueIdsForCurrent.includes(h.id))
                          .map((hotspot) => (
                            <div
                              key={hotspot.id}
                              onClick={() => onInspectHotspot(hotspot)}
                              className="rounded-xl p-3 bg-[#071D26]/90 border border-emerald-400/45 text-slate-100 cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-display font-bold flex items-center gap-2 text-emerald-200">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  {hotspot.label}
                                </span>
                                <span className="text-[10px] font-mono text-emerald-300">
                                  {isEn ? 'Recorded' : 'Registrada'}
                                </span>
                              </div>
                              <p className="text-xs text-amber-200 italic mt-1.5">
                                {hotspot.observation}
                              </p>
                              <p className="text-[11px] text-slate-300 mt-0.5">
                                {hotspot.archiveReaction}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Modo Lista de Pistas Visível (quando o usuário clica em "Mostrar pistas") */
                  <div className="grid grid-cols-1 gap-2 animate-fadeIn">
                    {signalConfig.hotspots.map((hotspot) => {
                      const discovered = discoveredClueIdsForCurrent.includes(hotspot.id);
                      const isSelected = selectedHotspotId === hotspot.id;

                      return (
                        <button
                          key={hotspot.id}
                          type="button"
                          onClick={() => onInspectHotspot(hotspot)}
                          className={`w-full text-left rounded-xl p-3 border transition-all ${
                            isSelected
                              ? 'bg-[#0E2750] border-amber-400 text-white shadow-[0_0_18px_rgba(251,191,36,0.2)]'
                              : discovered
                              ? 'bg-[#071D26]/85 border-emerald-400/45 text-slate-100'
                              : 'bg-[#08152C] hover:bg-[#0D2144] border-slate-700/80 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-display font-bold flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                                  discovered
                                    ? 'bg-emerald-400 text-[#020814]'
                                    : 'bg-sky-400/20 border border-sky-400 text-sky-300'
                                }`}
                              >
                                {discovered ? '✓' : hotspot.indexNumber}
                              </span>
                              {hotspot.label}
                            </span>
                            <span className="text-[10px] font-mono text-sky-300">
                              {discovered
                                ? isEn
                                  ? 'Evidence logged'
                                  : 'Evidência registrada'
                                : isEn
                                ? 'Inspect 3D →'
                                : 'Inspecionar 3D →'}
                            </span>
                          </div>

                          {discovered && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                              <p className="text-xs text-amber-200 italic">
                                {hotspot.observation}
                              </p>
                              <p className="text-[11px] text-slate-300">
                                {hotspot.archiveReaction}
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botão para avançar para a Etapa 2 assim que as 3 pistas forem coletadas */}
              {discoveredClueIdsForCurrent.length >= 3 && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playMissionClick();
                    setActiveStep('experiment');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#020814] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all animate-fadeIn"
                >
                  <Sliders className="w-4 h-4" />
                  <span>
                    {isEn
                      ? 'Advance to Step 2: Interactive Experiment'
                      : 'Avançar para a Etapa 2: Realizar Interação'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* =================================================================
              ETAPA 2: MINI-LABORATÓRIOS DE INTERAÇÃO (J002E3, LRRR, OPPORTUNITY)
             ================================================================= */}
          {activeStep === 'experiment' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="rounded-2xl bg-[#061329] border border-sky-400/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-display font-bold text-xs sm:text-sm text-amber-300 uppercase tracking-wider">
                    {signalConfig.experimentTitle}
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-[10px] text-sky-200">
                    {isEn ? 'Educational Simulation' : 'Simulação Educativa'}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {signalConfig.experimentInstruction}
                </p>

                {/* --- MINI-LAB 1: ANALISADOR ESPECTRAL DO J002E3 --- */}
                {signalConfig.id === 'j002e3' && (
                  <div className="space-y-3 pt-1">
                    <div className="rounded-xl bg-[#030A17] border border-amber-400/50 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-amber-300">
                          {isEn
                            ? 'COLLECTED SAMPLE: WHITE COATING (CLUE #3)'
                            : 'AMOSTRA COLETADA: REVESTIMENTO BRANCO (PISTA #3)'}
                        </span>
                        <span className="font-mono text-sky-300">
                          {isEn ? 'Peak: 92% Reflection' : 'Pico: 92% Reflexão'}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5 items-end h-12 pt-2 px-2 bg-[#061224] rounded-lg">
                        {[38, 76, 92, 94, 89, 84].map((val, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t bg-gradient-to-t from-sky-500 to-amber-300"
                              style={{ height: `${Math.round(val * 0.36)}px` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                        <span>UV</span>
                        <span>{isEn ? 'Visible Light' : 'Luz Visível'}</span>
                        <span>{isEn ? 'Infrared' : 'Infravermelho'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleSelectSpectralReference('rock')}
                        className={`text-left rounded-xl p-3 border transition-all ${
                          selectedSpectralRef === 'rock'
                            ? 'bg-rose-950/50 border-rose-400 text-white'
                            : 'bg-[#08162E] hover:bg-[#0D2144] border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-display font-bold">
                          {isEn ? 'Reference A: Rocky Material' : 'Referência A: Material Rochoso'}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isEn
                            ? 'Natural asteroid rock (Low reflection: 12%–24%)'
                            : 'Rocha de asteroide natural (Baixo brilho: 12%–24%)'}
                        </p>
                        <div className="grid grid-cols-6 gap-1 items-end h-10 mt-2 px-1.5 bg-[#040B18] rounded">
                          {[12, 15, 19, 22, 24, 21].map((val, i) => (
                            <div
                              key={i}
                              className="w-full rounded-t bg-slate-500"
                              style={{ height: `${Math.round(val * 0.34)}px` }}
                            />
                          ))}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectSpectralReference('rocket_paint')}
                        className={`text-left rounded-xl p-3 border transition-all ${
                          selectedSpectralRef === 'rocket_paint'
                            ? 'bg-emerald-950/50 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                            : 'bg-[#08162E] hover:bg-[#0D2144] border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-display font-bold">
                          {isEn ? 'Reference B: Rocket Coating' : 'Referência B: Revestimento de Foguete'}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isEn
                            ? 'White protective rocket paint (High reflection: 88%–94%)'
                            : 'Tinta branca protetora de foguete (Alto brilho: 88%–94%)'}
                        </p>
                        <div className="grid grid-cols-6 gap-1 items-end h-10 mt-2 px-1.5 bg-[#040B18] rounded">
                          {[36, 75, 91, 94, 88, 83].map((val, i) => (
                            <div
                              key={i}
                              className="w-full rounded-t bg-gradient-to-t from-sky-500 to-amber-300"
                              style={{ height: `${Math.round(val * 0.32)}px` }}
                            />
                          ))}
                        </div>
                      </button>
                    </div>

                    {spectralFeedback && (
                      <div
                        className={`rounded-xl p-2.5 text-xs border ${
                          selectedSpectralRef === 'rocket_paint'
                            ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                            : 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                        }`}
                      >
                        {spectralFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* --- MINI-LAB 2: DISPARO DE PULSO LASER TERRA-LUA (LRRR) --- */}
                {signalConfig.id === 'lrrr' && (
                  <div className="space-y-3 pt-1">
                    <div className="rounded-xl bg-[#020712] border border-sky-400/40 p-3 relative overflow-hidden">
                      <svg
                        viewBox="0 0 360 130"
                        className="w-full h-32 select-none"
                        role="img"
                        aria-label={
                          isEn
                            ? 'Laser alignment diagram between Earth Station and Lunar Reflector'
                            : 'Diagrama de alinhamento do feixe laser entre a Estação na Terra e o Retrorefletor na Lua'
                        }
                      >
                        <line x1="0" y1="65" x2="360" y2="65" stroke="#0F2447" strokeDasharray="3 3" />

                        <circle cx="36" cy="65" r="22" fill="#0EA5E9" opacity="0.25" />
                        <circle cx="36" cy="65" r="15" fill="#0284C7" stroke="#7DD3FC" strokeWidth="1.5" />
                        <text x="36" y="102" textAnchor="middle" fill="#BAE6FD" fontSize="9" fontFamily="monospace">
                          {isEn ? 'Earth Station' : 'Estação Terra'}
                        </text>

                        <circle cx="312" cy="65" r="28" fill="#334155" stroke="#94A3B8" strokeWidth="1.5" />
                        <circle
                          cx="296"
                          cy="55"
                          r="11"
                          fill="rgba(56,189,248,0.18)"
                          stroke="#38BDF8"
                          strokeDasharray="2 2"
                        />
                        <rect
                          x="292"
                          y="51"
                          width="8"
                          height="8"
                          rx="1.5"
                          fill="#38BDF8"
                          stroke="#FFFFFF"
                        />
                        <text x="312" y="108" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontFamily="monospace">
                          {isEn ? 'Lunar Reflector' : 'Refletor Lunar'}
                        </text>

                        {(() => {
                          const targetY =
                            55 -
                            ((laserElevation - TARGET_EL) * 1.15 +
                              (laserAzimuth - TARGET_AZ) * 0.65);
                          const clampedY = Math.max(8, Math.min(122, targetY));

                          return (
                            <>
                              <line
                                x1="51"
                                y1="65"
                                x2="296"
                                y2={clampedY}
                                stroke="#38BDF8"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                                opacity="0.65"
                              />
                              <circle
                                cx="296"
                                cy={clampedY}
                                r="4"
                                fill="none"
                                stroke="#FBBF24"
                                strokeWidth="1.5"
                              />

                              {(isLaserAnimating || lastShotResult) && (
                                <line
                                  x1="51"
                                  y1="65"
                                  x2="296"
                                  y2={clampedY}
                                  stroke={lastShotResult?.hit ? '#10B981' : '#F59E0B'}
                                  strokeWidth={lastShotResult?.hit ? '3' : '2'}
                                />
                              )}

                              {lastShotResult?.hit && (
                                <line
                                  x1="296"
                                  y1="55"
                                  x2="51"
                                  y2="65"
                                  stroke="#34D399"
                                  strokeWidth="2"
                                  strokeDasharray="5 3"
                                />
                              )}
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block rounded-xl bg-[#040C1C] border border-slate-800 p-2.5">
                        <div className="flex justify-between text-[11px] font-mono text-slate-300">
                          <span>{isEn ? '1. Beam Direction:' : '1. Direção do Feixe:'}</span>
                          <span className="text-sky-300 font-bold">{laserAzimuth}°</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={100}
                          value={laserAzimuth}
                          onChange={(e) => setLaserAzimuth(Number(e.target.value))}
                          className="w-full mt-1.5 accent-sky-400 cursor-pointer"
                        />
                      </label>

                      <label className="block rounded-xl bg-[#040C1C] border border-slate-800 p-2.5">
                        <div className="flex justify-between text-[11px] font-mono text-slate-300">
                          <span>{isEn ? '2. Vertical Elevation:' : '2. Altura do Feixe:'}</span>
                          <span className="text-sky-300 font-bold">{laserElevation}°</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          value={laserElevation}
                          onChange={(e) => setLaserElevation(Number(e.target.value))}
                          className="w-full mt-1.5 accent-sky-400 cursor-pointer"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleFireLaserPulse}
                      disabled={isLaserAnimating}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#02100B] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      <span>
                        {isLaserAnimating
                          ? isEn
                            ? 'Sending laser pulse...'
                            : 'Enviando pulso laser...'
                          : isEn
                          ? 'Send pulse'
                          : 'Enviar pulso'}
                      </span>
                    </button>

                    {lastShotResult && (
                      <div
                        className={`rounded-xl p-3 text-xs border ${
                          lastShotResult.hit
                            ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-100'
                            : 'bg-amber-500/15 border-amber-400/50 text-amber-100'
                        }`}
                      >
                        {lastShotResult.message}
                      </div>
                    )}
                  </div>
                )}

                {/* --- MINI-LAB 3: ORDENAÇÃO CAUSAL + CONTROLE DE POEIRA (OPPORTUNITY) --- */}
                {signalConfig.id === 'opportunity' && (
                  <div className="space-y-3.5 pt-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-bold text-sky-300">
                          {isEn
                            ? 'Part 1: Order the 3 records (Cause → Effect)'
                            : 'Parte 1: Ordene os 3 registros (Causa → Consequência)'}
                        </span>
                        {isSequenceCorrect && (
                          <span className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            {isEn ? 'Correct order!' : 'Ordem correta!'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {orderedCards.map((card, idx) => {
                          const isSelected = selectedCardId === card.id;
                          return (
                            <div
                              key={card.id}
                              draggable
                              onDragStart={() => setDraggedCardIdx(idx)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (draggedCardIdx === null || draggedCardIdx === idx) return;
                                const copy = [...orderedCardIds];
                                const [moved] = copy.splice(draggedCardIdx, 1);
                                copy.splice(idx, 0, moved);
                                setOrderedCardIds(copy);
                                setDraggedCardIdx(null);
                                soundEffects.playMissionClick();
                              }}
                              onClick={() => setSelectedCardId(card.id)}
                              className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                isSequenceCorrect
                                  ? 'bg-[#07221D] border-emerald-400/50 text-emerald-100'
                                  : isSelected
                                  ? 'bg-[#0D2449] border-amber-400 text-white'
                                  : 'bg-[#040C1C] border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-bold flex items-center justify-center shrink-0 text-amber-300">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-medium">{card.text}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveCard(idx, -1);
                                  }}
                                  className="px-2 py-1 rounded bg-[#0A1931] hover:bg-[#132C52] disabled:opacity-35 border border-slate-700 text-[10px] font-semibold text-sky-200 flex items-center gap-0.5"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                  <span>{isEn ? 'Move earlier' : 'Mover antes'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === orderedCards.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveCard(idx, 1);
                                  }}
                                  className="px-2 py-1 rounded bg-[#0A1931] hover:bg-[#132C52] disabled:opacity-35 border border-slate-700 text-[10px] font-semibold text-sky-200 flex items-center gap-0.5"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                  <span>{isEn ? 'Move later' : 'Mover depois'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#040C1C] border border-amber-400/40 p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-bold text-amber-300">
                          {isEn
                            ? 'Part 2: Atmospheric Dust Amount Control'
                            : 'Parte 2: Controle de Quantidade de Poeira'}
                        </span>
                        <span className="font-mono font-bold text-amber-200">
                          {dustPercent}% {isEn ? 'Dust' : 'Poeira'}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={dustPercent}
                        onChange={(e) => handleDustSliderChange(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div
                          className="rounded-lg p-2 border border-slate-800 text-center transition-colors"
                          style={{
                            backgroundColor: `rgba(${Math.round(
                              180 - dustPercent * 1.4
                            )}, ${Math.round(90 - dustPercent * 0.7)}, ${Math.round(
                              45 - dustPercent * 0.35
                            )}, 0.45)`,
                          }}
                        >
                          <Sun className="w-4 h-4 mx-auto text-amber-300" />
                          <div className="text-[10px] text-slate-300 mt-1">
                            {isEn ? 'Martian Sky' : 'Céu Marciano'}
                          </div>
                          <div className="text-xs font-mono font-bold text-white">
                            {dustPercent > 75
                              ? isEn
                                ? 'Darkened'
                                : 'Escurecido'
                              : dustPercent > 40
                              ? isEn
                                ? 'Hazy'
                                : 'Turvo'
                              : isEn
                              ? 'Clear'
                              : 'Límpido'}
                          </div>
                        </div>

                        <div className="rounded-lg bg-[#071428] p-2 border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-400">
                            {isEn ? 'Light Received' : 'Luz nos Painéis'}
                          </div>
                          <div className="text-xs font-mono font-bold text-sky-300 mt-1">
                            {Math.max(4, 100 - Math.round(dustPercent * 0.94))}%
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-sky-400 transition-all"
                              style={{
                                width: `${Math.max(4, 100 - Math.round(dustPercent * 0.94))}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="rounded-lg bg-[#071428] p-2 border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-400">
                            {isEn ? 'Available Power' : 'Energia Disponível'}
                          </div>
                          <div
                            className={`text-xs font-mono font-bold mt-1 ${
                              dustPercent >= 70 ? 'text-rose-400' : 'text-emerald-300'
                            }`}
                          >
                            {dustPercent >= 75
                              ? isEn
                                ? 'Critical (Silent)'
                                : 'Crítica (Silêncio)'
                              : dustPercent >= 45
                              ? isEn
                                ? 'Dropping'
                                : 'Em Queda'
                              : isEn
                              ? 'Stable'
                              : 'Estável'}
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                dustPercent >= 70 ? 'bg-rose-500' : 'bg-emerald-400'
                              }`}
                              style={{
                                width: `${Math.max(3, 100 - Math.round(dustPercent * 0.95))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                  {signalConfig.experimentEducationalNote}
                </p>
              </div>

              {echoesState.completedExperiments.includes(signalConfig.id) && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playMissionClick();
                    setActiveStep('interpret');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#020814] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all animate-fadeIn"
                >
                  <span>
                    {isEn
                      ? 'Advance to Step 3: Interpret the Discovery'
                      : 'Avançar para a Etapa 3: Interpretar a Descoberta'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* =================================================================
              ETAPA 3: INTERPRETAÇÃO BASEADA NAS EVIDÊNCIAS
             ================================================================= */}
          {activeStep === 'interpret' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="rounded-xl bg-[#051022] border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-sky-300 font-bold">
                    {isEn ? 'Evidence Gathered in the Archive:' : 'Evidências Reunidas no Arquivo:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playMissionClick();
                      setActiveStep('experiment');
                    }}
                    className="text-[11px] font-semibold text-amber-300 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isEn ? 'Repeat experiment' : 'Repetir experiência'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {signalConfig.hotspots.map((h) => (
                    <div
                      key={h.id}
                      className="text-xs text-slate-200 bg-[#081730] rounded-lg px-2.5 py-1.5 border border-slate-800 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{h.evidenceTitle}:</strong> {h.evidenceDetail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#07152D] border border-amber-400/50 p-4 space-y-3">
                <h4 className="font-display font-bold text-sm sm:text-base text-white">
                  {signalConfig.interpretationPrompt}
                </h4>

                <div className="space-y-2">
                  {signalConfig.hypotheses.map((hyp) => (
                    <button
                      key={hyp.id}
                      type="button"
                      onClick={() => handleSelectHypothesis(hyp.id)}
                      className="w-full text-left rounded-xl bg-[#091D3C] hover:bg-[#102A54] border border-slate-700 hover:border-amber-400 p-3 transition-all"
                    >
                      <div className="text-xs sm:text-sm font-display font-bold text-white">
                        {hyp.label}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {hyp.description}
                      </p>
                    </button>
                  ))}
                </div>

                {hypothesisFeedback && (
                  <div className="rounded-xl bg-amber-500/15 border border-amber-400 p-3 flex items-start gap-2.5 text-xs text-amber-100 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-300">
                        {isEn ? 'Verification Clue:' : 'Pista de Verificação:'}
                      </span>
                      <span>{hypothesisFeedback}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              ETAPA CONCLUÍDA (REVELAÇÃO, TRAJETÓRIA / LINHA DO TEMPO & RECOMPENSA)
             ================================================================= */}
          {activeStep === 'resolved' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="rounded-2xl bg-gradient-to-br from-[#08242B] via-[#07192E] to-[#040B18] border-2 border-emerald-400/75 p-4 space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono font-bold uppercase text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isEn ? 'Record Reconstructed' : 'Registro Reconstruído'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-300">
                    {signalConfig.reconstructedYear}
                  </span>
                </div>

                <div>
                  <h4 className="font-display font-bold text-lg text-white">
                    {signalConfig.reconstructedTitle}
                  </h4>
                  <p className="text-xs font-medium text-sky-300">
                    {signalConfig.reconstructedMission}
                  </p>
                </div>

                <blockquote className="rounded-xl bg-[#04101E] border-l-4 border-amber-400 p-3 text-xs sm:text-sm text-amber-100 italic">
                  {signalConfig.narrativeReward}
                </blockquote>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {signalConfig.historicalRevealSummary}
                </p>

                {signalConfig.id === 'j002e3' && (
                  <div className="rounded-xl bg-[#030915] border border-slate-800 p-3 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-sky-300 font-semibold">
                      {isEn
                        ? 'Rediscovery Trajectory (1969 → Solar Orbit → 2002):'
                        : 'Trajetória de Redescoberta (1969 → Órbita Solar → 2002):'}
                    </div>
                    <svg viewBox="0 0 340 90" className="w-full h-20">
                      <ellipse
                        cx="170"
                        cy="45"
                        rx="140"
                        ry="32"
                        fill="none"
                        stroke="#38BDF8"
                        strokeDasharray="4 4"
                        opacity="0.55"
                      />
                      <circle cx="65" cy="45" r="9" fill="#0EA5E9" />
                      <text x="65" y="70" textAnchor="middle" fill="#BAE6FD" fontSize="8">
                        {isEn ? 'Earth (1969)' : 'Terra (1969)'}
                      </text>
                      <circle cx="170" cy="13" r="5" fill="#F59E0B" />
                      <text x="170" y="28" textAnchor="middle" fill="#FDE68A" fontSize="8">
                        {isEn ? '33 yrs in Solar Orbit' : '33 anos em Órbita Solar'}
                      </text>
                      <circle cx="275" cy="45" r="8" fill="#10B981" />
                      <text x="275" y="70" textAnchor="middle" fill="#A7F3D0" fontSize="8">
                        {isEn ? 'Recaptured 2002 (J002E3)' : 'Recaptura 2002 (J002E3)'}
                      </text>
                    </svg>
                  </div>
                )}

                {signalConfig.timelineMilestones && (
                  <div className="rounded-xl bg-[#030915] border border-slate-800 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold uppercase text-amber-300">
                        {isEn
                          ? 'Timeline: Planned (90 Days) vs. Achieved (5,111 Days)'
                          : 'Linha do Tempo: Planejado (90 Dias) vs. Realizado (5.111 Dias)'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{isEn ? 'Planned: 90 Days (~3 mo)' : 'Meta Planejada: 90 Dias (~3 meses)'}</span>
                        <span className="text-emerald-300 font-bold">
                          {isEn
                            ? 'Achieved: 5,111 Days (~15 yrs · 45.16 km)'
                            : 'Realizado: 5.111 Dias (~15 anos · 45,16 km)'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden flex">
                        <div className="h-full bg-amber-400" style={{ width: '6%' }} />
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-emerald-400"
                          style={{ width: '94%' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {signalConfig.timelineMilestones.map((ms) => {
                        const isExpanded = expandedMilestoneId === ms.id;
                        return (
                          <div
                            key={ms.id}
                            className="rounded-lg bg-[#071429] border border-slate-800 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMilestoneId(isExpanded ? null : ms.id)
                              }
                              className="w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span className="font-mono text-[10px] text-amber-300 block">
                                  {ms.solOrDate}
                                </span>
                                <span className="font-display font-bold text-white">
                                  {ms.title}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/70 pt-1.5">
                                {ms.expandedDetail}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playMissionClick();
                    setActiveStep('experiment');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#091A36] hover:bg-[#102952] border border-sky-400/40 text-xs font-semibold text-sky-200 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Review Experiment' : 'Rever Experimento'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playMissionClick();
                    onSelectSignal(null);
                    setViewMode(
                      reconstructedCount >= 3 ? 'final_reconstruction' : 'map'
                    );
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#020814] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>
                    {reconstructedCount >= 3
                      ? isEn
                        ? 'Go to Finale: “What Was Left Behind”'
                        : 'Ir para o Desfecho: “O que ficou para trás”'
                      : isEn
                      ? 'Continue on Signal Map'
                      : 'Continuar no Mapa de Sinais'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          6. DESFECHO — “O QUE FICOU PARA TRÁS” (CONEXÃO DE LEGADOS)
         ===================================================================== */}
      {viewMode === 'final_reconstruction' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="rounded-2xl bg-[#07152D] border border-amber-400/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                {isEn
                  ? 'Archive Finale · “What Was Left Behind”'
                  : 'Desfecho do Arquivo · “O que ficou para trás”'}
              </span>
              <button
                type="button"
                onClick={() => setShowEvidenceInFinal((prev) => !prev)}
                className="text-[11px] text-sky-300 underline flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>
                  {showEvidenceInFinal
                    ? isEn
                      ? 'Hide evidence'
                      : 'Ocultar evidências'
                    : isEn
                    ? 'Consult evidence'
                    : 'Consultar evidências'}
                </span>
              </button>
            </div>

            <h3 className="font-display font-bold text-base text-white">
              {isEn
                ? 'Connect each reconstructed object to its discovered legacy:'
                : 'Relacione cada objeto reconstruído ao legado descoberto:'}
            </h3>

            {showEvidenceInFinal && (
              <div className="rounded-xl bg-[#040B18] border border-slate-800 p-3 space-y-2 text-xs text-slate-300">
                {ECHOES_SIGNAL_ORDER.map((id) => {
                  const s = signals[id];
                  return (
                    <div key={id} className="border-b border-slate-800/80 last:border-none pb-1.5">
                      <strong className="text-sky-300">{s.reconstructedTitle}:</strong>{' '}
                      {s.legacySentence}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {ECHOES_SIGNAL_ORDER.map((id) => {
                const s = signals[id];
                const isMatched = Boolean(echoesState.finalLegacyMatched[id]);
                const isSelected = selectedSignalForMatch === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedSignalForMatch(id)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isMatched
                        ? 'bg-[#07241E] border-emerald-400 text-emerald-200'
                        : isSelected
                        ? 'bg-[#0E2750] border-amber-400 text-white shadow'
                        : 'bg-[#040C1C] border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 mx-auto mb-1">
                      <ArtifactCartoonIcon id={s.relatedArtifactId} className="w-full h-full" />
                    </div>
                    <div className="text-[11px] font-display font-bold truncate">
                      {s.reconstructedTitle.split('—')[0].trim()}
                    </div>
                    <div className="text-[9px] font-mono mt-0.5">
                      {isMatched
                        ? isEn
                          ? '✓ Linked'
                          : '✓ Conectado'
                        : isEn
                        ? 'Selected'
                        : 'Selecionado'}
                    </div>
                  </button>
                );
              })}
            </div>

            {!echoesState.isArchiveCompleted && (
              <div className="space-y-2 pt-1">
                <div className="text-xs text-amber-200">
                  {isEn ? (
                    <>
                      Which legacy sums up the story of{' '}
                      <strong>{signals[selectedSignalForMatch].reconstructedTitle}</strong>?
                    </>
                  ) : (
                    <>
                      Qual legado resume a história de{' '}
                      <strong>{signals[selectedSignalForMatch].reconstructedTitle}</strong>?
                    </>
                  )}
                </div>

                {[signals.lrrr, signals.opportunity, signals.j002e3].map((sigOption) => {
                  const alreadyUsed = Object.values(echoesState.finalLegacyMatched).includes(
                    sigOption.legacyMatchId
                  );
                  return (
                    <button
                      key={sigOption.legacyMatchId}
                      type="button"
                      disabled={alreadyUsed}
                      onClick={() => handleMatchLegacy(sigOption.legacyMatchId)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                        alreadyUsed
                          ? 'bg-[#051814] border-emerald-500/40 text-emerald-300 opacity-65'
                          : 'bg-[#081730] hover:bg-[#0F2852] border-slate-700 hover:border-amber-400 text-white'
                      }`}
                    >
                      {sigOption.legacyMatchLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {echoesState.isArchiveCompleted && (
            <div className="rounded-2xl bg-gradient-to-br from-[#0B2545] via-[#071830] to-[#040B18] border-2 border-amber-400 p-5 space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.3)] animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold uppercase">
                <Award className="w-5 h-5 text-amber-400" />
                <span>
                  {isEn
                    ? 'Space Archive Reconstructed (3 of 3)'
                    : 'Arquivo Espacial Reconstruído (3 de 3)'}
                </span>
              </div>

              <blockquote className="text-sm sm:text-base font-display font-medium text-white leading-relaxed border-l-4 border-amber-400 pl-3.5">
                {premise.finalConclusionQuote}
              </blockquote>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={onExploreFreely}
                  className="py-2.5 px-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-[#020814] font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Explore freely' : 'Explorar livremente'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className="py-2.5 px-3 rounded-xl bg-[#0A1E3D] hover:bg-[#122E59] border border-sky-400/50 text-sky-100 font-display font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Review discoveries' : 'Rever descobertas'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playResetTone();
                    onResetEchoes();
                    setViewMode('map');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#08152B] hover:bg-[#102344] border border-slate-700 text-slate-200 font-display font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Play again' : 'Jogar novamente'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
