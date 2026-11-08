import mongoose from "mongoose";
import { env } from "../config/env.js";
import { es, closeElasticsearch } from "../config/elasticsearch.js";
import Product from "../features/products/product.model.js";
import {
  PRODUCT_INDEX,
  recreateProductIndex,
} from "../features/search/product.index.js";
import { toSearchDocument } from "../features/search/product.sync.js";

const BATCH_SIZE = 500;

const flush = async (batch) => {
  if (batch.length === 0) return 0;

  const operations = batch.flatMap((product) => [
    { index: { _index: PRODUCT_INDEX, _id: String(product._id) } },
    toSearchDocument(product),
  ]);

  const response = await es.bulk({ operations });

  if (response.errors) {
    const failed = response.items.filter((item) => item.index?.error);
    throw new Error(
      `${failed.length} documents failed: ${failed[0].index.error.reason}`,
    );
  }

  return batch.length;
};

const reindex = async () => {
  await mongoose.connect(env.mongoUri);
  await recreateProductIndex();

  let indexed = 0;
  let batch = [];

  for await (const product of Product.find().cursor()) {
    batch.push(product);

    if (batch.length === BATCH_SIZE) {
      indexed += await flush(batch);
      batch = [];
    }
  }

  indexed += await flush(batch);

  await es.indices.refresh({ index: PRODUCT_INDEX });
  const { count } = await es.count({ index: PRODUCT_INDEX });
  const total = await Product.countDocuments();

  console.log("Products in MongoDB:", total);
  console.log("Indexed:", indexed);
  console.log("Documents in Elasticsearch:", count);
};

try {
  await reindex();
} catch (err) {
  console.error("Reindex failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  await closeElasticsearch();
}
