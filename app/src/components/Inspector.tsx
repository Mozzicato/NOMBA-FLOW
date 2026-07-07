import { AnimatePresence, motion } from 'framer-motion';
import { NODE_DEFS, NodeIcon } from '../nodeDefs';
import { useFlowStore } from '../store';

export default function Inspector() {
  const selectedId = useFlowStore((s) => s.selectedId);
  const node = useFlowStore((s) => s.nodes.find((n) => n.id === s.selectedId));
  const updateConfig = useFlowStore((s) => s.updateConfig);
  const setSelected = useFlowStore((s) => s.setSelected);

  const def = node ? NODE_DEFS[node.data.kind] : null;

  return (
    <AnimatePresence>
      {node && def && selectedId && (
        <motion.aside
          className="sidebar-right"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          style={
            {
              '--node-color': def.color,
              '--node-color-soft': def.colorSoft,
            } as React.CSSProperties
          }
        >
          <div className="inspector-header">
            <div className="inspector-icon">
              <NodeIcon kind={def.kind} size={17} />
            </div>
            <div className="inspector-titles">
              <div className="inspector-title">{def.label}</div>
              <div className="inspector-sub">{def.subtitle}</div>
            </div>
            <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Close">
              ✕
            </button>
          </div>

          <p className="inspector-desc">{def.description}</p>

          {def.fields.length > 0 && (
            <div className="inspector-fields">
              {def.fields.map((field) => {
                const value = node.data.config[field.key] ?? '';
                if (field.type === 'readonly') {
                  return (
                    <div className="field" key={field.key}>
                      <label>{field.label}</label>
                      <div className="field-readonly">
                        <span className="dot-ok" />
                        {value}
                      </div>
                    </div>
                  );
                }
                if (field.type === 'select') {
                  return (
                    <div className="field" key={field.key}>
                      <label>{field.label}</label>
                      <select
                        value={value}
                        onChange={(e) => updateConfig(node.id, field.key, e.target.value)}
                      >
                        {field.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (field.type === 'textarea') {
                  return (
                    <div className="field" key={field.key}>
                      <label>{field.label}</label>
                      <textarea
                        rows={3}
                        value={value}
                        onChange={(e) => updateConfig(node.id, field.key, e.target.value)}
                      />
                    </div>
                  );
                }
                return (
                  <div className="field" key={field.key}>
                    <label>{field.label}</label>
                    <input
                      type={field.type}
                      value={value}
                      onChange={(e) => updateConfig(node.id, field.key, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {def.kind === 'success' && (
            <div className="inspector-success-note">
              <span className="dot-ok" /> Nothing to configure — this node celebrates for you.
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
