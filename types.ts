
export interface ChecklistItem {
    id?: string;
    text: string;
    done: boolean;
    z?: string; // zone
    c?: string; // category
    tp?: 'exec' | 'bim'; // type/mode
    tg?: string; // tag
    obs?: string; // observations
    status?: 'pendente' | 'andamento' | 'concluido' | 'critico' | 'na';
    resp?: string;
    date?: string;
    rev?: string;
    notes?: string;
    link?: string;
    custom?: boolean;
}

export interface Dependency {
    id: string; // Event ID
    type: 'FS' | 'SS' | 'FF' | 'SF';
}

export interface Event {
    id: string;
    title: string;
    resp: string;
    startDate: string;
    endDate: string;
    plannedStartDate?: string; // New: Baseline start
    plannedEndDate?: string;   // New: Baseline end
    checklist: ChecklistItem[];
    completed: boolean;
    dependencies?: Dependency[];
    type?: 'default' | 'protocol'; // New: Distinguish between standard actions and protocol reminders
}

export interface FileLink {
    label: string;
    path: string;
    author?: string;
    createdAt?: string;
}

export interface GalleryImage {
    url: string;
    description?: string;
    date?: string;
    type?: 'image' | 'video' | 'flipbook' | 'panorama';
}

export interface GalleryFolder {
    id: string;
    name: string;
    images: GalleryImage[];
}

export interface Scope {
    id: string;
    name: string;
    colorClass: string;
    startDate: string;
    plannedStartDate?: string; // New: Baseline start for scope
    resp: string;
    status: 'stopped' | 'walking' | 'running' | 'done';
    protocolDate?: string;
    events: Event[];
    fileLinks?: FileLink[];
}

export interface Activity {
    date: string;
    author: string;
    text: string;
    imageUrl?: string;
}

export interface Note {
    id: string;
    author: string;
    recipient: string;
    text: string;
    color: string;
    createdAt: string;
    deadline?: string;
    imageUrl?: string;
    status: 'pending' | 'completed';
}

export interface ProjectDataRow {
    id: string;
    order: string;
    location: string;
    status: 'VIÁVEL' | 'STAND BY' | 'EM ANÁLISE' | 'NÃO INICIADO';
    landArea: string;
    builtArea: string;
    salesArea: string;
    zoning: string;
    potential: string;
    height: string;
    broker: string;
    resp: string;
    updatedAt: string;
}

export interface ProtocolRevision {
    id: string;
    date: string;
    author: string;
    text: string;
    status: 'stopped' | 'approved' | 'needs_correction';
}

export interface PavementType {
    id: string;
    type: string;
    count: number;
    unitsPerPavement: number;
    category: 'Habitacional' | 'Garagem' | 'Lazer Interno' | 'Lazer Externo';
    areaPerPavement: number;
    unitArea: number;
}

export interface ProjectDetails {
    pavements: PavementType[];
    totalParkingSpaces: number;
    totalLeisureArea: string;
    landArea: string;
    builtArea: string;
    salesArea: string;
    zoning: string;
    height: string;
    location: string;
    broker: string;
    resp: string;
}

export interface ProtocolFolder {
    id: string;
    name: string;
    files: FileLink[];
}

export interface ProtocolData {
    protocolNumber: string;
    prefecture: string;
    prefectureUrl: string;
    startDate: string;
    status: 'stopped' | 'approved' | 'needs_correction';
    revisions: ProtocolRevision[];
    folders: ProtocolFolder[];
    files?: FileLink[]; // legacy – kept for migration
}

export interface ContractInstallment {
    id: string;
    description: string;
    value: number;
    dueDate: string;
    status: 'pending' | 'paid' | 'future';
    paymentDate?: string;
}

export interface ContractDiscipline {
    id: string; // Ref to Discipline code/name or Scope ID
    name: string;
    progressPct: number;
}

