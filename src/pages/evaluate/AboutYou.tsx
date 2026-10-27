import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wand2 } from 'lucide-react'
import { Button, CurrencyInput, Field, Input, NumberInput, Segmented, Select } from '../../components/ui'
import { Section, StepFrame } from '../../layouts/StepFrame'
import { useEvaluation } from '../../state/EvaluationContext'
import { validateAboutYou } from '../../engine'
import {
  ARRANGEMENT_OPTIONS, EMPLOYMENT_OPTIONS, INDUSTRY_OPTIONS, LEVEL_OPTIONS, LOCATION_OPTIONS, TITLE_SUGGESTIONS,
} from '../../data/options'
import type { EmploymentStatus, JobLevel } from '../../types'
import { formatCurrency } from '../../lib/format'

export function AboutYou() {
  const { inputs, updateProfile, loadSample } = useEvaluation()
  const p = inputs.profile
  const navigate = useNavigate()
  const [attempted, setAttempted] = useState(false)
  const { errors, valid } = validateAboutYou(inputs)
  const err = (key: string) => (attempted ? errors[key] : undefined)

  const computedCurrent = p.currentBase !== undefined ? p.currentBase + (p.currentBonus ?? 0) + (p.currentEquity ?? 0) : undefined

  return (
    <StepFrame
      eyebrow="Step 1 · About you"
      title="Let’s start with you"
      description="Your role, experience and location shape the benchmark. Current compensation helps us measure what this offer changes."
      aside={
        <Button variant="secondary" size="sm" icon={<Wand2 className="h-3.5 w-3.5" />} onClick={loadSample}>
          Fill with sample
        </Button>
      }
      onNext={() => {
        setAttempted(true)
        if (valid) navigate('/evaluate/offer')
        else document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      }}
    >
      <Section title="Your role">
        <Field label="Job title" htmlFor="jobTitle" error={err('jobTitle')} className="sm:col-span-2">
          <Input id="jobTitle" list="title-suggestions" placeholder="e.g. Senior Product Designer" value={p.jobTitle} invalid={!!err('jobTitle')} onChange={(e) => updateProfile({ jobTitle: e.target.value })} autoComplete="organization-title" />
          <datalist id="title-suggestions">{TITLE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Job level" htmlFor="level" hint="Your current level">
          <Select id="level" options={LEVEL_OPTIONS} value={p.level} onValueChange={(v) => updateProfile({ level: v as JobLevel })} />
        </Field>
        <Field label="Industry" htmlFor="industry">
          <Select id="industry" options={INDUSTRY_OPTIONS} value={p.industry} onValueChange={(v) => updateProfile({ industry: v })} />
        </Field>
        <Field label="Years of experience" htmlFor="yoe">
          <NumberInput id="yoe" min={0} max={50} placeholder="e.g. 11" value={p.yearsExperience} onValueChange={(v) => updateProfile({ yearsExperience: v })} />
        </Field>
        <Field label="Years of relevant experience" htmlFor="yre" error={err('yearsRelevant')} info="Years doing work closely related to this role. Used to compare you with the typical range for the level.">
          <NumberInput id="yre" min={0} max={50} placeholder="e.g. 9" value={p.yearsRelevant} invalid={!!err('yearsRelevant')} onValueChange={(v) => updateProfile({ yearsRelevant: v })} />
        </Field>
      </Section>

      <Section title="Where you work">
        <Field label="Location" htmlFor="location" error={err('location')} hint="Where the role is based (or your location, if remote)">
          <Select id="location" options={LOCATION_OPTIONS} value={p.location} invalid={!!err('location')} onValueChange={(v) => updateProfile({ location: v })} />
        </Field>
        <Field label="Current work arrangement">
          <Segmented ariaLabel="Current work arrangement" options={ARRANGEMENT_OPTIONS} value={p.workArrangement} onChange={(v) => updateProfile({ workArrangement: v })} />
        </Field>
      </Section>

      <Section title="Current compensation" description="Optional, but it lets us show how much this offer changes your situation.">
        <Field label="Current employment status" htmlFor="status" className="sm:col-span-2">
          <Select id="status" options={EMPLOYMENT_OPTIONS} value={p.employmentStatus} onValueChange={(v) => updateProfile({ employmentStatus: v as EmploymentStatus })} />
        </Field>
        <Field label="Current base salary" htmlFor="cbase" optional>
          <CurrencyInput id="cbase" placeholder="175,000" value={p.currentBase} onValueChange={(v) => updateProfile({ currentBase: v })} suffix="/ yr" />
        </Field>
        <Field label="Current bonus" htmlFor="cbonus" optional hint="Typical annual payout">
          <CurrencyInput id="cbonus" placeholder="12,000" value={p.currentBonus} onValueChange={(v) => updateProfile({ currentBonus: v })} suffix="/ yr" />
        </Field>
        <Field label="Current equity" htmlFor="cequity" optional hint="Approximate annual vesting value">
          <CurrencyInput id="cequity" placeholder="18,000" value={p.currentEquity} onValueChange={(v) => updateProfile({ currentEquity: v })} suffix="/ yr" />
        </Field>
        <Field label="Current total compensation" htmlFor="ctc" optional hint={computedCurrent ? `Leave blank to use ${formatCurrency(computedCurrent)} (sum of the above)` : 'Overrides the sum of the fields above'}>
          <CurrencyInput id="ctc" placeholder={computedCurrent?.toLocaleString('en-US') ?? '205,000'} value={p.currentTotalComp} onValueChange={(v) => updateProfile({ currentTotalComp: v })} suffix="/ yr" />
        </Field>
      </Section>
    </StepFrame>
  )
}
