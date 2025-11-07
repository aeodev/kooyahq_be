import { createServer } from 'node:http'
import { createApp } from './app'
import { env } from './config/env'
import { connectToDatabase } from './lib/mongo'
import { initializeSocket } from './lib/socket'
import { startTimerHeartbeat } from './modules/time-tracker/time-entry-heartbeat'

async function start() {
  try {
    await connectToDatabase()

    const app = createApp()
    const server = createServer(app)

    // Initialize Socket.IO
    initializeSocket(server)

    // Start timer heartbeat service for synchronization
    startTimerHeartbeat()

    server.listen(env.port, () => {
      console.log(`🚀 API ready at http://localhost:${env.port}`)
    })
  } catch (error) {
    console.error('Failed to start server', error)
    process.exit(1)
  }
}

void start()
