import { Client } from '@elastic/elasticsearch';
import { config } from './index';
import { logger } from '../utils/logger';

export const elasticClient = new Client({
  node: config.elasticsearch.node,
  auth: config.elasticsearch.username && config.elasticsearch.password ? {
    username: config.elasticsearch.username,
    password: config.elasticsearch.password,
  } : undefined,
});

export const checkElasticsearchConnection = async (): Promise<boolean> => {
  try {
    const health = await elasticClient.cluster.health();
    logger.info(`Elasticsearch connected with cluster status: ${health.status}`);
    return true;
  } catch (error) {
    logger.warn('Elasticsearch not reachable at this moment');
    return false;
  }
};
