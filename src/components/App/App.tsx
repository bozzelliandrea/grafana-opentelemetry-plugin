import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';

const GeneratorPage = React.lazy(() => import('../../pages/OpenTelemetryGeneratorPage'));
const DeveloperGuidePage = React.lazy(() => import('../../pages/DeveloperGuidePage'));

function App(props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.Guide} element={<DeveloperGuidePage />} />
      {/* Default — OTel Generator */}
      <Route path="*" element={<GeneratorPage />} />
    </Routes>
  );
}

export default App;