export interface ContractEditRequest {
    id: string;
    date: string;
    author: string;
    description: string;
    status: 'approved' | 'review' | 'refused';
}

export interface Contract {
    id: string;
    name: string;
    supplier: string;
    totalValue: number;
    status: 'active' | 'pending' | 'closed';
    createdAt: string;
    term: string; // e.g. "12 Months", "2026-12-31"
    responsible: string;
    linkedWork: string;
    pdfAttachment?: FileLink;
    installments: ContractInstallment[];
    disciplines: ContractDiscipline[];
    edits: ContractEditRequest[];
}

// ── Compras / Cotações ───────────────────────────────────────────────
export interface ComprasQuote {
    id: string;
    forn: string;        // id do fornecedor
    valor: number;
    prazoDias: number;
    frete: string;
    validade: string;    // YYYY-MM-DD
    pagamento: string;
    obs: string;
    recebido: string;    // YYYY-MM-DD
}

export interface ComprasItem {
    id: string;
    nome: string;
    cat: string;         // id da categoria
    qtd: number;
    unid: string;
    status: string;      // levantamento | cotando | recebido | analise | negociacao | aprovado | comprado
    foto?: string;
    espec?: string;
    quotes: ComprasQuote[];
    aprovadoId?: string; // id da quote aprovada
}

export interface ComprasFornCatalogo { nome: string; icon: string; url: string; }

export interface ComprasForn {
    id: string;
    nome: string;
    cidade: string;
    contato?: string;
    fone?: string;
    email?: string;
    tags: string[];
    rating: number;
    av: string;          // cor do avatar (hex sem #)
    catalogos: ComprasFornCatalogo[];
}

export interface ComprasMeet {
    id: string;
    forn: string;
    item?: string | null;
    data: string;        // YYYY-MM-DD
    hora: string;
    fmt: 'online' | 'presencial';
    local?: string;
    pauta: string;
    done?: boolean;
}

export interface ComprasCat {
    id: string;
    cod: string;
    nome: string;
    color: string;
    foto?: string;
}

export interface ComprasDB {
    items: ComprasItem[];
    forns: ComprasForn[];
    meets: ComprasMeet[];
    cats?: ComprasCat[]; // categorias personalizadas — quando ausente, usa o padrão
}

export interface PhaseInfo {
    status: 'pending' | 'active' | 'done';
    startDate?: string;
    endDate?: string;
}

export interface WeeklyTask {
  id?: string | number;
  text: string;
  day: string;
  assignee: string;
  project: string;
  disc: string;
  status: string;
  weight: number;
  time?: string;
  dueDate?: string;
  isCoordPoint?: boolean;
  valid?: 'pending' | 'approved' | 'returned';
  validBy?: string;
  validAt?: number;
  completed?: boolean;
  completedAt?: number | null;
  subtasks?: { id: string | number; text: string; done: boolean }[];
  carriedFrom?: string;
  postponedCount?: number;
  coord?: string; // Integrated Database fields
  weekOffset?: number;
  weekKey?: string; // Absolute week anchor (Monday YYYY-MM-DD) — preferred over weekOffset
  standby?: boolean; // Em espera: não conta na evolução da semana até ser resgatada
  unplanned?: boolean;
  durationDays?: number;
  createdAt?: number;
}

