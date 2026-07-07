import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  useReactFlow,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import FlowNode from './FlowNode';
import { useFlowStore } from '../store';
import type { NodeKind } from '../types';
import { NODE_DEFS } from '../nodeDefs';

const nodeTypes: NodeTypes = { flowNode: FlowNode };

export default function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNodeAt = useFlowStore((s) => s.addNodeAt);
  const setSelected = useFlowStore((s) => s.setSelected);
  const running = useFlowStore((s) => s.running);
  const activeEdges = useFlowStore((s) => s.activeEdges);
  const fitSignal = useFlowStore((s) => s.fitSignal);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.18, duration: 450 }), 60);
    return () => clearTimeout(t);
  }, [fitSignal, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData('application/nombaflow') as NodeKind;
      if (!kind || !NODE_DEFS[kind]) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNodeAt(kind, { x: position.x - 130, y: position.y - 32 });
    },
    [screenToFlowPosition, addNodeAt],
  );

  const styledEdges: Edge[] = edges.map((e) => ({
    ...e,
    animated: running || !!activeEdges[e.id],
    className: activeEdges[e.id] ? 'edge-glow' : undefined,
  }));

  return (
    <div ref={wrapper} className={`canvas-wrap${running ? ' is-running' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelected(node.id)}
        onPaneClick={() => setSelected(null)}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'default' }}
        minZoom={0.3}
        maxZoom={1.6}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="rgba(255,255,255,0.09)" />
        <MiniMap
          pannable
          zoomable
          className="minimap"
          nodeColor={(n) => NODE_DEFS[(n.data as { kind: NodeKind }).kind]?.color ?? '#888'}
          maskColor="rgba(5, 6, 10, 0.72)"
        />
        <Controls className="flow-controls" showInteractive={false} />
      </ReactFlow>

      <div className={`canvas-dim${running ? ' visible' : ''}`} />

      <AnimatePresence>
        {nodes.length === 0 && (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <div className="empty-state-icon">⚡</div>
            <p>Drag a node here to begin building your payment workflow.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
