import { Context, Effect, Layer } from "effect"
import { CreateProduct, Product } from "../models/product"
import { ArrayRef, NotFound } from "../support/effect/array-ref";

export declare namespace ProductAdapter {
    type Shape = {
        create: (data: CreateProduct) => Effect.Effect<Product>;
        delete: (id: string) => Effect.Effect<void>;
        update: (product: Product) => Effect.Effect<void, NotFound<string>>;
        get: (id: string) => Effect.Effect<Product, NotFound<string>>;
        getAll: () => Effect.Effect<Product[]>;
    }
}

export class ProductAdapter 
extends Context.Tag("ProductAdapter")<
    ProductAdapter,
    ProductAdapter.Shape
>() {
    static InMemoryWith = (data: Product[] = []) => Layer.effect(ProductAdapter, Effect.gen(function* (_){
        const products = yield* _(ArrayRef.make(data, p => p.id));

        return ProductAdapter.of({
            create(data) {
                const newProd = {
                    id: crypto.randomUUID(),
                    ...data,
                } as Product
                return products.add(newProd)
                    .pipe(Effect.zipRight(Effect.succeed(newProd)))
            },
            delete(id) {
                return products.delete(id);
            },
            get(id) {
                return products.find(id);
            },
            getAll() {
                return products.read()
            },
            update(product) {
                return products.delete(product.id).pipe(
                    Effect.zipRight(products.add(product))
                )
            },
        })
    }))

    static InMemory = this.InMemoryWith([
        {
            id: "e3aa05a3-df59-4375-a714-fb41fe531e74",
            image: "https://picsum.photos/200/300",
            name: "Mock",
            price: 10.50,
            sizeCategory: "unisex",
            sizes: ["S", "M", "L"],
            type: "hoodie",
            creator: '2eb32c64-34f6-4f96-b2ae-92cc342dc5db'
        }
    ]);
}