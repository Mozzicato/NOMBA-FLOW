import { motion } from 'framer-motion';
import { useFlowStore } from '../store';

export default function TopBar() {
  const workflowName = useFlowStore((s) => s.workflowName);
  const setWorkflowName = useFlowStore((s) => s.setWorkflowName);
  const save = useFlowStore((s) => s.save);
  const savedAt = useFlowStore((s) => s.savedAt);
  const run = useFlowStore((s) => s.run);
  const running = useFlowStore((s) => s.running);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="logo-mark">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path
              d="M9 23V9l14 14V9"
              stroke="#111318"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="logo-word">
          Nomba <span className="logo-flow">Flow</span>
        </span>
        <span className="topbar-divider" />
        <input
          className="workflow-name"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          spellCheck={false}
          aria-label="Workflow name"
        />
        <span className="badge-live">Draft</span>
      </div>

      <div className="topbar-right">
        <motion.button whileTap={{ scale: 0.96 }} className="btn btn-ghost" onClick={save}>
          {savedAt ? '✓ Saved' : 'Save'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -1 }}
          className={`btn btn-primary${running ? ' is-busy' : ''}`}
          onClick={run}
          disabled={running}
        >
          {running ? (
            <>
              <span className="spinner dark" /> Running…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4.5v15l13-7.5-13-7.5Z" />
              </svg>
              Run Workflow
            </>
          )}
        </motion.button>
        <div className="avatar" title="Mozzicato Cakes">
          MC
        </div>
      </div>
    </header>
  );
}
