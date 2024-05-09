import { Context, Effect, Layer, pipe } from "effect"
import { Product, decodeCreateProduct } from "../../models/product"
import { ProductAdapter } from "../../adapters/product.adapter";
import { NotFound } from "../../support/effect/array-ref";
import { CreateError } from "../../support/effect/common";

export declare namespace InventoryService {
    type Shape = {
        createProduct: (data: unknown) => Effect.Effect<Product, CreateError>;
        getProduct: (id: string) => Effect.Effect<Product, NotFound<string>>;
        getProducts: () => Effect.Effect<Product[]>;
    }
}

export class InventoryService extends Context.Tag("InventoryService")<
    InventoryService,
    InventoryService.Shape
>(){
    static Live = Layer.effect(InventoryService, Effect.gen(function*(_){
        const adapter = yield* _(ProductAdapter);

        return InventoryService.of({
            createProduct(data){
                return pipe(
                    decodeCreateProduct(data),
                    Effect.flatMap(product => adapter.create(product)),
                    Effect.mapError(CreateError.fromParseError)
                )
            },
            getProduct(id) {
                return adapter.get(id);
            },
            getProducts() {
                return adapter.getAll();
            },
        })
    }))
}