export interface Project {
    id: number;
    companyId: number;
    lod: string;
    phases?: Record<string, PhaseInfo>;
    name: string;
    logoUrl?: string;
    coverUrl?: string; // New: Project facade/background image
    galleryDescriptions?: Record<number, string>; // Stores text for each gallery image index
    galleryFolders?: GalleryFolder[]; // New: Organized gallery folders
    createdAt: string;
    updatedAt: string;
    timelineStart: string;
    timelineEnd: string;
    activities: Activity[];
    scopes: Scope[];
    dataRows?: ProjectDataRow[]; // Legacy: Data Process Rows
    details?: ProjectDetails; // New: Master project details panel
    protocolData?: ProtocolData; // New: Protocol tracking data
    powerBiUrl?: string; // New: Power BI Embed URL
    viabilityFiles?: FileLink[]; // New: Uploaded .pbix files
    timeLogs?: TimeLog[]; // New: Time Tracking History
    notes?: Note[]; // New: Collaboration Notes
    contracts?: Contract[]; // New: Contract Management
    agendaTasks?: WeeklyTask[]; // New: Weekly Agenda Tasks
    evrState?: unknown; // Estado completo do EVR (Financeiro) — sincronizado com a equipe
    comprasData?: ComprasDB; // Aba Compras — cotações, fornecedores e reuniões
}

export interface TimeLog {
    id: string;
    projectId: number;
    userId: string;
    activity: string;
    scopeId?: string; // New: Linked Discipline
    eventId?: string; // New: Linked Action
    startTime: string; // ISO String
    endTime?: string; // ISO String or null if running
    duration: number; // Seconds
}

// ── Estrutura central de membros da equipe ─────────────────────────────
// Fonte única de verdade para colaboradores. Membros com `id` vêm do login
// (tabela profiles do Supabase); membros sem `id` foram adicionados à mão.
// O campo legado `DB.team: string[]` é DERIVADO de members (apenas nomes).
export interface TeamMember {
    id?: string;            // Supabase auth uid (quando o membro tem login)
    name: string;           // nome de exibição — chave usada em resp/assignee/author
    role?: string;          // cargo (Arquiteto(a), Coordenador(a), ...)
    avatarUrl?: string;
    color?: string;         // cor nos gráficos e na agenda
    capacity?: number;      // capacidade semanal (agenda)
    coordinator?: boolean;  // pode validar entregas na agenda
    email?: string;
    source?: 'login' | 'manual';
}

export interface Company {
    id: number;
    name: string;
    logoUrl?: string; // Added logoUrl
    agendaTasks?: WeeklyTask[]; // Planejamento semanal (micro) do escritório — vive na empresa, não no projeto
}

export interface Discipline {
    code: string;
    name: string;
    color: string;
}

export interface ViabilityVersion {
    id: string;
    version: number;
    date: string;
    notes?: string;
    pdfAttachment?: FileLink;
}

export interface Viability {
    id: string;
    companyId: number;
    address: string;
    date: string;
    status: 'VIÁVEL' | 'STAND BY' | 'EM ANÁLISE' | 'NÃO INICIADO';
    pdfSummary?: FileLink;
    versions: ViabilityVersion[];
    createdAt: string;
      titulo?: string;
      responsavel?: string;
      kanbanStatus?: 'em_aberto' | 'a_fazer' | 'estudos_finalizados' | 'dados_permuta' | 'contratos' | 'contratos_assinados';
      pdfConsultaPrefeitura?: FileLink;
      pdfLocalizacao?: FileLink;
      pdfEstudoTerceiro?: FileLink;
      obs?: string;
      // ── Novo painel de viabilidades ──
      studyType?: 'viab' | 'vgv' | 'mercado' | 'permuta'; // tipo do estudo (define o prazo)
      areaM2?: string;        // área do terreno
      cidade?: string;        // município do terreno
      aceitaPermuta?: boolean;
      pedidaPct?: number;     // % de permuta pedida
      vendaValor?: number;    // valor de venda (R$)
      deadline?: string;      // prazo de entrega do estudo (YYYY-MM-DD)
}

export interface DB {
    activeLod: string;
    activeCompanyId: number | null;
    activeProjectId: number | null;
    lods: string[];
    companies: Company[];
    disciplines: Discipline[];
    projects: Project[];
    team: string[]; // legado — derivado de members (apenas nomes)
    members?: TeamMember[]; // fonte única de membros, ligada ao login (profiles)
    viabilities?: Viability[];
}

export interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}
