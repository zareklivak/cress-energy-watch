import { Navigate, Route, Routes } from 'react-router-dom'
import Budget from './screens/Budget'
import Detail from './screens/Detail'
import Inbox from './screens/Inbox'
import MeterPage from './screens/MeterPage'
import Meters from './screens/Meters'
import More from './screens/More'
import Overview from './screens/Overview'
import Preview from './screens/Preview'
import Report from './screens/Report'
import Settings from './screens/Settings'
import UiGallery from './screens/UiGallery'
import Upload from './screens/Upload'
import { AppShell } from './ui/shell/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Upload />} />
      <Route path="/__ui" element={<UiGallery />} />
      <Route element={<AppShell />}>
        <Route path="/overview" element={<Overview />} />
        <Route path="/anomalies" element={<Inbox />} />
        <Route path="/anomalies/:id" element={<Detail />} />
        <Route path="/meters" element={<Meters />} />
        <Route path="/meters/:meter" element={<MeterPage />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/reports" element={<Report />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/more" element={<More />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}
