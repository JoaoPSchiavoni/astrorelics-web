import React from 'react';
import { Volume2, VolumeX, Sparkles, Globe, Compass, Radio } from 'lucide-react';
import { CELESTIAL_BODY_ORDER } from '../../config/celestialBodies';
import { CelestialBodyId, ExperienceState, TravelPhase } from '../../types/experience';
import { getLocalizedBody, useLanguage } from '../../utils/i18n';
import { soundEffects } from '../../utils/soundEffects';

interface HeaderHudProps {
  selectedId: CelestialBodyId;
  targetTravelId: CelestialBodyId | null;
  experienceState: ExperienceState;
  travelPhase: TravelPhase;
  audioEnabled: boolean;
  reducedMotion: boolean;
  onSelectDestination: (id: CelestialBodyId) => void;
  onToggleAudio: () => void;
  /** Props para acesso direto às Missões na barra superior mobile */
  isMissionOpen?: boolean;
  echoesReconstructedCount?: number;
  hasActiveMissionRun?: boolean;
  onToggleMission?: () => void;
  isLandscapeMobile?: boolean;
}

const TRAVEL_PHASE_LABELS_PT: Record<TravelPhase, string> = {
  idle: 'Órbita Estável',
  acceleration: 'Aceleração Orbital...',
  cruise: 'Em Viagem Interplanetária...',
  arrival: 'Aproximação Final...',
};

const TRAVEL_PHASE_LABELS_EN: Record<TravelPhase, string> = {
  idle: 'Stable Orbit',
  acceleration: 'Orbital Acceleration...',
  cruise: 'Interplanetary Cruise...',
  arrival: 'Final Approach...',
};

