// Persisted non-secret configuration (stored in userData/config.json)
export interface AppConfig {
  adoOrgUrl: string;
  adoProject: string;
  githubRepos: string[];       // ["owner/repo", ...]; empty = monitor all
  pollIntervalMinutes: number; // 5–15
  adoUserId?: string;
  githubLogin?: string;
}

// In-memory data model
export interface WorkItem {
  id: number;
  title: string;
  state: string;
  url: string;
  // Populated by AssociationService (ADO→PR direction).
  // getTrayData() routes via pr.linkedWorkItemIds (PR→WI direction) instead;
  // both fields are kept in sync so future ADO-side queries can use this.
  linkedPRIds: string[];  // GitHub node IDs
  seenAt?: Date;
}

export interface PullRequest {
  nodeId: string;
  number: number;
  title: string;
  repoFullName: string;   // "owner/repo"
  url: string;
  isDraft: boolean;
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  ciStatus: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'NEUTRAL' | null;
  linkedWorkItemIds: number[];
  seenAt?: Date;
}

export interface RefreshState {
  status: 'idle' | 'fetching' | 'error';
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
}

export interface DataStore {
  workItems: WorkItem[];
  pullRequests: PullRequest[];
  refresh: RefreshState;
  hasUnseenActivity: boolean;
}

// Renderer-side view models
export interface WorkItemViewModel {
  workItem: WorkItem;
  prs: PullRequest[];
}

export interface WorkItemGroup {
  state: string;
  items: WorkItemViewModel[];
}

export interface TrayData {
  groups: WorkItemGroup[];
  unlinkedPRs: PullRequest[];
  refresh: RefreshState;
}

// IPC wire types: Date objects serialize to ISO strings in transit.
// Use these for ElectronAPI return types to keep renderer types honest.
export interface SerializedRefreshState {
  status: 'idle' | 'fetching' | 'error';
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface SerializedTrayData {
  groups: WorkItemGroup[];
  unlinkedPRs: PullRequest[];
  refresh: SerializedRefreshState;
}

// Developer-mode metrics (exposed via dev:metrics IPC channel only)
export interface DevMetrics {
  pollCycleCount: number;
  pollCycleErrorCount: number;
  lastCycleDurationMs: number;
  avgCycleDurationMs: number;  // rolling 10-cycle average
  ipcCallCount: Record<string, number>;
  memoryUsageMB: number;
}

// contextBridge API shape (exposed to renderer as window.electronAPI)
// Listener methods return a cleanup function to deregister the handler.
export interface ElectronAPI {
  getData: () => Promise<SerializedTrayData>;
  getConfig: () => Promise<AppConfig>;
  hasCredentials: () => Promise<{ ado: boolean; github: boolean }>;
  saveConfig: (
    data: AppConfig & { adoPat?: string; githubPat?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  triggerRefresh: () => Promise<void>;
  markSeen: () => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  onDataUpdated: (callback: (data: SerializedTrayData) => void) => () => void;
  onRefreshStarted: (callback: () => void) => () => void;
  onRefreshError: (
    callback: (error: { message: string; at: string }) => void
  ) => () => void;
  onNavigateSettings: (callback: () => void) => () => void;
  onArrowOffset: (callback: (x: number) => void) => () => void;
}
