import { monthShort, num } from '../../engine/format'
import { METERS, type MeterId, type MonthRow } from '../../engine/types'
import { Pill } from '../Pill'

export function RepeatTable({ rows, months, meters, label }: { rows: MonthRow[]; months: string[]; meters: MeterId[]; label: (m: MeterId) => string }) {
  const a = rows.find((r) => r.month === months[0])!
  const b = rows.find((r) => r.month === months[1])!
  const ordered = [...METERS].sort((x, y) => Number(meters.includes(y)) - Number(meters.includes(x)))
  return (
    <table className="w-full text-body">
      <thead>
        <tr className="text-left text-caption text-mute">
          <th className="pb-2 font-semibold">Meter</th>
          <th className="pb-2 text-right font-semibold">{monthShort(a.month)}</th>
          <th className="pb-2 text-right font-semibold">{monthShort(b.month)}</th>
          <th className="pb-2 pl-2 text-right font-semibold">{monthShort(b.month)} vs {monthShort(a.month)}</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((m) => (
          <tr key={m} className="border-t border-line">
            <td className="max-w-[9rem] truncate py-2">{label(m)}</td>
            <td className="num py-2 text-right">{num(a.meters[m])}</td>
            <td className="num py-2 text-right">{num(b.meters[m])}</td>
            <td className="py-2 pl-2 text-right">
              {meters.includes(m) ? (
                <Pill className="bg-medium-soft text-medium">Identical</Pill>
              ) : a.meters[m] === 0 && b.meters[m] === 0 ? (
                <span className="text-caption text-mute">Both zero</span>
              ) : (
                <span className="text-caption text-mute">Changed</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
