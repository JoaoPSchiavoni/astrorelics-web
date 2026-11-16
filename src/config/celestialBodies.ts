import { CelestialBodyConfig, CelestialBodyId } from '../types/experience';

/**
 * Ordem oficial de exibição dos destinos no seletor e navegação por teclado.
 */
export const CELESTIAL_BODY_ORDER: CelestialBodyId[] = ['earth', 'moon', 'mars'];

/**
 * Posição aparente do Sol distante na cena 3D (quadrante superior direito profundo)
 * e direção principal da luz solar coerente com essa posição aparente.
 */
export const SUN_SCENE_CONFIG = {
  /** Posição 3D do astro solar visível ao fundo */
  visualPosition: [18.5, 7.8, -28.0] as [number, number, number],
  /** Direção da luz principal alinhada ao vetor aparente do Sol (superior direito -> inferior esquerdo) */
  keyLightPosition: [16.0, 7.2, 8.5] as [number, number, number],
  /** Luz de recorte (rim light) vinda diretamente da coordenada 3D exata do Sol ao fundo */
  rimLightPosition: [18.5, 7.8, -28.0] as [number, number, number],
};

/**
 * Configuração centralizada dos três corpos celestes (Terra, Lua e Marte).
 *
 * Para substituir ou adicionar modelos 3D:
 * 1. Coloque o arquivo `.glb` ou `.gltf` na pasta `3d_models/` na raiz do projeto.
 * 2. Atualize `modelPath` abaixo (ou utilize um dos nomes já listados em `candidatePaths`).
 * 3. A escala geométrica de qualquer modelo é normalizada automaticamente via BoundingBox
 *    para `foregroundRadius` (quando em primeiro plano) e `backgroundRadius` (quando ao fundo).
 */
