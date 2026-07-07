import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFlowStore } from '../store';

export default function BuildWithAI() {
  const [prompt, setPrompt] = useState('');
  const generate = useFlowStore((s) => s.generate);
  const generating = useFlowStore((s) => s.generating);
  const running = useFlowStore((s) => s.running);

  const submit = () => {
    if (!prompt.trim() || generating || running) return;
    generate(prompt.trim());
  };

  return (
    <motion.div
      className={`ai-bar${generating ? ' is-generating' : ''}`}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      <span className="ai-bar-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5Z" />
          <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
        </svg>
        Build with AI
      </span>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Describe the automation you want..."
        disabled={generating}
      />
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="btn btn-ai"
        onClick={submit}
        disabled={generating || running || !prompt.trim()}
      >
        {generating ? (
          <>
            <span className="spinner" /> Building…
          </>
        ) : (
          'Generate'
        )}
      </motion.button>
    </motion.div>
  );
}
