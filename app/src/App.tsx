import { ReactFlowProvider } from '@xyflow/react';
import TopBar from './components/TopBar';
import NodeLibrary from './components/NodeLibrary';
import FlowCanvas from './components/FlowCanvas';
import Inspector from './components/Inspector';
import Console from './components/Console';
import BuildWithAI from './components/BuildWithAI';
import Toast from './components/Toast';
import Confetti from './components/Confetti';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="app">
        <TopBar />
        <div className="app-main">
          <NodeLibrary />
          <main className="canvas-column">
            <BuildWithAI />
            <FlowCanvas />
            <Console />
          </main>
          <Inspector />
        </div>
        <Toast />
        <Confetti />
      </div>
    </ReactFlowProvider>
  );
}
