import { DB } from './types';

// === Application Constants ===
export const STORAGE_KEY = 'design_board_db_v1';
export const THEME_KEY = 'design_board_theme_v1';
export const TIMELINE_ROW_HEIGHT = 70;
export const MAX_CHAT_HISTORY = 100;
export const MAX_FILE_SIZE_MB = 5;
export const DEBOUNCE_SAVE_MS = 3000;
export const NOTIFICATION_TIMEOUT_MS = 3000;
export const PASTEL_COLORS = ['#FFDEE9', '#B5EAEA', '#FDF2F0', '#E3E1FA', '#DFFFF0', '#FFEBB6'];

const DEFAULT_DISCIPLINES = [
    { code: 'EST', name: 'Estrutura', color: '#9D9DFF' },
    { code: 'ARQ', name: 'Arquitetura', color: '#FF8000' },
    { code: 'AUT', name: 'Automação predial', color: '#EFBB4E' },
    { code: 'VCE', name: 'Ventilação, Climatização e Exaustão', color: '#3382D0' },
    { code: 'ELE', name: 'Elétrica, Telecom', color: '#3A985B' },
    { code: 'INT', name: 'Arquitetura de Interiores', color: '#646464' },
    { code: 'COR', name: 'Coordenadora e/ou Compatibilizadora', color: '#FF8C8C' },
    { code: 'SDR', name: 'Sanitário', color: '#5402B7' },
    { code: 'HID', name: 'Hidráulica', color: '#78BEE0' },
    { code: 'LUM', name: 'Luminotécnico', color: '#E691C1' },
    { code: 'PCI', name: 'Proteção Contra Incêndio', color: '#EA0000' },
    { code: 'PL', name: 'Projeto Legal', color: '#804000' },
    { code: 'PSG', name: 'Paisagismo', color: '#7EA431' },
    { code: 'EPR', name: 'Escada Pressurizada', color: '#800080' },
    { code: 'ALV', name: 'Alvenarias e Vedações', color: '#9B3200' },
    { code: 'SPD', name: 'Sist. de Prev. Descargas Atmosféricas', color: '#006C6C' },
    { code: 'TOP', name: 'Topografia', color: '#CD853F' },
];

export const INITIAL_DB: DB = {
    activeLod: "",
    activeCompanyId: null,
    activeProjectId: null,
    lods: [
        "EV_ ESTUDO DE VIABILIDADE",
        "EP_ ESTUDO PRELIMINAR",
        "AP_ ANTEPROJETO",
        "PL_ PROJETO LEGAL",
        "EX_ EXECUTIVO"
    ],
    companies: [],
    disciplines: DEFAULT_DISCIPLINES,
    projects: [],
    team: [],
    viabilities: [],
};
