import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';

const GeneratorPage = React.lazy(() => import('../../pages/OpenTelemetryGeneratorPage'));

function App(props: AppRootProps) {
  return (
    <Routes>
      {/* Default — OTel Generator */}
      <Route path="*" element={<GeneratorPage />} />
    </Routes>
  );
}

export default App;
