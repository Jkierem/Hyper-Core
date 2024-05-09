import { Schema } from "@effect/schema";

export const URL = Schema.String.pipe(
    Schema.pattern(/^https?:\/\//)
)

export type URL = Schema.Schema.Type<typeof URL>;

export const ProductType = Schema.Union(
    Schema.Literal("jacket"),
    Schema.Literal("shirt"),
    Schema.Literal("accessory"),
    Schema.Literal("pants"),
    Schema.Literal("hoodie"),
    Schema.Literal("shoe"),
)

export type ProductType = Schema.Schema.Type<typeof ProductType>;

export const SizeCategory = Schema.Union(
    Schema.Literal("male"),
    Schema.Literal("female"),
    Schema.Literal("unisex"),
    Schema.Literal("oversize"),
    Schema.Literal("child"),
)

export type SizeCategory = Schema.Schema.Type<typeof SizeCategory>;

export const Product = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    image: URL,
    type: ProductType,
    sizeCategory: SizeCategory,
    price: Schema.Number.pipe(Schema.positive()),
    sizes: Schema.Array(Schema.String),
    creator: Schema.String
})

export type Product = Schema.Schema.Type<typeof Product>;

export const CreateProduct = Product.pipe(Schema.omit("id"));

export type CreateProduct = Schema.Schema.Type<typeof CreateProduct>;

export const decodeCreateProduct = Schema.decodeUnknown(CreateProduct);