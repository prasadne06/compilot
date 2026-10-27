import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EvaluationProvider } from './state/EvaluationContext'
import { AppShell } from './layouts/AppShell'
import { EvaluateLayout } from './layouts/EvaluateLayout'
import { ResultsLayout } from './layouts/ResultsLayout'
import { Landing } from './pages/Landing'
import { AboutYou } from './pages/evaluate/AboutYou'
import { OfferStep } from './pages/evaluate/OfferStep'
import { PrioritiesStep } from './pages/evaluate/PrioritiesStep'
import { Overview } from './pages/results/Overview'
import { Market } from './pages/results/Market'
import { Negotiation } from './pages/results/Negotiation'
import { Scripts } from './pages/results/Scripts'
import { Practice } from './pages/Practice'
import { SettingsPage } from './pages/Settings'
import { NotFound } from './pages/NotFound'
import { ErrorBoundary } from './layouts/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
    <EvaluationProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Landing />} />
            <Route path="evaluate" element={<EvaluateLayout />}>
              <Route index element={<Navigate to="about-you" replace />} />
              <Route path="about-you" element={<AboutYou />} />
              <Route path="offer" element={<OfferStep />} />
              <Route path="priorities" element={<PrioritiesStep />} />
            </Route>
            <Route element={<ResultsLayout />}>
              <Route path="results" element={<Overview />} />
              <Route path="results/market" element={<Market />} />
              <Route path="results/negotiation" element={<Negotiation />} />
              <Route path="results/scripts" element={<Scripts />} />
              <Route path="practice" element={<Practice />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </EvaluationProvider>
    </ErrorBoundary>
  )
}
