import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';

export const INDEX_NAME = 'email_jobs';

export class ElasticsearchService {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.node,
      auth: config.elasticsearch.username && config.elasticsearch.password ? {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      } : undefined,
      requestTimeout: 4000,
      maxRetries: 2,
    });
  }

  private initPromise: Promise<boolean> | null = null;

  async checkHealthAndInit(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const health = await this.client.cluster.health();
        this.isConnected = true;
        logger.info(`[Elasticsearch] Connected successfully. Cluster status: ${health.status}`);
        await this.createIndexIfNotExists();
        return true;
      } catch (error) {
        this.isConnected = false;
        logger.warn('[Elasticsearch] Cluster unreachable. Search queries will seamlessly fall back to MySQL.');
        return false;
      }
    })();

    return this.initPromise;
  }

  get isServiceAvailable(): boolean {
    return this.isConnected;
  }

  private async createIndexIfNotExists(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: INDEX_NAME });
      if (!exists) {
        await this.client.indices.create({
          index: INDEX_NAME,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text', analyzer: 'standard' },
              body: { type: 'text', analyzer: 'standard' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        });
        logger.info(`[Elasticsearch] Created index '${INDEX_NAME}' with mappings.`);
      }
    } catch (error: any) {
      if (error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        logger.info(`[Elasticsearch] Index '${INDEX_NAME}' already exists.`);
      } else {
        logger.error('[Elasticsearch] Error verifying/creating index:', error);
      }
    }
  }

  async indexJob(job: {
    id: string;
    userId: string;
    senderId: string;
    senderEmail?: string;
    recipientEmail: string;
    subject: string;
    body: string;
    status: string;
    scheduledAt: Date;
    sentAt?: Date | null;
    createdAt?: Date;
  }): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.index({
        index: INDEX_NAME,
        id: job.id,
        document: {
          id: job.id,
          userId: job.userId,
          senderId: job.senderId,
          senderEmail: job.senderEmail,
          recipientEmail: job.recipientEmail,
          subject: job.subject,
          body: job.body,
          status: job.status,
          scheduledAt: job.scheduledAt,
          sentAt: job.sentAt || null,
          createdAt: job.createdAt || new Date(),
        },
      });
      return true;
    } catch (error) {
      logger.error(`[Elasticsearch] Failed to index job ${job.id}:`, error);
      return false;
    }
  }

  async searchJobs(
    queryText: string,
    options: {
      userId?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ hits: any[]; total: number } | null> {
    if (!this.isConnected) {
      return null;
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const from = (page - 1) * limit;

    const mustClauses: any[] = [];

    if (options.userId) {
      mustClauses.push({ term: { userId: options.userId } });
    }

    if (options.status) {
      mustClauses.push({ term: { status: options.status } });
    }

    if (queryText && queryText.trim().length > 0) {
      mustClauses.push({
        multi_match: {
          query: queryText.trim(),
          fields: ['recipientEmail^3', 'subject^2', 'body', 'status'],
          fuzziness: 'AUTO',
        },
      });
    }

    try {
      const response = await this.client.search({
        index: INDEX_NAME,
        from,
        size: limit,
        query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
        sort: [{ scheduledAt: { order: 'desc' } }],
      });

      const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
      const hits = response.hits.hits.map((h: any) => h._source);

      return { hits, total };
    } catch (error) {
      logger.error('[Elasticsearch] Search query failed, falling back to database:', error);
      return null;
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
