import { health } from '../server/handlers.js'

export function GET() {
  return health()
}
