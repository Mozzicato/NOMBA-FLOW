import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFlowStore } from '../store';

export default function Console() {
  const logs = useFlowStore((s) => s.logs);
  const open = useFlowStore((s) => s.consoleOpen);
  const toggle = useFlowStore((s) => s.toggleConsole);
  const running = useFlowStore((s) => s.running);
  const elapsedMs = useFlowStore((s) => s.elapsedMs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs, open]);

  return (
    <div className={`console${open ? ' open' : ''}`}>
      <button className="console-header" onClick={toggle}>
        <span className="console-title">
          <span className={`console-dot${running ? ' live' : ''}`} />
          Execution Console
        </span>
        <span className="console-meta">
          {running && <span className="console-running">running…</span>}
          {!running && elapsedMs != null && (
            <span className="console-elapsed">completed in {(elapsedMs / 1000).toFixed(2)}s</span>
          )}
          <span className="console-chevron">{open ? '▾' : '▴'}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="console-body-wrap"
            initial={{ height: 0 }}
            animate={{ height: 190 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="console-body" ref={scrollRef}>
              {logs.length === 0 && (
                <div className="console-empty">Run the workflow to see live execution logs.</div>
              )}
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  className={`log-line tone-${log.tone}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="log-time">{log.time}</span>
                  <span className="log-check">{log.tone === 'ok' ? '✓' : '·'}</span>
                  <span className="log-text">
                    {log.text}
                    {log.detail && <span className="log-detail">{log.detail}</span>}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
