import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { SimulationPage } from '@/pages/SimulationPage';
import { SettingsPage } from '@/pages/SetttingsPage';
import { StatsPage } from '@/pages/StatsPage';
import { Layout } from '@/components/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulate/:id" element={<SimulationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