export const CELESTIAL_BODIES: Record<CelestialBodyId, CelestialBodyConfig> = {
  earth: {
    id: 'earth',
    name: 'Terra',
    subtitle: 'Berço da Exploração Espacial · Ponto de Origem',
    description:
      'Nosso mundo oceânico protegido por uma fina camada atmosférica. Daqui partiram todas as sondas, módulos lunares e rovers enviados para investigar o Sistema Solar.',
    modelPath: '/3d_models/Earth_1_12756.glb?v=opt1',
    mobileModelPath: '/3d_models/Earth_1_12756.mobile.glb?v=opt1',
    candidatePaths: [
      '/3d_models/Earth_1_12756.glb',
      '/3d_models/earth.glb',
      '/3d_models/terra.glb',
      '/models/earth.glb',
    ],
    foregroundRadius: 1.65,
    foregroundPosition: {
      desktop: [0.28, 0.08, 0.0],
      tablet: [0.1, 0.12, 0.0],
      mobile: [0.0, 0.05, 0.0],
    },
    backgroundRadius: 0.56,
    backgroundWhenSelectedIs: {
      moon: {
        desktop: [-4.1, 1.35, -5.2],
        tablet: [-2.85, 1.45, -5.2],
        mobile: [-1.45, 2.38, -4.8],
      },
      mars: {
        desktop: [-4.15, 1.35, -5.2],
        tablet: [-2.85, 1.45, -5.2],
        mobile: [-1.45, 2.38, -4.8],
      },
    },
    initialRotation: [0.18, -1.35, 0.0],
    axialTilt: 0.41, // ~23.5°
    idleRotationSpeed: 0.18,
    atmosphere: {
      enabled: true,
      color: '#38BDF8',
      secondaryColor: '#0284C7',
      intensity: 0.72,
      fresnelPower: 3.4,
      scale: 1.042,
    },
    materialTuning: {
      roughness: 0.82,
      metalness: 0.04,
      normalScale: 0.9,
    },
    telemetry: {
      classification: 'Planeta Telúrico · 1,00 UA',
      meanRadius: '6.371 km',
      gravity: '9,81 m/s²',
      orbitalContext: 'Base de telemetria DSN e rastreamento laser orbital',
      futureMissionsPreview: 'Rede Deep Space Network & Observatórios LLR',
    },
  },

  moon: {
    id: 'moon',
    name: 'Lua',
    subtitle: 'Satélite Natural da Terra · Arquivo Silencioso',
    description:
      'Superfície rochosa preservada no vácuo sem atmosfera. Guarda módulos de descida, sismômetros passivos e retrorefletores laser das missões Apollo que ainda respondem a pulsos enviados da Terra.',
    modelPath: '/3d_models/moon_small.glb?v=opt1',
    mobileModelPath: '/3d_models/moon_small.mobile.glb?v=opt1',
    candidatePaths: [
      '/3d_models/moon_small.glb',
      '/3d_models/Moon_1_3474.glb',
      '/3d_models/moon.glb',
      '/3d_models/Moon.glb',
      '/3d_models/lua.glb',
      '/models/moon.glb',
    ],
    foregroundRadius: 1.52,
    foregroundPosition: {
      desktop: [0.28, 0.08, 0.0],
      tablet: [0.1, 0.12, 0.0],
      mobile: [0.0, 0.05, 0.0],
    },
    backgroundRadius: 0.44,
    backgroundWhenSelectedIs: {
      earth: {
        desktop: [-3.95, 1.42, -4.6],
        tablet: [-2.75, 1.5, -4.6],
        mobile: [-1.45, 2.38, -4.8],
      },
      mars: {
        desktop: [3.85, -0.95, -5.2],
        tablet: [2.65, -0.95, -5.1],
        mobile: [1.45, 2.38, -4.8],
      },
    },
    initialRotation: [0.08, -0.65, 0.0],
    axialTilt: 0.11, // ~6.68°
    idleRotationSpeed: 0.14,
    atmosphere: {
      enabled: false, // A Lua mantém sua aparência rochosa, sem halo atmosférico
      color: '#000000',
      secondaryColor: '#000000',
      intensity: 0.0,
      fresnelPower: 1.0,
      scale: 1.0,
    },
    materialTuning: {
      roughness: 0.94,
      metalness: 0.0,
      normalScale: 1.15,
    },
    telemetry: {
      classification: 'Satélite Natural · 384.400 km',
      meanRadius: '1.737 km',
      gravity: '1,62 m/s²',
      orbitalContext: 'Rotação sincronizada · Vácuo exosférico',
      futureMissionsPreview: 'Retrorefletores Laser Apollo 11, 14 e 15 (LLR)',
    },
  },

  mars: {
    id: 'mars',
    name: 'Marte',
    subtitle: 'O Planeta Vermelho · Fronteira dos Rovers',
    description:
      'Deserto frio de óxido de ferro com cânions colossais e uma atmosfera rarefeita. Suas planícies abrigam rovers históricos e sondas cujos sinais encerraram após tempestades globais de poeira.',
    modelPath: '/3d_models/24881_Mars_1_6792.glb?v=opt1',
    candidatePaths: [
      '/3d_models/24881_Mars_1_6792.glb',
      '/3d_models/mars.glb',
      '/3d_models/Mars.glb',
      '/3d_models/marte.glb',
      '/models/mars.glb',
    ],
    foregroundRadius: 1.58,
    foregroundPosition: {
      desktop: [0.28, 0.08, 0.0],
      tablet: [0.1, 0.12, 0.0],
      mobile: [0.0, 0.05, 0.0],
    },
    backgroundRadius: 0.52,
    backgroundWhenSelectedIs: {
      earth: {
        desktop: [3.85, -1.05, -5.3],
        tablet: [2.65, -0.95, -5.2],
        mobile: [1.45, 2.38, -4.8],
      },
      moon: {
        desktop: [3.95, -0.95, -5.2],
        tablet: [2.7, -0.9, -5.1],
        mobile: [1.45, 2.38, -4.8],
      },
    },
    initialRotation: [0.14, 0.85, 0.0],
    axialTilt: 0.44, // ~25.19°
    idleRotationSpeed: 0.17,
    atmosphere: {
      enabled: true,
      color: '#E07A5F',
      secondaryColor: '#9A3412',
      intensity: 0.36, // Halo atmosférico sutil e rarefeito respeitando Marte
      fresnelPower: 4.1,
      scale: 1.028,
    },
    materialTuning: {
      roughness: 0.89,
      metalness: 0.02,
      normalScale: 1.0,
    },
    telemetry: {
      classification: 'Planeta Telúrico · 1,52 UA',
      meanRadius: '3.389 km',
      gravity: '3,71 m/s²',
      orbitalContext: 'Atmosfera tênue de CO₂ · Tempestades de poeira sazonais',
      futureMissionsPreview: 'Rover Opportunity (Meridiani Planum) & Sonda Beagle 2',
    },
  },
};
