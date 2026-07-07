import { motion } from 'framer-motion';
import { LIBRARY_ORDER, NODE_DEFS, NodeIcon } from '../nodeDefs';
import type { NodeKind } from '../types';

export default function NodeLibrary() {
  const onDragStart = (event: React.DragEvent, kind: NodeKind) => {
    event.dataTransfer.setData('application/nombaflow', kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar-left">
      <div className="sidebar-heading">
        <span>Nodes</span>
        <span className="sidebar-hint">drag onto canvas</span>
      </div>
      <div className="library-list">
        {LIBRARY_ORDER.map((kind, i) => {
          const def = NODE_DEFS[kind];
          return (
            <motion.div
              key={kind}
              className="library-card"
              draggable
              onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, kind)}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              whileHover={{ y: -2 }}
              style={
                {
                  '--node-color': def.color,
                  '--node-color-soft': def.colorSoft,
                } as React.CSSProperties
              }
            >
              <div className="library-card-icon">
                <NodeIcon kind={kind} size={16} />
              </div>
              <div>
                <div className="library-card-title">{def.label}</div>
                <div className="library-card-sub">{def.subtitle}</div>
              </div>
              <div className="library-card-grip">⋮⋮</div>
            </motion.div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="tip-card">
          <div className="tip-title">✦ Tip</div>
          Connect nodes top-to-bottom to shape how a payment moves through your business.
        </div>
      </div>
    </aside>
  );
}
