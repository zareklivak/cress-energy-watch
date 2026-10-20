import { useState } from 'react'
import { pct } from '../engine/format'
import { sum } from '../engine/stats'
import { METERS } from '../engine/types'
import { useApp } from '../state/store'
import { Card, Takeaway } from '../ui/Card'
import { ShareBars } from '../ui/charts/ShareBars'
import { SmallMultiples } from '../ui/charts/SmallMultiples'
import { Segmented } from '../ui/Segmented'
import { PageHeader } from '../ui/shell/PageHeader'

export default function Meters() {
  const { rows, findings, label } = useApp()
  const [scale, setScale] = useState<'shared' | 'own'>('shared')
  const total = sum(rows.map((r) => r.totalCuft))
  const top = METERS.reduce((a, b) => (sum(rows.map((r) => r.meters[b])) > sum(rows.map((r) => r.meters[a])) ? b : a))
  return (
    <>
      <PageHeader
        eyebrow="Gas · whole season"
        title="Meters"
        actions={<Segmented label="Chart scale" value={scale} onChange={setScale} options={[{ value: 'shared', label: 'Same scale' }, { value: 'own', label: 'Own scale' }]} />}
      />
      <Card className="mb-4">
        <Takeaway>{label(top)} used {pct(sum(rows.map((r) => r.meters[top])) / total)} of all gas this season</Takeaway>
        <div className="mt-4 hidden sm:block"><ShareBars rows={rows} highlight={top} label={label} /></div>
      </Card>
      <p className="mb-2 text-meta text-mute">{scale === 'shared' ? 'Every chart uses the same scale, so bigger lines mean more gas. Grey areas are expected shutdowns.' : 'Each chart uses its own scale, to show the shape of each meter.'}</p>
      <SmallMultiples rows={rows} findings={findings} label={label} shared={scale === 'shared'} />
    </>
  )
}
