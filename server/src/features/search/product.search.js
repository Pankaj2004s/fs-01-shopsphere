import { es } from "../../config/elasticsearch.js";
import { PRODUCT_INDEX } from "./product.index.js";

const sortOptions = {
  newest: [{ createdAt: "desc" }, { productId: "desc" }],
  oldest: [{ createdAt: "asc" }, { productId: "asc" }],
  price_asc: [{ price: "asc" }, { productId: "asc" }],
  price_desc: [{ price: "desc" }, { productId: "desc" }],
};

export async function searchProductIds({
  page,
  limit,
  search,
  category,
  minPrice,
  maxPrice,
  sort,
}) {
  const filter = [];

  if (category) {
    filter.push({ term: { category: String(category) } });
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const range = {};
    if (minPrice !== undefined) range.gte = minPrice;
    if (maxPrice !== undefined) range.lte = maxPrice;
    filter.push({ range: { price: range } });
  }

  const must = search
    ? [
        {
          multi_match: {
            query: search,
            fields: ["name^3", "description"],
            fuzziness: "AUTO",
            operator: "and",
          },
        },
      ]
    : [{ match_all: {} }];

  const response = await es.search({
    index: PRODUCT_INDEX,
    query: { bool: { must, filter } },
    sort: sortOptions[sort] ?? sortOptions.newest,
    from: (page - 1) * limit,
    size: limit,
    track_total_hits: true,
    _source: false,
  });

  const total = response.hits.total;

  return {
    ids: response.hits.hits.map((hit) => hit._id),
    total: typeof total === "number" ? total : total.value,
  };
}
