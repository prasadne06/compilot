import { coach } from '../server/handlers.js'

export function POST(req: Request) {
  return coach(req)
}
