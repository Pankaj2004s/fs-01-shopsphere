import { Client } from "@elastic/elasticsearch";
import { env } from "./env.js";

export const es = new Client({
  node: env.elasticsearchUrl,
  maxRetries: 1,
  requestTimeout: 3000,
});

export async function pingElasticsearch() {
  try {
    return await es.ping();
  } catch (err) {
    console.error("Elasticsearch ping failed:", err.message);
    return false;
  }
}

export async function closeElasticsearch() {
  await es.close();
}
