import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';

export const esClient = new Client({
  node: env.elasticsearchNode,
});

const INDEX_NAME = 'emails';

/**
 * Initializes the Elasticsearch 'emails' index mapping on application startup.
 */
export async function initElasticsearchIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            rescheduleCount: { type: 'integer' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`🔎 Elasticsearch index '${INDEX_NAME}' created successfully.`);
    }
  } catch (err: any) {
    console.error(`⚠️ Elasticsearch index initialization warning: ${err.message}`);
  }
}

/**
 * Indexes or updates an Email document in Elasticsearch synchronously inside a safe try-catch wrapper.
 */
export async function indexEmailDocument(emailData: {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  rescheduleCount: number;
  createdAt: Date;
}): Promise<void> {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: emailData.id,
      document: {
        id: emailData.id,
        userId: emailData.userId,
        senderId: emailData.senderId,
        senderEmail: emailData.senderEmail,
        recipientEmail: emailData.recipientEmail,
        subject: emailData.subject,
        body: emailData.body,
        status: emailData.status,
        scheduledAt: emailData.scheduledAt.toISOString(),
        sentAt: emailData.sentAt ? emailData.sentAt.toISOString() : null,
        rescheduleCount: emailData.rescheduleCount,
        createdAt: emailData.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error(`⚠️ Elasticsearch indexing failed for email ${emailData.id} (non-fatal): ${err.message}`);
  }
}

/**
 * Searches indexed emails matching a query string.
 * If query matches an EmailStatus enum (SCHEDULED, SENT, FAILED case-insensitively),
 * applies strict term filtering on the status field.
 */
export async function searchEmailsInES(query: string, userId?: string): Promise<any[]> {
  try {
    const trimmedQuery = query.trim().toUpperCase();
    const isStatusEnum = ['SCHEDULED', 'SENT', 'FAILED'].includes(trimmedQuery);

    const mustQueries: any[] = [];

    if (isStatusEnum) {
      mustQueries.push({ term: { status: trimmedQuery } });
    } else {
      mustQueries.push({
        multi_match: {
          query,
          fields: ['subject^3', 'body', 'recipientEmail^2', 'senderEmail'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (userId) {
      mustQueries.push({ term: { userId } });
    }

    const response = await esClient.search({
      index: INDEX_NAME,
      query: {
        bool: {
          must: mustQueries,
        },
      },
    });

    return response.hits.hits.map((hit: any) => hit._source);
  } catch (err: any) {
    console.error(`⚠️ Elasticsearch search query failed: ${err.message}`);
    return [];
  }
}
