import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { NODE_DEFS, NodeIcon } from '../nodeDefs';
import { useFlowStore, type AppNode } from '../store';

function FlowNodeInner({ id, data, selected }: NodeProps<AppNode>) {
  const def = NODE_DEFS[data.kind];
  const status = useFlowStore((s) => s.nodeStatus[id] ?? 'idle');

  const summary = (() => {
    switch (data.kind) {
      case 'payment':
        return `₦${Number(data.config.amount || 0).toLocaleString('en-NG')} · ${data.config.currency}`;
      case 'verify':
        return `API ${data.config.apiStatus}`;
      case 'receipt':
        return 'Personalized thank-you';
      case 'notify':
        return data.config.channel;
      case 'success':
        return 'Ends workflow';
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: -36, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={`flow-node status-${status}${selected ? ' is-selected' : ''}`}
      style={
        {
          '--node-color': def.color,
          '--node-color-soft': def.colorSoft,
        } as React.CSSProperties
      }
    >
      <Handle type="target" position={Position.Top} className="flow-handle" />
      <div className="flow-node-icon">
        <NodeIcon kind={data.kind} />
      </div>
      <div className="flow-node-body">
        <div className="flow-node-title">{def.label}</div>
        <div className="flow-node-sub">{summary}</div>
      </div>
      <div className="flow-node-status">
        {status === 'running' && <span className="spinner" />}
        {status === 'done' && (
          <motion.svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <circle cx="12" cy="12" r="10" fill="var(--node-color)" opacity="0.2" />
            <motion.path
              d="m7.5 12.3 3 3 6-6.5"
              stroke="var(--node-color)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            />
          </motion.svg>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="flow-handle" />
    </motion.div>
  );
}

export default memo(FlowNodeInner);
