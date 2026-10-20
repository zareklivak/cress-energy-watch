import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'

export default function NotFound({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <Card className="mx-auto mt-8 max-w-md text-center">
      <p className="text-lead font-semibold">{message}</p>
      <Link to="/overview" className="mt-3 inline-block text-body font-semibold text-accent hover:underline">Back to the overview</Link>
    </Card>
  )
}
