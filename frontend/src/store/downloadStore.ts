// "create" is Zustand's main function — it creates a store.
// "persist" is a Zustand middleware that saves the store to localStorage
//   so downloads survive a page refresh.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Import our shared types.
import type { DownloadJob, DownloadStatus } from '@/types'


// =============================================================================
// DownloadStore — the shape of our global download state.
//
// A Zustand store is just a plain object with two things:
//   1. STATE: the data (e.g. the list of jobs)
//   2. ACTIONS: functions that update the state
//
// Convention: state properties start with a noun (jobs, activeCount)
//             actions start with a verb (addJob, updateProgress, etc.)
// =============================================================================
interface DownloadStore {

  // --- STATE ---

  // The list of all download jobs (pending, active, paused, completed, failed).
  // This is an array of DownloadJob objects (defined in types/index.ts).
  jobs: DownloadJob[]

  // How many downloads are currently active (downloading right now).
  // Derived from "jobs" but cached here to avoid recalculating on every render.
  activeCount: number

  // --- ACTIONS ---

  // Add a brand-new download job to the queue.
  addJob: (job: DownloadJob) => void

  // Update the progress of an existing job identified by its "id".
  // "Partial<DownloadJob>" means you only need to provide the fields you are changing
  // — you do NOT have to repeat all fields of the entire job.
  updateJob: (id: string, updates: Partial<DownloadJob>) => void

  // Remove a job from the list (e.g. when the user clicks "clear completed").
  removeJob: (id: string) => void

  // Update just the progress fields of a job (bytes, speed, ETA).
  // Separated from updateJob for clarity and performance — these update many times per second.
  updateProgress: (
    id:                string,
    downloadedBytes:   number,
    totalBytes:        number,
    speedBytesPerSec:  number,
    etaSeconds:        number,
  ) => void

  // Change a job's status (e.g. from 'active' to 'paused').
  setStatus: (id: string, status: DownloadStatus) => void

  // Remove all jobs that have completed or failed.
  clearFinished: () => void

  // Return just the jobs in a specific status (useful for filtered views).
  getJobsByStatus: (status: DownloadStatus) => DownloadJob[]
}


// =============================================================================
// useDownloadStore
// This is the hook components import and call to use the store.
//
// Example usage in a component:
//   const jobs      = useDownloadStore((s) => s.jobs)
//   const addJob    = useDownloadStore((s) => s.addJob)
//   addJob(newJob)
// =============================================================================
export const useDownloadStore = create<DownloadStore>()(

  // "persist" wraps the store so its state is saved to localStorage.
  // The second argument is a config object with the key to use in localStorage.
  persist(

    // "set" is Zustand's way to update state.
    // "get" lets you read the current state from inside an action.
    (set, get) => ({

      // -----------------------------------------------------------------------
      // INITIAL STATE
      // -----------------------------------------------------------------------

      // Start with an empty list of jobs.
      jobs: [],

      // Start with zero active downloads.
      activeCount: 0,

      // -----------------------------------------------------------------------
      // ACTIONS
      // -----------------------------------------------------------------------

      // Add a new job to the END of the jobs array.
      addJob: (job) => {
        set((state) => {
          // Create a new array with the existing jobs plus the new one.
          // WHY use [...state.jobs, job] instead of state.jobs.push(job)?
          //   Zustand (and React) require IMMUTABLE updates — never mutate state directly.
          //   Spreading into a new array creates a new reference, which tells React to re-render.
          const updatedJobs = [...state.jobs, job]

          return {
            jobs:        updatedJobs,
            activeCount: countActive(updatedJobs),
          }
        })
      },

      // Update specific fields of an existing job.
      updateJob: (id, updates) => {
        set((state) => {
          // "map" creates a new array by transforming each item.
          // For the matching job, spread existing fields then overwrite with "updates".
          // "{ ...job, ...updates }" = "take all of job's fields, then apply updates on top".
          const updatedJobs = state.jobs.map((job) =>
            job.id === id ? { ...job, ...updates } : job
          )

          return {
            jobs:        updatedJobs,
            activeCount: countActive(updatedJobs),
          }
        })
      },

      // Remove a single job by its ID.
      removeJob: (id) => {
        set((state) => {
          // "filter" creates a new array with only the jobs that do NOT match the ID.
          const updatedJobs = state.jobs.filter((job) => job.id !== id)

          return {
            jobs:        updatedJobs,
            activeCount: countActive(updatedJobs),
          }
        })
      },

      // Update only the progress-related fields of a job.
      // This is called many times per second while a file is downloading,
      // so keeping it focused on just progress fields avoids unnecessary work.
      updateProgress: (id, downloadedBytes, totalBytes, speedBytesPerSec, etaSeconds) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? {
                  ...job,
                  downloadedBytes,
                  totalBytes,
                  speedBytesPerSec,
                  etaSeconds,
                  // Calculate the percentage. Guard against division by zero.
                  progressPercent: totalBytes > 0
                    ? Math.round((downloadedBytes / totalBytes) * 100)
                    : 0,
                }
              : job
          ),
        }))
      },

      // Change a job's status field.
      setStatus: (id, status) => {
        set((state) => {
          const updatedJobs = state.jobs.map((job) => {
            if (job.id !== id) return job

            // When a download completes, record the finish time.
            const completedAt = status === 'completed'
              ? new Date().toISOString()
              : job.completedAt

            return { ...job, status, completedAt }
          })

          return {
            jobs:        updatedJobs,
            activeCount: countActive(updatedJobs),
          }
        })
      },

      // Remove all completed and failed jobs from the list.
      clearFinished: () => {
        set((state) => {
          const updatedJobs = state.jobs.filter(
            (job) => job.status !== 'completed' && job.status !== 'failed'
          )
          return {
            jobs:        updatedJobs,
            activeCount: countActive(updatedJobs),
          }
        })
      },

      // Return jobs filtered by status.
      // "get()" reads the current state from inside an action.
      getJobsByStatus: (status) => {
        return get().jobs.filter((job) => job.status === status)
      },
    }),

    // "persist" configuration:
    {
      // The key under which state is saved in localStorage.
      name: 'mediavault-downloads',

      // "partialize" controls WHICH parts of the state get saved.
      // WHY: We only persist the jobs list. "activeCount" can always be recalculated.
      //      Saving actions would be wasteful (they are just functions, not data).
      partialize: (state) => ({ jobs: state.jobs }),
    }
  )
)


// =============================================================================
// countActive (private helper, not exported)
// Counts how many jobs currently have status === 'active'.
// Called after every state change to keep "activeCount" up to date.
// =============================================================================
function countActive(jobs: DownloadJob[]): number {
  // "reduce" loops over the array and accumulates a single value.
  // Here we start at 0 and add 1 each time we see an 'active' job.
  return jobs.reduce((count, job) => (job.status === 'active' ? count + 1 : count), 0)
}
