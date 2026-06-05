import { Suspense } from 'react';
import { RouterProvider } from 'react-router';

import { router } from './routes';
import { AppProvider } from './context/AppContext';

function PageFallback() {
  return (
    <div className="page-root">
      <div className="flex-1 flex items-center justify-center text-muted text-sm">불러오는 중...</div>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Suspense fallback={<PageFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  );
}
