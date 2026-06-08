import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../store';
import type { WorkItem, PullRequest } from '../../shared/types';

const makeWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 1,
  title: 'Test WI',
  state: 'Active',
  url: 'https://dev.azure.com/org/proj/_workitems/edit/1',
  linkedPRIds: [],
  ...overrides,
});

const makePR = (overrides: Partial<PullRequest> = {}): PullRequest => ({
  nodeId: 'PR_1',
  number: 1,
  title: 'Test PR',
  repoFullName: 'owner/repo',
  url: 'https://github.com/owner/repo/pull/1',
  isDraft: false,
  reviewDecision: null,
  ciStatus: null,
  linkedWorkItemIds: [],
  ...overrides,
});

describe('Store.getState', () => {
  it('returns a deep copy, not the internal reference', () => {
    const store = new Store();
    const s1 = store.getState();
    const s2 = store.getState();
    expect(s1).not.toBe(s2);
    expect(s1.workItems).not.toBe(s2.workItems);
  });

  it('mutations to returned state do not affect the store', () => {
    const store = new Store();
    const state = store.getState();
    state.workItems.push(makeWorkItem());
    expect(store.getState().workItems).toHaveLength(0);
  });
});

describe('Store.commitFetch', () => {
  let store: Store;

  beforeEach(() => { store = new Store(); });

  it('sets hasUnseenActivity when new items appear', () => {
    store.commitFetch({ workItems: [makeWorkItem()], pullRequests: [] });
    expect(store.getState().hasUnseenActivity).toBe(true);
  });

  it('does not set hasUnseenActivity when same items reappear', () => {
    store.commitFetch({ workItems: [makeWorkItem()], pullRequests: [] });
    store.markAllSeen();
    store.commitFetch({ workItems: [makeWorkItem()], pullRequests: [] });
    expect(store.getState().hasUnseenActivity).toBe(false);
  });

  it('records a successful refresh timestamp', () => {
    const before = new Date();
    store.commitFetch({ workItems: [], pullRequests: [] });
    const { lastSuccessAt } = store.getState().refresh;
    expect(lastSuccessAt).not.toBeNull();
    expect(lastSuccessAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe('Store.getTrayData', () => {
  it('groups work items by state', () => {
    const store = new Store();
    store.commitFetch({
      workItems: [makeWorkItem({ state: 'Active' }), makeWorkItem({ id: 2, state: 'Blocked' })],
      pullRequests: [],
    });
    const { groups } = store.getTrayData();
    const states = groups.map((g) => g.state).sort();
    expect(states).toEqual(['Active', 'Blocked']);
  });

  it('nests linked PRs under their work item', () => {
    const store = new Store();
    store.commitFetch({
      workItems: [makeWorkItem({ id: 1, linkedPRIds: ['PR_1'] })],
      pullRequests: [makePR({ nodeId: 'PR_1', linkedWorkItemIds: [1] })],
    });
    const { groups } = store.getTrayData();
    expect(groups[0].items[0].prs).toHaveLength(1);
  });

  it('uses pr.linkedWorkItemIds (not wi.linkedPRIds) as the association source', () => {
    // wi.linkedPRIds says 'PR_1' but PR_1 does not claim this work item — PR wins.
    const store = new Store();
    store.commitFetch({
      workItems: [makeWorkItem({ id: 1, linkedPRIds: ['PR_1'] })],
      pullRequests: [makePR({ nodeId: 'PR_1', linkedWorkItemIds: [] })],
    });
    const { groups, unlinkedPRs } = store.getTrayData();
    expect(groups[0].items[0].prs).toHaveLength(0);
    expect(unlinkedPRs).toHaveLength(1);
  });

  it('places PRs with no linked work items in unlinkedPRs', () => {
    const store = new Store();
    store.commitFetch({
      workItems: [],
      pullRequests: [makePR({ linkedWorkItemIds: [] })],
    });
    expect(store.getTrayData().unlinkedPRs).toHaveLength(1);
  });
});

describe('Store.markAllSeen', () => {
  it('clears hasUnseenActivity', () => {
    const store = new Store();
    store.commitFetch({ workItems: [makeWorkItem()], pullRequests: [] });
    store.markAllSeen();
    expect(store.getState().hasUnseenActivity).toBe(false);
  });

  it('stamps unseen items with seenAt', () => {
    const store = new Store();
    store.commitFetch({ workItems: [makeWorkItem()], pullRequests: [] });
    store.markAllSeen();
    const wi = store.getState().workItems[0];
    expect(wi.seenAt).toBeInstanceOf(Date);
  });
});

describe('Store.recordError', () => {
  it('sets refresh status to error and records message', () => {
    const store = new Store();
    store.recordError('ADO API timeout');
    const { refresh } = store.getState();
    expect(refresh.status).toBe('error');
    expect(refresh.lastErrorMessage).toBe('ADO API timeout');
    expect(refresh.lastErrorAt).toBeInstanceOf(Date);
  });
});
