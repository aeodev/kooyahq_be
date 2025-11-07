import os from 'node:os'

export function createHealthSnapshot() {
  const memory = process.memoryUsage()

  return {
    uptime: Number(process.uptime().toFixed(0)),
    timestamp: new Date().toISOString(),
    resources: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
    },
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
    },
  }
}
