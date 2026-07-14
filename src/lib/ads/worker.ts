import { prisma } from '../prisma'
import { JobStatus, AdJobType } from '@prisma/client'
import { AdsService } from './service'

const POLLING_INTERVAL_MS = 30000 // 30 seconds
const LOCK_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export class AdsWorker {
    private isRunning: boolean = false
    private timer: NodeJS.Timeout | null = null
    private syncTimer: NodeJS.Timeout | null = null

    start() {
        if (this.isRunning) return
        this.isRunning = true
        console.log('[AdsWorker] Started background job runner.')
        this.run()
        this.startScheduler()
    }

    stop() {
        this.isRunning = false
        if (this.timer) clearTimeout(this.timer)
        if (this.syncTimer) clearInterval(this.syncTimer)
        console.log('[AdsWorker] Stopped background job runner.')
    }

    private startScheduler() {
        // Run metrics sync every 60 minutes
        this.syncTimer = setInterval(async () => {
            console.log('[AdsWorker] Scheduling periodic SYNC_METRICS job.')
            await prisma.adJob.create({
                data: {
                    type: AdJobType.SYNC_METRICS,
                    platform: 'META', // For now primarily Meta
                    status: JobStatus.QUEUED
                }
            })
        }, 60 * 60 * 1000)
    }

    private async run() {
        try {
            await this.processNextJob()
        } catch (error) {
            console.error('[AdsWorker] Error in worker loop:', error)
        } finally {
            if (this.isRunning) {
                this.timer = setTimeout(() => this.run(), POLLING_INTERVAL_MS)
            }
        }
    }

    private async processNextJob() {
        // Find next queued job that isn't locked or lock has expired
        const now = new Date()
        const lockThreshold = new Date(Date.now() - LOCK_TIMEOUT_MS)

        const job = await prisma.adJob.findFirst({
            where: {
                status: JobStatus.QUEUED,
                AND: [
                    { OR: [{ lockedAt: null }, { lockedAt: { lte: lockThreshold } }] },
                    { OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] }
                ]
            },
            orderBy: { createdAt: 'asc' }
        })

        if (!job) return

        // Lock the job
        const lockedJob = await prisma.adJob.updateMany({
            where: { id: job.id, updatedAt: job.updatedAt }, // Optimistic lock
            data: {
                lockedAt: new Date(),
                status: JobStatus.RUNNING
            }
        })

        if (lockedJob.count === 0) return // Someone else picked it up

        console.log(`[AdsWorker] Processing job ${job.id} (${job.type}) for platform ${job.platform}`)

        try {
            switch (job.type) {
                case AdJobType.PUBLISH:
                    if (job.payload && typeof job.payload === 'object' && 'draftId' in job.payload) {
                        await AdsService.publishCampaign((job.payload as any).draftId)
                    }
                    break
                case AdJobType.SYNC_METRICS:
                    await AdsService.syncAllMetrics()
                    break
                case AdJobType.REFRESH_TOKEN:
                    if (job.payload && typeof job.payload === 'object' && 'integrationId' in job.payload) {
                        await AdsService.refreshIntegrationToken((job.payload as any).integrationId)
                    }
                    break
                case AdJobType.HEALTH:
                    // TODO: Implement health check
                    break
            }

            await prisma.adJob.update({
                where: { id: job.id },
                data: { status: JobStatus.SUCCEEDED, lockedAt: null }
            })
            console.log(`[AdsWorker] Job ${job.id} succeeded.`)
        } catch (error: any) {
            const attempts = job.attempts + 1
            const shouldRetry = attempts < 3

            await prisma.adJob.update({
                where: { id: job.id },
                data: {
                    status: shouldRetry ? JobStatus.QUEUED : JobStatus.FAILED,
                    attempts,
                    lastError: error.message,
                    lockedAt: null,
                    nextRunAt: shouldRetry ? new Date(Date.now() + 5 * 60 * 1000) : null // Wait 5 mins for retry
                }
            })
            console.error(`[AdsWorker] Job ${job.id} failed: ${error.message}. ${shouldRetry ? 'Scheduled for retry.' : 'Max attempts reached.'}`)
        }
    }
}

// Singleton instance
export const adsWorker = new AdsWorker()
