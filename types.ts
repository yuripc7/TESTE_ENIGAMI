
export interface ChecklistItem {
    text: string;
    done: boolean;
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Dependency {
    id: string; // Event ID target
    type: DependencyType;
}

export interface Event {
    id: string;
    title: string;
    resp: string;
    startDate: string;
    endDate: string;
    plannedStartDate?: string; // Baseline start
    plannedEndDate?: string;   // Baseline end
    checklist: ChecklistItem[];
    completed: boolean;
    dependencies?: Dependency[];
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
    plannedStartDate?: string; // Baseline start for scope
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

export interface Project {
    id: number;
    companyId: number;
    lod: string;
    name: string;
    logoUrl?: string;
    coverUrl?: string;
    createdAt: string;
    updatedAt: string;
    timelineStart: string;
    timelineEnd: string;
    activities: Activity[];
    scopes: Scope[];
}

export interface Company {
    id: number;
    name: string;
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
    disciplines: Discipline[];
    projects: Project[];
    team: string[];
}

export interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}

// Helper Types for UI
export interface EventDependencyView {
    id: string;
    title: string;
    scopeName: string;
    color: string;
    type: DependencyType;
}
