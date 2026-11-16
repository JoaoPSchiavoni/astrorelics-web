import { SpaceArtifactConfig, SpaceArtifactId } from '../types/experience';

export const SPACE_ARTIFACT_ORDER: SpaceArtifactId[] = [
  'j002e3_s_ivb',
  'apollo_lrrr',
  'apollo_snoopy_lm',
  'opportunity_rover',
  'ingenuity_helicopter',
];

export const SPACE_ARTIFACTS: Record<SpaceArtifactId, SpaceArtifactConfig> = {
  j002e3_s_ivb: {
    id: 'j002e3_s_ivb',
    name: 'J002E3 · Estágio S-IVB (Apollo 12)',
    shortName: 'J002E3 (Apollo 12)',
    mission: 'Missão Apollo 12 · AS-507',
    year: '1969 · Redescoberto em 2002',
    statusBadge: 'À Deriva no Espaço (Órbita Solar / Terra-Lua)',
    locationLabel: 'Corredor Orbital Terra–Lua / Órbita Heliocêntrica',
    coordinatesLabel: 'Ponto de Lagrange L1 · Captura Temporária (2002–2003)',
    placementType: 'deep-space',
    relatedBodyId: 'earth',
    deepSpacePosition: {
      desktop: [-2.15, 1.52, -1.85],
      tablet: [-1.85, 1.15, -2.0],
      mobile: [-0.86, -0.92, -2.1],
    },
    modelPath: '/3d_models/j002e3_s_ivb.glb?v=opt1',
    inspectRadius: 1.72,
    initialRotation: [0.28, 0.55, -0.18],
    idleRotationSpeed: 0.22,
    accentColor: '#38BDF8',
    description:
      'Terceiro estágio (S-IVB-507) do foguete Saturn V da Apollo 12, com 6,60 metros de diâmetro e 17,8 metros de comprimento. Equipado com um motor Rocketdyne J-2 a hidrogênio líquido, unidade de instrumentos IBM, dois módulos propulsores de controle de atitude (APS) e pintura térmica branca de dióxido de titânio (TiO₂).',
    history:
      'Lançado em 14 de novembro de 1969, o estágio S-IVB impulsionou os astronautas da Apollo 12 rumo à Lua. O plano era lançá-lo em uma órbita estável ao redor do Sol, mas uma queima mais longa dos motores de recalque o deixou em uma órbita instável. Após 33 anos desaparecido, em setembro de 2002 o astrônomo Bill Yeung avistou o objeto orbitando a Terra e o catalogou como o suposto asteroide "J002E3". Análises espectrais revelaram a assinatura química da tinta branca de dióxido de titânio da NASA: o foguete de 1969 havia voltado para visitar a Terra antes de escapar novamente em 2003.',
    importance:
      'Tornou-se o caso mais famoso de "arqueologia orbital" da história. Provou na prática como objetos humanos lançados ao espaço profundo podem ser recapturados temporariamente pela gravidade terrestre décadas depois e ensinou astrônomos a usar espectroscopia de refletância para distinguir asteroides naturais de relíquias da corrida espacial.',
    specs: [
      { label: 'Dimensões Reais', value: '17,8 m × 6,60 m' },
      { label: 'Massa Seca', value: '~9.559 kg' },
      { label: 'Propulsão', value: '1× Motor Rocketdyne J-2' },
      { label: 'Assinatura Óptica', value: 'Tinta TiO₂ (Saturn V)' },
    ],
  },

  apollo_lrrr: {
    id: 'apollo_lrrr',
    name: 'Retrorefletor a Laser (LRRR)',
    shortName: 'Retrorefletor LRRR',
    mission: 'Apollo 11, 14 e 15 (EASEP / ALSEP)',
    year: '1969 – Presente (Ativo)',
    statusBadge: 'Ativo na Superfície Lunar há +55 anos',
    locationLabel: 'Lua · Mare Tranquillitatis (Base da Tranquilidade)',
    coordinatesLabel: '0,6734° N · 23,4729° L (Apollo 11)',
    placementType: 'body-surface',
    relatedBodyId: 'moon',
    // Posicionado na face visível da Lua para fácil visualização e rotação junto ao astro
    surfaceLatLon: [12, 68],
    modelPath: '/3d_models/apollo_lrrr.glb?v=opt1',
    inspectRadius: 1.55,
    initialRotation: [0.22, 0.42, 0.0],
    idleRotationSpeed: 0.2,
    accentColor: '#22D3EE',
    description:
      'Painel óptico passivo de alumínio usinado (46 cm × 46 cm) contendo uma matriz 10 × 10 com 100 prismas triédricos ("corner-cubes") de sílica fundida de alta pureza (quartzo), cada um com 3,8 cm de diâmetro recuado em cavidades térmicas cilíndricas. Conta com alça para ferramenta UHT, suporte articulado de inclinação, bússola solar com pino gnômon e nível de bolha.',
    history:
      'Instalado por Buzz Aldrin e Neil Armstrong em 20 de julho de 1969 no Mar da Tranquilidade (com unidades adicionais deixadas pelas missões Apollo 14 e 15). Por ser totalmente passivo — sem baterias, cabos ou circuitos eletrônicos — sobreviveu intacto às variações térmicas extremas de +120 °C a -170 °C da Lua após a partida dos astronautas.',
    importance:
      'É o experimento mais longevo do Programa Apollo e continua operando diariamente. Observatórios na Terra disparam pulsos de laser contra seus prismas e cronometram o tempo de retorno dos fótons com precisão milimétrica. Graças a ele, descobrimos que a Lua se afasta da Terra 3,8 cm por ano, estudamos o núcleo fluido lunar e testamos a Relatividade Geral de Einstein.',
    specs: [
      { label: 'Matriz Óptica', value: '100 prismas (10 × 10)' },
      { label: 'Material dos Prismas', value: 'Sílica Fundida (Quartzo)' },
      { label: 'Dimensão do Painel', value: '46 cm × 46 cm' },
      { label: 'Consumo Elétrico', value: '0 W (100% Passivo)' },
    ],
  },

  apollo_snoopy_lm: {
    id: 'apollo_snoopy_lm',
    name: 'Módulo Lunar "Snoopy" (Apollo 10)',
    shortName: 'Módulo "Snoopy"',
    mission: 'Missão Apollo 10 · LM-4',
    year: 'Maio de 1969 · Reencontrado em 2019',
    statusBadge: 'À Deriva no Espaço (Órbita Heliocêntrica)',
    locationLabel: 'Espaço Profundo · Órbita Solar entre Terra, Lua e Marte',
    coordinatesLabel: 'Órbita Heliocêntrica (~0,98 a 1,03 UA)',
    placementType: 'deep-space',
    relatedBodyId: 'moon',
    deepSpacePosition: {
      desktop: [2.35, 1.42, -1.9],
      tablet: [1.95, 1.15, -2.0],
      mobile: [0.86, -0.92, -2.1],
    },
    modelPath: '/3d_models/apollo_lunar_module.glb?v=opt1',
    inspectRadius: 1.78,
    initialRotation: [0.18, -0.58, 0.0],
    idleRotationSpeed: 0.18,
    accentColor: '#FBBF24',
    description:
      'Módulo Lunar Grumman LM-4 da missão Apollo 10, batizado de "Snoopy" (em par com o Módulo de Comando "Charlie Brown"). Possui revestimento térmico em folha de Kapton dourada e Mylar aluminizado, 16 propulsores de controle de reação (RCS), antena parabólica de banda-S, janelas triangulares de aproximação e escotilha de acoplamento.',
    history:
      'Em maio de 1969, apenas dois meses antes da Apollo 11, Thomas Stafford e Eugene Cernan pilotaram o "Snoopy" no ensaio geral histórico, descendo a apenas 14,4 km da superfície lunar para testar o radar de pouso e inspecionar o local de pouso no Mar da Tranquilidade. Após retornarem ao Módulo de Comando, o estágio de subida do Snoopy foi acionado remotamente para entrar em órbita ao redor do Sol, tornando-se a única espaçonave tripulada da história a vagar intacta e desabitada pelo espaço interplanetário.',
    importance:
      'Validou todos os sistemas críticos que permitiram o primeiro pouso humano na Lua semanas depois. Permaneceu perdido no espaço por exatos 50 anos até que, em 2019, astrônomos liderados por Nick Howes anunciaram ter rastreado sua órbita com 98% de certeza após analisar terabytes de dados de telescópios.',
    specs: [
      { label: 'Designação Oficial', value: 'Grumman LM-4 "Snoopy"' },
      { label: 'Altitude Mínima Lunar', value: '14,4 km (47.400 pés)' },
      { label: 'Massa em Órbita', value: '~2.150 kg (Estágio Subida)' },
      { label: 'Status Atual', value: 'Cápsula Intacta em Órbita Solar' },
    ],
  },

  opportunity_rover: {
    id: 'opportunity_rover',
    name: 'Rover Opportunity (MER-B)',
    shortName: 'Rover Opportunity',
    mission: 'Mars Exploration Rover · MER-B',
    year: '2004 – 2018 (14 anos e 138 dias)',
    statusBadge: 'Silenciado em Marte após Tempestade Global',
    locationLabel: 'Marte · Meridiani Planum (Vale Perseverance)',
    coordinatesLabel: '2,046° S · 5,478° O (Cratera Endeavour)',
    placementType: 'body-surface',
    relatedBodyId: 'mars',
    surfaceLatLon: [-8, 52],
    modelPath: '/3d_models/opportunity_rover.glb?v=opt1',
    inspectRadius: 1.68,
    initialRotation: [0.26, 0.65, 0.0],
    idleRotationSpeed: 0.2,
    accentColor: '#F97316',
    description:
      'Veículo robótico geológico de seis rodas com suspensão articulada "rocker-bogie", asas de painéis solares triplo-junção, mastro panorâmico (Pancam e Navcam) a 1,5 m de altura, antena de alto ganho e braço robótico frontal com espectrômetros e broca de abrasão de rochas (RAT).',
    history:
      'Pousou em Marte em 25 de janeiro de 2004 com uma missão planejada de apenas 90 sóis (dias marcianos) e alcance previsto de 1 km. Superou sua expectativa de vida em mais de 55 vezes: operou por quase 15 anos e percorreu 45,16 km (uma maratona completa em outro planeta). Em junho de 2018, a mais severa tempestade de poeira global registrada em Marte bloqueou 99% da luz solar sobre o Vale Perseverance. Após mais de 1.000 comandos de recuperação, a NASA encerrou oficialmente a missão em fevereiro de 2019.',
    importance:
      'Descobriu esférulas de hematita ("mirtilos marcianos") e veios de gipsita que comprovaram de forma definitiva que Marte possuiu água líquida em sua superfície no passado antigo, transformando a astrobiologia moderna.',
    specs: [
      { label: 'Vida Útil Planejada vs Real', value: '90 dias → 5.352 sóis (14,6 anos)' },
      { label: 'Distância Percorrida', value: '45,16 km (Recorde em Marte)' },
      { label: 'Massa do Rover', value: '185 kg' },
      { label: 'Causa da Parada', value: 'Opacidade Solar Tau > 10,8' },
    ],
  },

  ingenuity_helicopter: {
    id: 'ingenuity_helicopter',
    name: 'Helicóptero Ingenuity (Mars Helicopter)',
    shortName: 'Ingenuity',
    mission: 'Mars 2020 · Perseverance & Ingenuity',
    year: '2021 – 2024 (72 Voos)',
    statusBadge: 'Aposentado em Marte ("Valinor Hills")',
    locationLabel: 'Marte · Cratera Jezero (Nerva / Valinor Hills)',
    coordinatesLabel: '18,499° N · 77,315° L',
    placementType: 'body-surface',
    relatedBodyId: 'mars',
    surfaceLatLon: [26, 92],
    modelPath: '/3d_models/ingenuity_helicopter.glb?v=opt1',
    inspectRadius: 1.58,
    initialRotation: [0.22, 0.55, 0.0],
    idleRotationSpeed: 0.24,
    accentColor: '#A855F7',
    description:
      'Aeronave autônoma coaxial ultraleve (apenas 1,8 kg na Terra, equivalente a 680 gramas na gravidade marciana). Possui dois rotores contrarrotativos de fibra de carbono de 1,2 metro de envergadura que giram a 2.537 RPM, painel solar superior, aviônica aquecida em caixa isolada a gás carbônico e quatro pernas de pouso ultrafinas.',
    history:
      'Em 19 de abril de 2021, o Ingenuity realizou o primeiro voo motorizado e controlado da história em outro planeta — o "momento Irmãos Wright" interplanetário (inclusive levando um pequeno fragmento de tecido do flyer original de 1903 preso sob seu painel solar). Projetado como demonstração tecnológica para apenas 5 voos em 30 dias, atuou como batedor aéreo do rover Perseverance por quase três anos, completando 72 voos até sofrer danos nas pontas das pás durante um pouso de emergência em dunas sem contraste visual em 18 de janeiro de 2024.',
    importance:
      'Provou que é possível voar em uma atmosfera com apenas 1% da densidade da Terra usando rotores de alta rotação e navegação visual autônoma por IA a bordo, abrindo caminho para a próxima geração de helicópteros científicos em Marte e Titã (missão Dragonfly).',
    specs: [
      { label: 'Voos Planejados vs Reais', value: '5 voos → 72 voos realizados' },
      { label: 'Rotação das Pás', value: '~2.537 RPM (Fibra de Carbono)' },
      { label: 'Massa Total', value: '1,8 kg (Envergadura 1,2 m)' },
      { label: 'Tempo Total de Voo', value: '128,8 minutos (17,0 km)' },
    ],
  },
};
