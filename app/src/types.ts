export type NodeKind = 'payment' | 'verify' | 'receipt' | 'notify' | 'success';

export type NodeStatus = 'idle' | 'running' | 'done';

export interface FlowNodeData extends Record<string, unknown> {
  kind: NodeKind;
  config: Record<string, string>;
}

export interface LogEntry {
  id: number;
  time: string;
  text: string;
  detail?: string;
  tone: 'ok' | 'info' | 'muted';
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'readonly';
  options?: string[];
}

export interface NodeDef {
  kind: NodeKind;
  label: string;
  subtitle: string;
  color: string;
  colorSoft: string;
  description: string;
  fields: ConfigField[];
  defaults: Record<string, string>;
}
