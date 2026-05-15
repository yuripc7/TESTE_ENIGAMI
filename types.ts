
export interface ChecklistItem {
    text: string;
    done: boolean;
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

export interface PhaseInfo {
    status: 'pending' | 'active' | 'done';
    startDate?: string;
    endDate?: string;
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

export interface Company {
    id: number;
    name: string;
    logoUrl?: string; // Added logoUrl
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
}

export interface DB {
    activeLod: string;
    activeCompanyId: number | null;
    activeProjectId: number | null;
    lods: string[];
    companies: Company[];
    disciplines: Discipline[];
    projects: Project[];
    team: string[];
    viabilities?: Viability[];
}

export interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}
