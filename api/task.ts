import { task } from '../server/handlers.js'

export function POST(req: Request) {
  return task(req)
}
