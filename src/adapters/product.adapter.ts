import { Context, Effect, Layer, Option, pipe } from "effect"
import { CreateProduct, Product } from "../models/product"
import { ArrayRef, NotFound } from "../support/effect/array-ref";
import { FirestoreAdapter } from "./firestore.adapter";
import { omit } from "effect/Struct";

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
    static Firebase = Layer.effect(ProductAdapter, Effect.gen(function*(_){
        const { database } = yield* _(FirestoreAdapter);
        const products = database.collection("/products");
        return ProductAdapter.of({
            create(data) {
                return pipe(
                    Effect.promise(() => products.add(data)),
                    Effect.map(ref => ({ ...data, id: ref.id }))
                )
            },
            delete(id) {
                return Effect.promise(() => {
                    return products.doc(id).delete()
                })
            },
            get(id) {
                return pipe(
                    Effect.promise(() => products.doc(id).get()),
                    Effect.flatMap(snap => Option.fromNullable(snap.data() as Product)),
                    Effect.catchTag("NoSuchElementException", () => new NotFound({ id })),
                    Effect.map(data => ({ ...data, id }))
                )
            },
            getAll() {
                return pipe(
                    Effect.promise(() => products.get()),
                    Effect.map(snap => snap.docs.map(d => ({ ...d.data() as Product, id: d.id })))
                )
            },
            update(product) {
                return pipe(
                    Effect.promise(() => products.doc(product.id).set(omit(product, "id")))
                )
            },
        })
    }))

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