import { inSentence, joinList as list, mult, monthName, monthShort, num, pct, usd, usdK } from './format'
import {
  checkBudgetShape, findCostGaps, findDips, findDominant, findDropOuts, findEstimatedMonths,
  findOverBudget, findRepeats, findShutdowns, findSpikes, series, T,
} from './signals'
import { median, sum } from './stats'
import {
  DEFAULT_LABELS, type Finding, type HddByMonth, type MeterId, type MonthRow, type Severity,
} from './types'

type Labels = Record<MeterId, string>

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, info: 2 }


/**
 * Turn raw signals into plain-English findings, ordered by severity then
 * dollar impact. Expected items (seasonal shutdowns) come last.
 */
export function compose(rows: MonthRow[], hdd: HddByMonth, labels: Labels = DEFAULT_LABELS): Finding[] {
  const L = (m: MeterId) => labels[m]
  const shutdowns = findShutdowns(rows)
  const dips = findDips(rows, shutdowns)
  const spikes = findSpikes(rows, dips)
  const estimated = findEstimatedMonths(rows, dips, hdd)
  const dropOuts = findDropOuts(dips, estimated).sort((a, b) => a.i - b.i)
  const findings: Finding[] = []
  const months = rows.map((r) => r.month)

  // Over budget (High), linked to a spike on the biggest meter.
  for (const ob of findOverBudget(rows)) {
    const row = rows[ob.i]
    const m = ob.topMeter
    const xs = series(rows, m)
    const med = median(xs)
    const meterUsd = row.meters[m] * row.rate
    const spike = spikes.find((s) => s.meter === m && ob.i >= s.start - 1 && ob.i <= s.end)
    const meterMult = row.meters[m] / med
    const spikeMonths = spike ? months.slice(spike.start, spike.end + 1) : [row.month]
    const evidence = [
      `${monthName(row.month)} cost ${usd(row.calcCost)} against a budget of ${usd(row.budget)}.`,
      `${L(m)} gas was ${usd(meterUsd)}, ${pct(meterUsd / row.calcCost)} of the month's bill.`,
      med > 0
        ? `${L(m)} used ${num(row.meters[m])} cu ft, ${mult(meterMult)} its usual month (${num(med)} cu ft).`
        : `${L(m)} used ${num(row.meters[m])} cu ft, up from a usual month near zero.`,
    ]
    if (spike && spike.start > 0) {
      const before = xs[spike.start - 1]
      evidence.push(`It jumped from ${num(before)} cu ft in ${monthShort(months[spike.start - 1])} to ${num(xs[spike.start])} in ${monthShort(months[spike.start])}, ${mult(xs[spike.start] / before)} in one month.`)
    }
    findings.push({
      id: `over-budget-${row.month}`,
      kind: 'over-budget',
      severity: 'high',
      status: 'new',
      meters: [m],
      months: [row.month],
      headline: `${monthName(row.month)} was ${mult(ob.ratio)} budget: ${inSentence(L(m))} gas ${med > 0 ? `${mult(meterMult)} normal` : 'up from near zero'}`,
      impactUsd: Math.round(row.calcCost - row.budget),
      impactLabel: 'over budget',
      confidence: spike ? 'high' : 'medium',
      evidence,
      causes: [
        { text: `${L(m)} heater fault or a setpoint left high`, weight: 0.7 },
        { text: 'Cover left off during the spring shoulder season', weight: 0.55 },
        { text: 'Catch-up billing from earlier estimated reads', weight: 0.3 },
      ],
      nextStep: `Check the ${inSentence(L(m))} heater, cover use and setpoint, and ask the utility whether ${monthName(row.month)} includes catch-up billing.`,
      chart: { type: 'band', series: [{ meter: m, highlight: spikeMonths }] },
      facts: {
        cost: row.calcCost, budget: row.budget, ratio: ob.ratio, meterUsd, meterShare: meterUsd / row.calcCost,
        meterMultiple: meterMult, meterMedian: med,
        spikeExcessUsd: spike ? sum(spikeMonths.map((_, k) => (xs[spike.start + k] - med) * rows[spike.start + k].rate)) : 0,
      },
    })
  }

  // Estimated reads (Medium).
  for (const e of estimated) {
    const row = rows[e.i]
    const prev = rows[e.i - 1]
    const next = rows[e.i + 1]
    const perHdd = (r: MonthRow) => r.totalCuft / (hdd[r.month] ?? 1)
    const shortfall = sum(e.meters.map((m) => {
      const ns = [prev?.meters[m], next?.meters[m]].filter((n): n is number => n !== undefined)
      return (sum(ns) / ns.length - row.meters[m]) * row.rate
    }))
    const evidence = [
      `${monthName(row.month)} used ${num(row.totalCuft)} cu ft${prev ? `, against ${num(prev.totalCuft)} in ${monthShort(prev.month)}` : ''}${next ? ` and ${num(next.totalCuft)} in ${monthShort(next.month)}` : ''}.`,
      `${e.meters.length} meters read near zero: ${list(e.meters.map(L))}.`,
    ]
    if (hdd[row.month] && prev && hdd[prev.month]) {
      evidence.push(`It was a cold month (${num(hdd[row.month])} heating degree days), yet use per degree day was ${num(perHdd(row))} cu ft against ${num(perHdd(prev))} in ${monthShort(prev.month)}.`)
    }
    for (const id of e.identical) evidence.push(`${list(id.meters.map(L))} both show exactly ${num(id.value)} cu ft.`)
    if (e.catchUps.length) {
      evidence.push(`The next month caught up: ${list(e.catchUps.map((c) => `${L(c.meter)} ${num(rows[c.i].meters[c.meter])}`))} cu ft.`)
    }
    findings.push({
      id: `estimated-reads-${row.month}`,
      kind: 'estimated-reads',
      severity: 'medium',
      status: 'new',
      meters: e.meters,
      months: [row.month],
      headline: `${monthName(row.month)} looks estimated, not efficient`,
      impactUsd: Math.round(shortfall),
      impactLabel: 'billed later, not saved',
      confidence: e.catchUps.length >= 2 || e.identical.length ? 'high' : 'medium',
      evidence,
      causes: [
        { text: 'Snow-covered meters, so the utility estimated the reads', weight: 0.75 },
        { text: 'Reads skipped and caught up the following month', weight: 0.6 },
        { text: 'Equipment actually switched off', weight: 0.15 },
      ],
      nextStep: `Treat ${monthName(row.month)}'s ${usd(row.budget - row.calcCost)} under budget as timing, not savings. Check the bills for actual vs estimated reads.`,
      chart: { type: 'estimated', months: months.slice(Math.max(0, e.i - 2), e.i + 2), meters: e.meters },
      facts: { totalCuft: row.totalCuft, meterCount: e.meters.length, shortfallUsd: shortfall, catchUpCount: e.catchUps.length },
    })
  }

  // Single-meter drop-outs (Medium), one finding listing each.
  if (dropOuts.length) {
    const impact = sum(dropOuts.map((d) => {
      const xs = series(rows, d.meter)
      const ns = [xs[d.i - 1], xs[d.i + 1]].filter((n): n is number => n !== undefined)
      return (sum(ns) / ns.length - xs[d.i]) * rows[d.i].rate
    }))
    const describe = (d: { meter: MeterId; i: number }) => {
      const xs = series(rows, d.meter)
      const around = [d.i - 1, d.i + 1].filter((j) => j >= 0 && j < xs.length)
      return `${L(d.meter)} read ${num(xs[d.i])} cu ft in ${monthShort(months[d.i])}, against ${list(around.map((j) => `${num(xs[j])} in ${monthShort(months[j])}`))}.`
    }
    const meters = [...new Set(dropOuts.map((d) => d.meter))]
    findings.push({
      id: `drop-out-${dropOuts.map((d) => `${d.meter}-${months[d.i]}`).join('_')}`,
      kind: 'drop-out',
      severity: 'medium',
      status: 'new',
      meters,
      months: [...new Set(dropOuts.map((d) => months[d.i]))],
      headline: dropOuts.length === 1
        ? `${L(dropOuts[0].meter)} nearly stopped in ${monthName(months[dropOuts[0].i])}`
        : `${dropOuts.length} single-meter drop-outs: ${list(dropOuts.map((d) => `${L(d.meter)} in ${monthShort(months[d.i])}`))}`,
      impactUsd: Math.round(impact),
      impactLabel: 'possibly unbilled',
      confidence: 'medium',
      evidence: dropOuts.map(describe),
      causes: [
        { text: 'Missed or estimated meter read', weight: 0.6 },
        { text: 'Equipment on that meter was switched off', weight: 0.4 },
      ],
      nextStep: 'Check the read type on those bills. If the equipment really was off, confirm that was intended.',
      chart: { type: 'band', series: dropOuts.map((d) => ({ meter: d.meter, highlight: [months[d.i]] })) },
      facts: { count: dropOuts.length },
    })
  }

  // Repeated month (Medium).
  for (const rp of findRepeats(rows)) {
    const row = rows[rp.i]
    const prevMonth = months[rp.i - 1]
    findings.push({
      id: `repeat-month-${row.month}`,
      kind: 'repeat-month',
      severity: 'medium',
      status: 'new',
      meters: rp.meters,
      months: [row.month],
      headline: `${monthName(row.month)} looks copied from ${monthName(prevMonth)}`,
      impactUsd: Math.round(sum(rp.meters.map((m) => row.meters[m] * row.rate))),
      impactLabel: 'of usage unverified',
      confidence: rp.meters.length >= 5 ? 'high' : 'medium',
      evidence: [
        `${rp.meters.length} of ${Object.keys(row.meters).length} meters match ${monthName(prevMonth)} to the cubic foot: ${list(rp.meters.map(L))}.`,
        `Real meters almost never repeat exactly, month to month.`,
      ],
      causes: [
        { text: `${monthName(prevMonth)}'s row was copied forward in the spreadsheet`, weight: 0.8 },
        { text: 'The utility billed estimated reads equal to last month', weight: 0.25 },
      ],
      nextStep: `Re-enter ${monthName(row.month)} from the actual bill.`,
      chart: { type: 'repeat', months: [prevMonth, row.month], meters: rp.meters },
      facts: { repeated: rp.meters.length, meterCount: Object.keys(row.meters).length },
    })
  }

  // Cost checks: explained -> entry error (Medium); unexplained -> mismatch (Info).
  const gaps = findCostGaps(rows)
  for (const g of gaps.filter((x) => x.explainedBy)) {
    const row = rows[g.i]
    const { meter, correctCuft } = g.explainedBy!
    findings.push({
      id: `entry-error-${row.month}-${meter}`,
      kind: 'entry-error',
      severity: 'medium',
      status: 'new',
      meters: [meter],
      months: [row.month],
      headline: `${monthName(row.month)} cost doesn't match usage on ${inSentence(L(meter))}`,
      impactUsd: Math.round(Math.abs(g.gap)),
      impactLabel: 'cost discrepancy',
      confidence: 'high',
      evidence: [
        `${L(meter)} shows ${num(row.meters[meter])} cu ft, but its cost matches ${num(correctCuft)} cu ft.`,
        `That one entry explains the gap between ${usd(row.calcCost)} and ${usd(row.altCost)} (${usd(Math.abs(g.gap))}).`,
      ],
      causes: [{ text: 'Spreadsheet entry or formula error', weight: 0.9 }],
      nextStep: `Correct ${L(meter)} for ${monthName(row.month)}. Cress checks cu ft × rate on every row automatically.`,
      chart: { type: 'mismatch', months: [row.month], meter },
      facts: { gap: g.gap, recordedCuft: row.meters[meter], correctCuft, calcCost: row.calcCost, altCost: row.altCost },
    })
  }
  const unexplained = gaps.filter((x) => !x.explainedBy)
  if (unexplained.length) {
    findings.push({
      id: `cost-mismatch-${unexplained.map((g) => months[g.i]).join('_')}`,
      kind: 'cost-mismatch',
      severity: 'info',
      status: 'new',
      meters: [],
      months: unexplained.map((g) => months[g.i]),
      headline: `Calculated and billed cost disagree in ${list(unexplained.map((g) => monthName(months[g.i])))}`,
      impactUsd: Math.round(sum(unexplained.map((g) => Math.abs(g.gap)))),
      impactLabel: 'to reconcile',
      confidence: 'medium',
      evidence: unexplained.map((g) => `${monthName(months[g.i])}: ${usd(rows[g.i].calcCost)} calculated vs ${usd(rows[g.i].altCost)} billed (${usd(Math.abs(g.gap))}).`),
      causes: [
        { text: 'Fees or taxes on the bill that cu ft × rate leaves out', weight: 0.6 },
        { text: 'A rate change partway through the billing period', weight: 0.35 },
      ],
      nextStep: 'Reconcile these months against the bills. Cress shows billed and calculated side by side.',
      chart: { type: 'mismatch', months: unexplained.map((g) => months[g.i]), meter: null },
      facts: { total: sum(unexplained.map((g) => Math.abs(g.gap))) },
    })
  }

  // Dominant meter (Info).
  for (const d of findDominant(rows)) {
    const total = sum(rows.map((r) => r.totalCuft))
    findings.push({
      id: `dominant-meter-${d.meter}`,
      kind: 'dominant-meter',
      severity: 'info',
      status: 'new',
      meters: [d.meter],
      months,
      headline: `The ${inSentence(L(d.meter))} is the biggest gas user: ${pct(d.share)} of all gas`,
      impactUsd: Math.round(d.usd),
      impactLabel: `spent ${monthShort(months[0])}–${monthShort(months[months.length - 1])}`,
      confidence: 'high',
      evidence: [
        `${L(d.meter)}: ${num(d.cuft)} of ${num(total)} cu ft (${pct(d.share)}).`,
        `About ${usdK(d.usd)} of gas from ${monthShort(months[0])} to ${monthShort(months[months.length - 1])}.`,
      ],
      causes: [{ text: 'Heating an outdoor pool in a mountain climate', weight: 0.8 }],
      nextStep: 'Review cover use, the setpoint schedule and heater efficiency. A cover is usually the biggest lever. Verify the savings figure before quoting it.',
      chart: { type: 'share', meter: d.meter },
      facts: { share: d.share, cuft: d.cuft, total, usd: d.usd },
    })
  }

  // Budget shape (Info).
  const shape = checkBudgetShape(rows)
  if (shape.signals >= 2) {
    const evidence: string[] = []
    if (shape.offMonths.length >= T.BUDGET_OFF_MONTHS) {
      evidence.push(`${shape.offMonths.length} of ${rows.length} months missed budget by more than ${pct(T.BUDGET_OFF)}, in both directions.`)
    }
    for (const i of shape.equalPairs) evidence.push(`${monthName(months[i - 1])} and ${monthName(months[i])} have the same budget (${usd(rows[i].budget)}).`)
    for (const i of shape.flips) {
      evidence.push(`${monthName(months[i])}'s budget (${usd(rows[i].budget)}) is below ${monthName(months[i - 1])}'s (${usd(rows[i - 1].budget)}), though actual cost went up.`)
    }
    const totalBudget = sum(rows.map((r) => r.budget))
    const totalActual = sum(rows.map((r) => r.calcCost))
    findings.push({
      id: 'budget-shape',
      kind: 'budget-shape',
      severity: 'info',
      status: 'new',
      meters: [],
      months,
      headline: "The budget's shape doesn't match how the lodge uses gas",
      impactUsd: Math.round(totalBudget - totalActual),
      impactLabel: totalBudget >= totalActual ? 'under budget overall' : 'over budget overall',
      confidence: shape.signals === 3 ? 'high' : 'medium',
      evidence,
      causes: [{ text: 'Budget set from a flat estimate rather than metered history and weather', weight: 0.8 }],
      nextStep: 'Rebuild next year’s budget from metered history and weather. See the proposed budget.',
      chart: { type: 'budget' },
      facts: { totalBudget, totalActual, signals: shape.signals },
    })
  }

  // Seasonal shutdowns (Expected, never a flag).
  for (const s of shutdowns) {
    const xs = series(rows, s.meter)
    findings.push({
      id: `seasonal-shutdown-${s.meter}`,
      kind: 'seasonal-shutdown',
      severity: 'info',
      status: 'expected',
      meters: [s.meter],
      months: months.slice(s.start, s.end + 1),
      headline: `Expected: ${inSentence(L(s.meter))} seasonal shutdown`,
      impactUsd: null,
      impactLabel: '',
      confidence: 'high',
      evidence: [
        `${L(s.meter)} fell to ${list(months.slice(s.start, s.end + 1).map((mo, k) => `${num(xs[s.start + k])} in ${monthShort(mo)}`))}, against a usual ${num(median(xs))} cu ft.`,
        'It stayed down with no catch-up, which is what a heating boiler switched off for summer looks like.',
      ],
      causes: [{ text: 'Heating boiler shut off for summer', weight: 0.9 }],
      nextStep: 'Nothing to do. Confirm what this meter serves so the label is accurate.',
      chart: { type: 'band', series: [{ meter: s.meter, highlight: months.slice(s.start, s.end + 1) }] },
      facts: { start: s.start, end: s.end },
    })
  }

  return findings.sort((a, b) => {
    if ((a.status === 'expected') !== (b.status === 'expected')) return a.status === 'expected' ? 1 : -1
    return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.impactUsd ?? 0) - (a.impactUsd ?? 0)
  })
}
