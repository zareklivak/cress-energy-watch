import { useState } from 'react'
import { Button } from '../ui/Button'
import { LodgeHero } from '../ui/lodge/LodgeHero'
import { BandChart } from '../ui/charts/BandChart'
import { BudgetChart } from '../ui/charts/BudgetChart'
import { ChartFor } from '../ui/charts/ChartFor'
import { CostBars } from '../ui/charts/CostBars'
import { SmallMultiples } from '../ui/charts/SmallMultiples'
import { Card, MicroLabel, Takeaway } from '../ui/Card'
import { FilterChip } from '../ui/FilterChip'
import { FlagCard } from '../ui/FlagCard'
import { MismatchCard } from '../ui/MismatchCard'
import { NumberedSteps } from '../ui/NumberedSteps'
import { PreviewBanner } from '../ui/PreviewBanner'
import { Segmented } from '../ui/Segmented'
import { Sheet } from '../ui/Sheet'
import { StatTile } from '../ui/StatTile'
import { StepStrip } from '../ui/StepStrip'
import { useApp } from '../state/store'

/** Dev-only page used by the screenshot loop to review primitives in isolation. */
export default function UiGallery() {
  const { flags, findings, rows, label, budget } = useApp()
  const [units, setUnits] = useState<'usd' | 'cuft'>('usd')
  const [chip, setChip] = useState(true)
  const [open, setOpen] = useState(false)
  return (
    <main className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 sm:px-8">
      <h1 className="text-stat font-semibold">UI gallery</h1>
      <LodgeHero height={300} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="May cost" value="$54,063" sub="+$7,126 vs April" />
        <StatTile label="vs budget" value="+140%" sub="budget $22,500" tone="bad" />
        <StatTile label="vs May last year" value="—" sub="Needs 12 months of history" tone="muted" />
        <StatTile label="Open flags" value="8" sub="1 high" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">{flags.slice(0, 4).map((f) => <FlagCard key={f.id} finding={f} />)}</div>
      <Card>
        <MicroLabel>Controls</MicroLabel>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary">Create task</Button>
          <Button>Mark expected</Button>
          <Button variant="ghost">Add note</Button>
          <Segmented label="Units" value={units} onChange={setUnits} options={[{ value: 'usd', label: '$' }, { value: 'cuft', label: 'cu ft' }]} />
          <FilterChip active={chip} onClick={() => setChip(!chip)}>High</FilterChip>
          <Button onClick={() => setOpen(true)}>Open sheet</Button>
        </div>
      </Card>
      <Card><Takeaway>Upload progress</Takeaway><div className="mt-4"><StepStrip steps={[{ label: 'Reading bills', state: 'done' }, { label: 'Learning normal', state: 'active' }, { label: 'Finding anomalies', state: 'todo' }]} /></div></Card>
      <NumberedSteps steps={[{ title: 'What happened', body: 'Pool used 491,533 cu ft.' }, { title: 'Why we think so', body: '4× its usual month.' }, { title: 'Likely cause', body: 'Heater setpoint.' }, { title: 'Next step', body: 'Check the heater.', emphasis: true }]} />
      <div className="grid gap-3 md:grid-cols-2"><MismatchCard month="2026-07" calculated={8919} billed={8535} note="Meter 1's entry explains the gap." /><PreviewBanner /></div>
      <Sheet open={open} title="Example sheet" onClose={() => setOpen(false)}><p className="text-body">Sheet body.</p></Sheet>
      <Card><Takeaway>Pool gas was 64% of May's bill</Takeaway><div className="mt-3"><CostBars rows={rows} findings={findings} selected="2026-05" units={units} label={label} /></div></Card>
      <Card><MicroLabel>Pool · cu ft</MicroLabel><BandChart rows={rows} meter="pool" highlight={['2026-04', '2026-05']} /></Card>
      <SmallMultiples rows={rows} findings={findings} label={label} shared />
      <Card><BudgetChart rows={budget.rows} showProposed /></Card>
      <div className="grid gap-3 md:grid-cols-2">{findings.filter((f) => ['estimated-reads', 'repeat-month', 'cost-mismatch', 'dominant-meter'].includes(f.kind)).map((f) => <Card key={f.id}><ChartFor finding={f} /></Card>)}</div>
    </main>
  )
}
