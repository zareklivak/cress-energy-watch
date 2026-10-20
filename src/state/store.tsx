import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { proposeBudget, type BudgetPlan } from '../engine/budget'
import { compose } from '../engine/compose'
import { NORMAL_HDD, SAMPLE_ROWS, SEASON_HDD } from '../engine/sample'
import { DEFAULT_LABELS, METERS, type Finding, type MeterId, type MonthRow, type Status } from '../engine/types'

export type Units = 'usd' | 'cuft'
export type Dataset = {
  source: 'sample' | 'upload'
  fileName: string
  rows: MonthRow[]
  warnings: string[]
  analyzedAt: string
  /** True when the AI reader rebuilt the table from a messy file or PDF. */
  readByAi?: boolean
}
export type Activity = { id: string; findingId: string; at: string; kind: 'status' | 'note' | 'task'; text: string }
export type Task = { id: string; findingId: string; what: string; who: string; due: string }

export type AppState = {
  dataset: Dataset
  labels: Record<MeterId, string>
  statuses: Record<string, Status>
  activity: Activity[]
  tasks: Task[]
  month: string
  units: Units
}

export type Action =
  | { type: 'load'; dataset: Dataset }
  | { type: 'setStatus'; id: string; status: Status; reason?: string }
  | { type: 'addNote'; id: string; text: string }
  | { type: 'addTask'; task: Omit<Task, 'id'> }
  | { type: 'setLabel'; meter: MeterId; label: string }
  | { type: 'setMonth'; month: string }
  | { type: 'setUnits'; units: Units }

export const SAMPLE: Dataset = {
  source: 'sample',
  fileName: 'Sample data · Silver Pine Lodge gas, Dec 2025 to Aug 2026',
  rows: SAMPLE_ROWS,
  warnings: [],
  analyzedAt: new Date().toISOString(),
}

const STATUS_WORD: Record<Status, string> = { new: 'New', reviewing: 'Reviewing', resolved: 'Resolved', expected: 'Expected' }

/** The sample opens on May 2026 (the story month); uploads open on their last month. */
function openingMonth(dataset: Dataset): string {
  const last = dataset.rows[dataset.rows.length - 1].month
  return dataset.source === 'sample' && dataset.rows.some((r) => r.month === '2026-05') ? '2026-05' : last
}

function initialState(dataset: Dataset): AppState {
  return { dataset, labels: { ...DEFAULT_LABELS }, statuses: {}, activity: [], tasks: [], month: openingMonth(dataset), units: 'usd' }
}

let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`
const now = () => new Date().toISOString()

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return { ...initialState({ ...action.dataset, analyzedAt: now() }), labels: state.labels }
    case 'setStatus': {
      const text =
        action.status === 'expected'
          ? `Marked expected${action.reason ? `: ${action.reason}` : ''}`
          : `Status changed to ${STATUS_WORD[action.status]}`
      return {
        ...state,
        statuses: { ...state.statuses, [action.id]: action.status },
        activity: [...state.activity, { id: nextId('a'), findingId: action.id, at: now(), kind: 'status', text }],
      }
    }
    case 'addNote':
      return {
        ...state,
        activity: [...state.activity, { id: nextId('a'), findingId: action.id, at: now(), kind: 'note', text: action.text }],
      }
    case 'addTask': {
      const task: Task = { ...action.task, id: nextId('t') }
      const detail = [task.who, task.due && `due ${task.due}`].filter(Boolean).join(' · ')
      return {
        ...state,
        tasks: [...state.tasks, task],
        // Creating a task moves a New flag to Reviewing.
        statuses: state.statuses[task.findingId] ? state.statuses : { ...state.statuses, [task.findingId]: 'reviewing' },
        activity: [
          ...state.activity,
          { id: nextId('a'), findingId: task.findingId, at: now(), kind: 'task', text: `Task: ${task.what}${detail ? ` (${detail})` : ''}` },
        ],
      }
    }
    case 'setLabel':
      return { ...state, labels: { ...state.labels, [action.meter]: action.label } }
    case 'setMonth':
      return { ...state, month: action.month }
    case 'setUnits':
      return { ...state, units: action.units }
  }
}

type AppValue = {
  state: AppState
  dispatch: Dispatch<Action>
  rows: MonthRow[]
  labels: Record<MeterId, string>
  label: (m: MeterId) => string
  findings: Finding[]
  /** every finding except seasonal shutdowns */
  flags: Finding[]
  /** flags still New or Reviewing */
  openFlags: Finding[]
  /** seasonal shutdowns plus anything marked expected */
  expected: Finding[]
  budget: BudgetPlan
  findingById: (id: string) => Finding | undefined
}

const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children, initial = SAMPLE }: { children: ReactNode; initial?: Dataset }) {
  const [state, dispatch] = useReducer(reducer, initial, initialState)

  const labels = useMemo(
    () => Object.fromEntries(METERS.map((m) => [m, state.labels[m].trim() || DEFAULT_LABELS[m]])) as Record<MeterId, string>,
    [state.labels],
  )
  const findings = useMemo(
    () => compose(state.dataset.rows, SEASON_HDD, labels).map((f) => ({ ...f, status: state.statuses[f.id] ?? f.status })),
    [state.dataset.rows, labels, state.statuses],
  )
  const budget = useMemo(() => proposeBudget(state.dataset.rows, SEASON_HDD, NORMAL_HDD), [state.dataset.rows])

  const value = useMemo<AppValue>(() => {
    const flags = findings.filter((f) => f.kind !== 'seasonal-shutdown')
    return {
      state,
      dispatch,
      rows: state.dataset.rows,
      labels,
      label: (m) => labels[m],
      findings,
      flags,
      openFlags: flags.filter((f) => f.status === 'new' || f.status === 'reviewing'),
      expected: findings.filter((f) => f.status === 'expected'),
      budget,
      findingById: (id) => findings.find((f) => f.id === id),
    }
  }, [state, labels, findings, budget])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside <AppProvider>')
  return value
}