export const HeaderHud: React.FC<HeaderHudProps> = ({
  selectedId,
  targetTravelId,
  experienceState,
  travelPhase,
  audioEnabled,
  reducedMotion,
  onSelectDestination,
  onToggleAudio,
  isMissionOpen = false,
  echoesReconstructedCount = 0,
  hasActiveMissionRun = false,
  onToggleMission,
  isLandscapeMobile = false,
}) => {
  const { lang, toggleLang } = useLanguage();
  const isEn = lang === 'en';
  const isTraveling = experienceState === 'traveling';
  const activeSelectorId = isTraveling && targetTravelId ? targetTravelId : selectedId;
  const phaseLabels = isEn ? TRAVEL_PHASE_LABELS_EN : TRAVEL_PHASE_LABELS_PT;

  const handleKeyDownSelector = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    if (isTraveling) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % CELESTIAL_BODY_ORDER.length;
      onSelectDestination(CELESTIAL_BODY_ORDER[nextIndex]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex =
        (currentIndex - 1 + CELESTIAL_BODY_ORDER.length) % CELESTIAL_BODY_ORDER.length;
      onSelectDestination(CELESTIAL_BODY_ORDER[prevIndex]);
    }
  };

  const handleToggleLanguage = () => {
    soundEffects.playMissionClick();
    toggleLang();
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-20 pointer-events-none ${
        isLandscapeMobile
          ? 'pt-safe-1 px-safe-3'
          : 'pt-safe-2 px-safe-2 sm:px-6 sm:pt-4 lg:px-7 lg:pt-5'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto flex ${
          isLandscapeMobile
            ? 'flex-row items-center justify-between gap-2'
            : 'flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3'
        }`}
      >
        {/* Identidade do projeto + Controles Rápidos no Mobile */}
        <div
          className={`flex items-center justify-between sm:justify-start gap-2 pointer-events-auto ${
            isLandscapeMobile ? 'shrink-0' : 'w-full sm:w-auto'
          }`}
        >
          <div className="flex items-center shrink-0">
            <img
              src="/logo-header.png"
              alt={
                isEn
                  ? 'AstroRelics — Interactive Space Exploration'
                  : 'AstroRelics — Exploração Espacial Interativa'
              }
              title={
                isEn
                  ? 'AstroRelics — Interactive Space Exploration'
                  : 'AstroRelics — Exploração Espacial Interativa'
              }
              className={`${
                isLandscapeMobile
                  ? 'h-8 w-auto'
                  : 'h-8 xs:h-9 sm:h-12 lg:h-14 w-auto max-w-[105px] sm:max-w-none'
              } object-contain select-none pointer-events-none drop-shadow-[0_0_14px_rgba(255,255,255,0.18)]`}
              draggable={false}
            />
            <h1 className="sr-only">
              {isEn
                ? 'AstroRelics — Interactive Space Exploration'
                : 'AstroRelics — Exploração Espacial Interativa'}
            </h1>
          </div>

          {/* Controles visíveis no canto direito no mobile (Missões + Idioma PT/EN + Áudio, todos >= 44x44px) */}
          {!isLandscapeMobile && (
            <div className="flex sm:hidden items-center gap-1.5">
              {onToggleMission && (
                <button
                  type="button"
                  onClick={onToggleMission}
                  aria-expanded={isMissionOpen}
                  aria-label={
                    isEn
                      ? 'Open Interactive Missions panel'
                      : 'Abrir painel de Missões Interativas'
                  }
                  className={`relative min-h-[44px] px-2.5 rounded-xl backdrop-blur-md border text-xs font-display font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isMissionOpen
                      ? 'bg-[#13284C]/95 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                      : 'bg-[#061226]/90 border-amber-400/60 text-amber-100 shadow-lg'
                  }`}
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                  <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isEn ? 'Missions' : 'Missões'}</span>
                  <span className="px-1 py-0.5 rounded bg-sky-500/20 border border-sky-400/35 text-[10px] font-mono text-sky-300 leading-none">
                    {echoesReconstructedCount}/3
                  </span>
                  {hasActiveMissionRun && (
                    <Radio className="w-3 h-3 text-sky-400 animate-pulse shrink-0" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleLanguage}
                aria-label={isEn ? 'Switch language to Portuguese' : 'Mudar idioma para Inglês'}
                title={isEn ? 'Switch to Português (PT)' : 'Mudar para English (EN)'}
                className="min-h-[44px] min-w-[44px] px-2 rounded-xl backdrop-blur-md bg-[#050C1A]/90 border border-sky-400/45 text-[11px] font-mono font-bold text-sky-200 flex items-center justify-center gap-0.5 transition-all"
              >
                <span className={lang === 'pt' ? 'text-amber-300 underline underline-offset-2' : 'text-slate-400'}>
                  PT
                </span>
                <span className="text-slate-600">/</span>
                <span className={lang === 'en' ? 'text-amber-300 underline underline-offset-2' : 'text-slate-400'}>
                  EN
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleAudio}
                aria-pressed={audioEnabled}
                aria-label={
                  audioEnabled
                    ? isEn
                      ? 'Mute background audio'
                      : 'Desativar áudio de fundo'
                    : isEn
                    ? 'Enable background audio'
                    : 'Ativar áudio de fundo'
                }
                className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl backdrop-blur-md border text-xs font-medium flex items-center justify-center gap-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  audioEnabled
                    ? 'bg-[#0A1E3C]/90 border-sky-400/60 text-sky-200'
                    : 'bg-[#050C1A]/85 border-slate-800/90 text-slate-300'
                }`}
              >
                {audioEnabled ? (
                  <Volume2 className="w-4 h-4 text-sky-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Seletor de destinos: acessível por teclado e toque único no celular (>= 44px de área de toque no mobile) */}
        <nav
          aria-label={isEn ? 'Space destinations selector' : 'Seletor de destinos espaciais'}
          className={`pointer-events-auto flex justify-center ${
            isLandscapeMobile ? 'w-auto' : 'w-full sm:w-auto'
          }`}
        >
          <div
            role="group"
            aria-label={isEn ? 'Destinations: Earth, Moon and Mars' : 'Destinos: Terra, Lua e Marte'}
            className="inline-flex items-center p-1 rounded-full bg-[#050C1A]/90 backdrop-blur-md border border-[#162847] shadow-[0_8px_30px_rgba(0,0,0,0.55)] w-full max-w-[360px] sm:w-auto sm:max-w-none"
          >
            {CELESTIAL_BODY_ORDER.map((id, idx) => {
              const body = getLocalizedBody(id, lang);
              const isCurrent = activeSelectorId === id;

              return (
                <button
                  key={id}
                  type="button"
                  disabled={isTraveling}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => onSelectDestination(id)}
                  onKeyDown={(e) => handleKeyDownSelector(e, idx)}
                  className={`relative flex-1 sm:flex-initial min-h-[44px] lg:min-h-0 px-3 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-display font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isCurrent
                      ? 'bg-[#0D254C] text-white border border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.25)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  } ${isTraveling ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
                >
                  <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${
                        isCurrent ? 'bg-sky-400' : 'bg-slate-600'
                      }`}
                    />
                    <span>{body.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Controles superiores direitos (Desktop / Tablet / Landscape Mobile) */}
        <div
          className={`${
            isLandscapeMobile ? 'flex' : 'hidden sm:flex'
          } items-center gap-2 pointer-events-auto`}
        >
          {isTraveling && !isLandscapeMobile && (
            <div
              role="status"
              aria-live="polite"
              className="px-3 py-1.5 rounded-full bg-[#08152C]/85 border border-sky-400/40 backdrop-blur-md text-xs text-sky-300 hidden lg:flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              <span>{phaseLabels[travelPhase]}</span>
            </div>
          )}

          {reducedMotion && !isLandscapeMobile && (
            <span
              title={
                isEn
                  ? 'Reduced motion preference detected'
                  : 'Preferência de movimento reduzido detectada no sistema'
              }
              className="px-2.5 py-1 rounded-full bg-[#061020]/80 border border-slate-700/70 text-[11px] text-slate-300 hidden xl:inline-block"
            >
              {isEn ? 'Reduced motion' : 'Movimento reduzido'}
            </span>
          )}

          {/* Em Landscape Mobile ou Tablet pequeno, inclui o botão de Missões na barra superior */}
          {onToggleMission && (
            <button
              type="button"
              onClick={onToggleMission}
              aria-expanded={isMissionOpen}
              className={`${
                isLandscapeMobile ? 'flex' : 'flex md:hidden'
              } min-h-[44px] px-3 rounded-full backdrop-blur-md border text-xs font-display font-bold items-center gap-1.5 transition-all ${
                isMissionOpen
                  ? 'bg-[#13284C]/95 border-amber-400 text-white'
                  : 'bg-[#061226]/90 border-amber-400/60 text-amber-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEn ? 'Missions' : 'Missões'}</span>
              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-[10px] font-mono text-sky-300">
                {echoesReconstructedCount}/3
              </span>
            </button>
          )}

          {/* Botão de Troca de Idioma (PT / EN) */}
          <button
            type="button"
            onClick={handleToggleLanguage}
            aria-label={isEn ? 'Switch language to Portuguese' : 'Mudar idioma para Inglês'}
            title={isEn ? 'Switch language to Português (PT)' : 'Mudar idioma para English (EN)'}
            className="min-h-[44px] lg:min-h-0 lg:h-9 px-3 rounded-full backdrop-blur-md bg-[#050C1A]/85 hover:bg-[#0A1E3C]/90 border border-[#162847] hover:border-sky-400/50 text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span className={lang === 'pt' ? 'text-amber-300 underline underline-offset-4' : 'text-slate-400'}>
              PT
            </span>
            <span className="text-slate-600">|</span>
            <span className={lang === 'en' ? 'text-amber-300 underline underline-offset-4' : 'text-slate-400'}>
              EN
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={audioEnabled}
            aria-label={
              audioEnabled
                ? isEn
                  ? 'Mute background audio'
                  : 'Desativar áudio de fundo'
                : isEn
                ? 'Enable background audio'
                : 'Ativar áudio de fundo'
            }
            title={
              audioEnabled
                ? isEn
                  ? 'Mute (Background audio)'
                  : 'Mudo (Áudio de fundo)'
                : isEn
                ? 'Play background audio'
                : 'Tocar áudio de fundo'
            }
            className={`min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:h-9 px-3 sm:px-3.5 rounded-full backdrop-blur-md border text-xs font-medium flex items-center justify-center gap-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              audioEnabled
                ? 'bg-[#0A1E3C]/90 border-sky-400/60 text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.2)]'
                : 'bg-[#050C1A]/80 border-[#162847] text-slate-300 hover:text-white hover:border-sky-400/40'
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className={isLandscapeMobile ? 'sr-only' : 'inline'}>
              {audioEnabled
                ? isEn
                  ? 'Audio On'
                  : 'Áudio ativo'
                : isEn
                ? 'Audio Off'
                : 'Áudio desativado'}
            </span>
          </button>
        </div>
      </div>

      {/* Pílula compacta de status de viagem no mobile/tablet */}
      {isTraveling && !isLandscapeMobile && (
        <div
          role="status"
          aria-live="polite"
          className="mt-1.5 flex lg:hidden justify-center pointer-events-none"
        >
          <div className="px-3 py-1 rounded-full bg-[#08152C]/90 border border-sky-400/40 backdrop-blur-md text-[11px] text-sky-200 inline-flex items-center gap-1.5 shadow-md">
            <Sparkles className="w-3 h-3 text-sky-400 animate-spin shrink-0" />
            <span>{phaseLabels[travelPhase]}</span>
          </div>
        </div>
      )}
    </header>
  );
};
