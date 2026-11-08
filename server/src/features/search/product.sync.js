import { es } from "../../config/elasticsearch.js";
import { env } from "../../config/env.js";
import Product from "../products/product.model.js";
import { PRODUCT_INDEX } from "./product.index.js";

const REFRESH = env.nodeEnv === "test";

const idOf = (value) => String(value?._id ?? value);

export const toSearchDocument = (product) => ({
  productId: idOf(product),
  name: product.name,
  description: product.description ?? "",
  price: product.price,
  stock: product.stock,
  category: idOf(product.category),
  vendor: idOf(product.vendor),
  createdAt: product.createdAt,
});

export async function indexProduct(product) {
  try {
    await es.index({
      index: PRODUCT_INDEX,
      id: idOf(product),
      document: toSearchDocument(product),
      refresh: REFRESH,
    });
    return true;
  } catch (err) {
    console.error("Search index failed:", err.message);
    return false;
  }
}

export async function removeProductFromIndex(productId) {
  try {
    await es.delete(
      { index: PRODUCT_INDEX, id: String(productId), refresh: REFRESH },
      { ignore: [404] },
    );
    return true;
  } catch (err) {
    console.error("Search delete failed:", err.message);
    return false;
  }
}

export async function syncProductsByIds(ids) {
  try {
    const uniqueIds = [...new Set(ids.map(String))];
    const products = await Product.find({ _id: { $in: uniqueIds } });
    await Promise.all(products.map((product) => indexProduct(product)));
  } catch (err) {
    console.error("Search sync failed:", err.message);
  }
}
