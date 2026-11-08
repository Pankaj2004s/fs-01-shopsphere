import { es } from "../../config/elasticsearch.js";
import { env } from "../../config/env.js";

export const PRODUCT_INDEX =
  env.nodeEnv === "test" ? "shopsphere-products-test" : "shopsphere-products";

const indexSettings = {
  number_of_shards: 1,
  number_of_replicas: 0,
};

const indexMappings = {
  dynamic: "strict",
  properties: {
    productId: { type: "keyword" },
    name: { type: "text", analyzer: "english" },
    description: { type: "text", analyzer: "english" },
    price: { type: "double" },
    stock: { type: "integer" },
    category: { type: "keyword" },
    vendor: { type: "keyword" },
    createdAt: { type: "date" },
  },
};

const createIndex = () =>
  es.indices.create({
    index: PRODUCT_INDEX,
    settings: indexSettings,
    mappings: indexMappings,
  });

export async function ensureProductIndex() {
  const exists = await es.indices.exists({ index: PRODUCT_INDEX });
  if (exists) return false;

  await createIndex();
  return true;
}

export async function recreateProductIndex() {
  await es.indices.delete({ index: PRODUCT_INDEX, ignore_unavailable: true });
  await createIndex();
}
