import { EventEmitter } from 'events';
import type { DataStore, TrayData, WorkItemGroup, WorkItemViewModel } from '../shared/types';

const DEFAULT_REFRESH_STATE: DataStore['refresh'] = {
  status: 'idle',
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
};

export class Store extends EventEmitter {
  private state: DataStore = {
    workItems: [],
    pullRequests: [],
    refresh: { ...DEFAULT_REFRESH_STATE },
    hasUnseenActivity: false,
  };

  getState(): DataStore {
    return structuredClone(this.state);
  }

  // Intended for IPC serialization only. The returned objects are direct
  // references into internal state; IPC structured-clone protects callers.
  // Do not mutate returned items from non-IPC paths.
  getTrayData(): TrayData {
    const { workItems, pullRequests, refresh } = this.state;

    const groupMap = new Map<string, WorkItemViewModel[]>();
    for (const wi of workItems) {
      const prs = pullRequests.filter((pr) =>
        pr.linkedWorkItemIds.includes(wi.id)
      );
      const existing = groupMap.get(wi.state) ?? [];
      existing.push({ workItem: wi, prs });
      groupMap.set(wi.state, existing);
    }

    const groups: WorkItemGroup[] = Array.from(groupMap.entries()).map(
      ([state, items]) => ({ state, items })
    );

    const unlinkedPRs = pullRequests.filter(
      (pr) => pr.linkedWorkItemIds.length === 0
    );

    return { groups, unlinkedPRs, refresh };
  }

  markAllSeen(): void {
    const now = new Date();
    this.state.workItems = this.state.workItems.map((wi) => ({
      ...wi,
      seenAt: wi.seenAt ?? now,
    }));
    this.state.pullRequests = this.state.pullRequests.map((pr) => ({
      ...pr,
      seenAt: pr.seenAt ?? now,
    }));
    this.state.hasUnseenActivity = false;
    this.emit('state-changed', this.state);
  }

  beginFetch(): void {
    this.state = {
      ...this.state,
      refresh: { ...this.state.refresh, status: 'fetching' },
    };
    this.emit('state-changed', this.state);
  }

  commitFetch(partial: Pick<DataStore, 'workItems' | 'pullRequests'>): void {
    const previousIds = new Set([
      ...this.state.workItems.map((w) => w.id),
      ...this.state.pullRequests.map((p) => p.nodeId),
    ]);
    const hasNew =
      partial.workItems.some((w) => !previousIds.has(w.id)) ||
      partial.pullRequests.some((p) => !previousIds.has(p.nodeId));

    this.state = {
      workItems: partial.workItems,
      pullRequests: partial.pullRequests,
      hasUnseenActivity: this.state.hasUnseenActivity || hasNew,
      refresh: {
        status: 'idle',
        lastSuccessAt: new Date(),
        lastErrorAt: this.state.refresh.lastErrorAt,
        lastErrorMessage: this.state.refresh.lastErrorMessage,
      },
    };
    this.emit('state-changed', this.state);
  }

  recordError(message: string): void {
    this.state = {
      ...this.state,
      refresh: {
        ...this.state.refresh,
        status: 'error',
        lastErrorAt: new Date(),
        lastErrorMessage: message,
      },
    };
    this.emit('state-changed', this.state);
  }
}

export const store = new Store();
