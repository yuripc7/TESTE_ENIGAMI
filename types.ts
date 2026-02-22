
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
}

export interface Scope {
    id: string;
    name: string;
    colorClass: string;
    startDate: string;
    plannedStartDate?: string; // New: Baseline start for scope
    resp: string;
    status: string;
    protocolWeek?: number;
    events: Event[];
    fileLinks?: FileLink[];
}

export interface Activity {
    date: string;
    author: string;
    text: string;
    imageUrl?: string;
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
    broker: string;
    resp: string;
    updatedAt: string;
}

export interface Project {
    id: number;
    companyId: number;
    lod: string;
    name: string;
    logoUrl?: string;
    coverUrl?: string; // New: Project facade/background image
    gallery?: string[]; // New: Project Gallery Images
    galleryDescriptions?: Record<number, string>; // Stores text for each gallery image index
    createdAt: string;
    updatedAt: string;
    timelineStart: string;
    timelineEnd: string;
    activities: Activity[];
    scopes: Scope[];
    dataRows?: ProjectDataRow[]; // New: Data Process Rows
    powerBiUrl?: string; // New: Power BI Embed URL
    viabilityFiles?: FileLink[]; // New: Uploaded .pbix files
    timeLogs?: TimeLog[]; // New: Time Tracking History
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

export interface DB {
    activeLod: string;
    activeCompanyId: number | null;
    activeProjectId: number | null;
    lods: string[];
    companies: Company[];
    disciplines: Discipline[]; // New: Dynamic disciplines list
    projects: Project[];
    team: string[];
}

export interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}
