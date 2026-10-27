import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Database, PlayCircle, Trash2 } from 'lucide-react'
import { useEvaluation } from '../state/EvaluationContext'
import { getProviderInfo } from '../services/ai'
import { Badge, Button, Card, CardHeader, Modal } from '../components/ui'
import { Disclaimer } from '../components/comp'
import { BENCHMARK_LABEL, BENCHMARK_VINTAGE } from '../data/benchmarks'

export function SettingsPage() {
  const { reset, loadSample, ready } = useEvaluation()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const provider = getProviderInfo()

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12 animate-fadeUp">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Data, AI provider and methodology.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader title="Your data" description="Inputs are saved only in this browser’s local storage. Nothing is sent to a server unless an AI endpoint is configured." />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" icon={<PlayCircle className="h-4 w-4" />} onClick={() => { loadSample(); navigate('/results') }}>Load sample offer</Button>
          <Button variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)} disabled={!ready}>Clear my data</Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader title="AI provider" action={<Badge tone={provider.mode === 'remote' ? 'good' : 'neutral'} icon={<Bot className="h-3 w-3" />}>{provider.mode === 'remote' ? 'Connected' : 'Mock mode'}</Badge>} />
        <p className="mt-3 text-sm text-ink-600">{provider.label}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
          All math — scores, percentiles, leverage, targets — is deterministic and runs locally. AI only explains and personalizes those results through structured JSON
          responses. To use a real model, set <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">VITE_AI_ENDPOINT</code> to a server-side proxy that calls your LLM provider. If
          it fails or returns invalid output, CompPilot falls back to the local mock.
        </p>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader title="Benchmark data" action={<Badge icon={<Database className="h-3 w-3" />}>{BENCHMARK_LABEL}</Badge>} />
        <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
          This MVP uses a hand-built, illustrative model of compensation by role family, level, location, industry and company stage. It is not sourced from a survey or
          vendor, is not real-time, and does not include private company data. {BENCHMARK_VINTAGE}.
        </p>
      </Card>

      <Disclaimer />

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear your data?"
        description="This removes your inputs from this browser. It can’t be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={() => { reset(); setConfirm(false); navigate('/') }}>Clear data</Button>
          </div>
        }
      >
        <p className="text-sm text-ink-600">You can always start a new evaluation or load the sample offer again.</p>
      </Modal>
    </div>
  )
}
