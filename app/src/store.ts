import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import type { FlowNodeData, LogEntry, NodeKind, NodeStatus } from './types';
import { NODE_DEFS } from './nodeDefs';

export type AppNode = Node<FlowNodeData>;

const DEMO = {
  customer: 'Sarah Johnson',
  business: 'Mozzicato Cakes',
  amount: '₦2,500',
  reference: 'NMB-458921',
};

let idCounter = 100;
const nextId = () => `n${idCounter++}`;
let logCounter = 0;

function makeNode(kind: NodeKind, position: { x: number; y: number }, config?: Record<string, string>): AppNode {
  return {
    id: nextId(),
    type: 'flowNode',
    position,
    data: { kind, config: { ...NODE_DEFS[kind].defaults, ...config } },
  };
}

function chainEdges(nodes: AppNode[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `e-${nodes[i].id}-${nodes[i + 1].id}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'default',
    });
  }
  return edges;
}

function defaultWorkflow(): { nodes: AppNode[]; edges: Edge[] } {
  const kinds: NodeKind[] = ['payment', 'verify', 'receipt', 'notify', 'success'];
  const nodes = kinds.map((kind, i) => makeNode(kind, { x: 0, y: i * 150 }));
  return { nodes, edges: chainEdges(nodes) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () =>
  new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

interface NombaConnection {
  accountId: string;
  environment: string;
}

async function checkNombaConnection(): Promise<NombaConnection | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch('/api/verify-payment', { method: 'POST', signal: controller.signal });
    const body = await res.json();
    if (body?.connected) return { accountId: body.accountId, environment: body.environment };
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface FlowState {
  nodes: AppNode[];
  edges: Edge[];
  workflowName: string;
  selectedId: string | null;
  nodeStatus: Record<string, NodeStatus>;
  activeEdges: Record<string, boolean>;
  running: boolean;
  generating: boolean;
  logs: LogEntry[];
  consoleOpen: boolean;
  elapsedMs: number | null;
  toast: string | null;
  confettiBurst: number;
  fitSignal: number;
  savedAt: string | null;

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNodeAt: (kind: NodeKind, position: { x: number; y: number }) => void;
  updateConfig: (id: string, key: string, value: string) => void;
  setSelected: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  toggleConsole: () => void;
  dismissToast: () => void;
  save: () => void;
  run: () => Promise<void>;
  generate: (prompt: string) => Promise<void>;
}

export const useFlowStore = create<FlowState>((set, get) => {
  const pushLog = (text: string, tone: LogEntry['tone'] = 'ok', detail?: string) => {
    set((s) => ({
      logs: [...s.logs, { id: logCounter++, time: now(), text, detail, tone }],
    }));
  };

  const setStatus = (id: string, status: NodeStatus) =>
    set((s) => ({ nodeStatus: { ...s.nodeStatus, [id]: status } }));

  const initial = defaultWorkflow();

  return {
    nodes: initial.nodes,
    edges: initial.edges,
    workflowName: 'Cake Order Automation',
    selectedId: null,
    nodeStatus: {},
    activeEdges: {},
    running: false,
    generating: false,
    logs: [],
    consoleOpen: true,
    elapsedMs: null,
    toast: null,
    confettiBurst: 0,
    fitSignal: 1,
    savedAt: null,

    onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
    onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
    onConnect: (connection) => set((s) => ({ edges: addEdge({ ...connection, type: 'default' }, s.edges) })),

    addNodeAt: (kind, position) =>
      set((s) => ({ nodes: [...s.nodes, makeNode(kind, position)] })),

    updateConfig: (id, key, value) =>
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n,
        ),
      })),

    setSelected: (id) => set({ selectedId: id }),
    setWorkflowName: (name) => set({ workflowName: name }),
    toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),
    dismissToast: () => set({ toast: null }),

    save: () => {
      const { nodes, edges, workflowName } = get();
      localStorage.setItem(
        'nomba-flow-workflow',
        JSON.stringify({ workflowName, nodes, edges }),
      );
      set({ savedAt: now() });
      setTimeout(() => set({ savedAt: null }), 2200);
    },

    run: async () => {
      const { running, nodes, edges } = get();
      if (running || nodes.length === 0) return;

      // Order nodes by following edges from the trigger (or any root).
      const incoming = new Set(edges.map((e) => e.target));
      const start =
        nodes.find((n) => n.data.kind === 'payment' && !incoming.has(n.id)) ??
        nodes.find((n) => !incoming.has(n.id)) ??
        nodes[0];
      const order: AppNode[] = [];
      const seen = new Set<string>();
      let cursor: AppNode | undefined = start;
      while (cursor && !seen.has(cursor.id)) {
        order.push(cursor);
        seen.add(cursor.id);
        const out = edges.find((e) => e.source === cursor!.id);
        cursor = out ? nodes.find((n) => n.id === out.target) : undefined;
      }

      set({
        running: true,
        consoleOpen: true,
        logs: [],
        elapsedMs: null,
        toast: null,
        nodeStatus: {},
        activeEdges: {},
      });
      const startedAt = performance.now();

      for (let i = 0; i < order.length; i++) {
        const node = order[i];
        const kind = node.data.kind;
        const cfg = node.data.config;
        setStatus(node.id, 'running');

        switch (kind) {
          case 'payment': {
            pushLog('Waiting for payment...', 'muted');
            await sleep(1500);
            const amount = cfg.amount
              ? `₦${Number(cfg.amount).toLocaleString('en-NG')}`
              : DEMO.amount;
            pushLog('Payment detected', 'ok', `Reference: ${DEMO.reference} · ${amount}`);
            break;
          }
          case 'verify': {
            pushLog('Verifying payment with Nomba...', 'muted');
            const auth = await checkNombaConnection();
            await sleep(auth ? 400 : 1000);
            if (auth) {
              pushLog(
                'Nomba API authenticated',
                'ok',
                `Live connection · account ${auth.accountId.slice(0, 8)}… · ${auth.environment}`,
              );
              await sleep(400);
            }
            pushLog('Payment verified', 'ok', `Customer: ${DEMO.customer} · Status: Successful`);
            break;
          }
          case 'receipt': {
            pushLog('Generating AI receipt...', 'muted');
            await sleep(1300);
            pushLog(
              'AI receipt generated',
              'ok',
              `"Payment received successfully! Thanks for supporting ${DEMO.business}. Your order is now being prepared."`,
            );
            break;
          }
          case 'notify': {
            pushLog('Sending merchant notification...', 'muted');
            await sleep(800);
            pushLog('Merchant notified', 'ok', `🔔 New payment · ${DEMO.customer} · ${DEMO.amount}`);
            break;
          }
          case 'success': {
            await sleep(500);
            break;
          }
        }

        setStatus(node.id, 'done');

        const nextEdge = edges.find(
          (e) => e.source === node.id && i + 1 < order.length && e.target === order[i + 1].id,
        );
        if (nextEdge) {
          set((s) => ({ activeEdges: { ...s.activeEdges, [nextEdge.id]: true } }));
          await sleep(280);
        }
      }

      const elapsed = performance.now() - startedAt;
      pushLog('Workflow completed successfully', 'ok', `Finished in ${(elapsed / 1000).toFixed(2)}s`);
      set((s) => ({
        running: false,
        elapsedMs: elapsed,
        toast: '🎉 Payment automation completed successfully.',
        confettiBurst: s.confettiBurst + 1,
      }));
      setTimeout(() => set({ toast: null }), 5200);
    },

    generate: async (prompt) => {
      const { running, generating } = get();
      if (running || generating) return;
      set({ generating: true, selectedId: null });

      // Plan the workflow from the prompt.
      const p = prompt.toLowerCase();
      const kinds: NodeKind[] = ['payment'];
      const wantsVerify = /verif|check|confirm|valid/.test(p);
      const wantsReceipt = /receipt|thank|message|ai|acknowledg/.test(p);
      const wantsNotify = /notif|alert|tell me|let me know|inform|ping/.test(p);
      const anyMatch = wantsVerify || wantsReceipt || wantsNotify;
      if (wantsVerify || !anyMatch) kinds.push('verify');
      if (wantsReceipt || !anyMatch) kinds.push('receipt');
      if (wantsNotify || !anyMatch) kinds.push('notify');
      kinds.push('success');

      const amountMatch = prompt.match(/₦\s?([\d,]+)|\b([\d,]{3,})\s*(?:naira|ngn)?\b/i);
      const amount = amountMatch
        ? (amountMatch[1] ?? amountMatch[2]).replace(/,/g, '')
        : undefined;

      await sleep(900); // "thinking"

      set({ nodes: [], edges: [], nodeStatus: {}, activeEdges: {}, logs: [], elapsedMs: null });
      await sleep(250);

      const placed: AppNode[] = [];
      for (let i = 0; i < kinds.length; i++) {
        const config =
          kinds[i] === 'payment' && amount ? { amount } : undefined;
        const node = makeNode(kinds[i], { x: 0, y: i * 150 }, config);
        placed.push(node);
        set((s) => ({
          nodes: [...s.nodes, node],
          edges:
            i > 0
              ? [
                  ...s.edges,
                  {
                    id: `e-${placed[i - 1].id}-${node.id}`,
                    source: placed[i - 1].id,
                    target: node.id,
                    type: 'default',
                  },
                ]
              : s.edges,
          fitSignal: s.fitSignal + 1,
        }));
        await sleep(340);
      }

      set((s) => ({ generating: false, fitSignal: s.fitSignal + 1 }));
    },
  };
});

export const DEMO_DATA = DEMO;
