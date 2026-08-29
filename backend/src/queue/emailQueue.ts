import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export interface EmailJobData {
  emailId: string;
}

/**
 * BullMQ Email Queue instance for managing delayed email delivery jobs.
 */
export const emailQueue = new Queue<EmailJobData>('emailQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800, count: 5000 },
  },
});
