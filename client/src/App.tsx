import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import TaskDeclare from './pages/TaskDeclare';
import Session from './pages/Session';
import DotConnectSandbox from './pages/DotConnectSandbox';
import SpeedMathSandbox from './pages/SpeedMathSandbox';
import ReflexTapSandbox from './pages/ReflexTapSandbox';
import StroopSandbox from './pages/StroopSandbox';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Welcome />} />
        {/* Temporary — isolated game testing. Remove once server rotation serves each game. */}
        <Route path="/sandbox/dotconnect" element={<DotConnectSandbox />} />
        <Route path="/sandbox/speedmath" element={<SpeedMathSandbox />} />
        <Route path="/sandbox/reflex" element={<ReflexTapSandbox />} />
        <Route path="/sandbox/stroop" element={<StroopSandbox />} />
        <Route path="/declare" element={<TaskDeclare />} />
      </Route>
      <Route path="/session" element={<Session />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
