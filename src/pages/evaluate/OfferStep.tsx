import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CurrencyInput, Field, Input, NumberInput, Segmented, Select } from '../../components/ui'
import { Section, StepFrame } from '../../layouts/StepFrame'
import { useEvaluation } from '../../state/EvaluationContext'
import { validateOffer } from '../../engine'
import { ARRANGEMENT_OPTIONS, LEVEL_OPTIONS, STAGE_OPTIONS, VESTING_OPTIONS } from '../../data/options'
import type { CompanyStage, JobLevel } from '../../types'
import { formatCurrency } from '../../lib/format'

export function OfferStep() {
  const { inputs, updateOffer } = useEvaluation()
  const o = inputs.offer
  const navigate = useNavigate()
  const [attempted, setAttempted] = useState(false)
  const { errors, valid } = validateOffer(inputs)
  const err = (key: string) => (attempted ? errors[key] : undefined)

  const annualEquity = o.equityTotal ? o.equityTotal / (o.vestingYears || 4) : undefined
  const bonusAmt = o.base && o.targetBonusPct ? (o.base * o.targetBonusPct) / 100 : undefined

  return (
    <StepFrame
      eyebrow="Step 2 · Your offer"
      title="Tell us about the offer"
      description="Only base salary is required. Skip anything that doesn’t apply — we’ll note what’s missing in the confidence score."
      onBack={() => navigate('/evaluate/about-you')}
      onNext={() => {
        setAttempted(true)
        if (valid) navigate('/evaluate/priorities')
        else document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      }}
    >
      <Section title="The role">
        <Field label="Company" htmlFor="company" optional>
          <Input id="company" placeholder="Company name" value={o.company} onChange={(e) => updateOffer({ company: e.target.value })} />
        </Field>
        <Field label="Company stage" htmlFor="stage" info="Stage affects typical equity, bonus and how flexible bands tend to be.">
          <Select id="stage" options={STAGE_OPTIONS.filter((s) => s.value !== 'unknown')} placeholder="Not sure" value={o.companyStage === 'unknown' ? '' : o.companyStage} onValueChange={(v) => updateOffer({ companyStage: (v || 'unknown') as CompanyStage })} />
        </Field>
        <Field label="Role title" htmlFor="role" hint={inputs.profile.jobTitle && !o.role ? `Defaults to “${inputs.profile.jobTitle}”` : undefined} optional>
          <Input id="role" placeholder={inputs.profile.jobTitle || 'e.g. Senior Product Designer'} value={o.role} onChange={(e) => updateOffer({ role: e.target.value })} />
        </Field>
        <Field label="Level" htmlFor="olevel" optional>
          <Select id="olevel" options={LEVEL_OPTIONS} placeholder="Same as current" value={o.level} onValueChange={(v) => updateOffer({ level: v as JobLevel })} />
        </Field>
      </Section>

      <Section title="Compensation" description="Annual figures. You can type 195k or 195,000.">
        <Field label="Base salary" htmlFor="base" error={err('base')}>
          <CurrencyInput id="base" placeholder="195,000" value={o.base} invalid={!!err('base')} onValueChange={(v) => updateOffer({ base: v })} suffix="/ yr" />
        </Field>
        <Field label="Target bonus" htmlFor="bonus" optional error={err('targetBonusPct')} hint={bonusAmt ? `≈ ${formatCurrency(bonusAmt)} per year at target` : 'As a % of base'}>
          <NumberInput id="bonus" min={0} max={200} step={0.5} placeholder="15" value={o.targetBonusPct} invalid={!!err('targetBonusPct')} onValueChange={(v) => updateOffer({ targetBonusPct: v })} suffix="%" />
        </Field>
        <Field label="Equity / RSUs (total grant)" htmlFor="equity" optional hint={annualEquity ? `≈ ${formatCurrency(annualEquity)} per year, estimated` : 'Total value as stated in the offer'}>
          <CurrencyInput id="equity" placeholder="120,000" value={o.equityTotal} onValueChange={(v) => updateOffer({ equityTotal: v })} />
        </Field>
        <Field label="Vesting period" htmlFor="vesting">
          <Select id="vesting" options={VESTING_OPTIONS} value={o.vestingYears ? String(o.vestingYears) : ''} placeholder="Select…" onValueChange={(v) => updateOffer({ vestingYears: v ? Number(v) : undefined })} />
        </Field>
        <Field label="Signing bonus" htmlFor="signing" optional hint="One-time — kept separate from annual comp">
          <CurrencyInput id="signing" placeholder="0" value={o.signingBonus} onValueChange={(v) => updateOffer({ signingBonus: v })} />
        </Field>
        <Field label="Other measurable compensation" htmlFor="other" optional hint="e.g. 401(k) match, stipends — annual value">
          <CurrencyInput id="other" placeholder="0" value={o.otherAnnualComp} onValueChange={(v) => updateOffer({ otherAnnualComp: v })} suffix="/ yr" />
        </Field>
      </Section>

      <Section title="Benefits & logistics">
        <Field label="PTO" htmlFor="pto" optional>
          <NumberInput id="pto" min={0} max={60} placeholder="20" value={o.ptoDays} onValueChange={(v) => updateOffer({ ptoDays: v })} suffix="days" />
        </Field>
        <Field label="Remote policy">
          <Segmented ariaLabel="Remote policy" options={ARRANGEMENT_OPTIONS} value={o.remotePolicy} onChange={(v) => updateOffer({ remotePolicy: v })} />
        </Field>
        <Field label="Start date" htmlFor="start" optional>
          <Input id="start" type="date" value={o.startDate} onChange={(e) => updateOffer({ startDate: e.target.value })} />
        </Field>
        <Field label="Relocation package" htmlFor="relo" optional>
          <CurrencyInput id="relo" placeholder="0" value={o.relocation} onValueChange={(v) => updateOffer({ relocation: v })} />
        </Field>
        <Field label="Other meaningful benefits" htmlFor="benefits" optional className="sm:col-span-2">
          <textarea
            id="benefits"
            rows={3}
            placeholder="Health coverage, learning budget, parental leave…"
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
            value={o.benefitsNotes}
            onChange={(e) => updateOffer({ benefitsNotes: e.target.value })}
          />
        </Field>
      </Section>
    </StepFrame>
  )
}
