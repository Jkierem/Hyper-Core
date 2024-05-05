import { Effect, Express, pipe } from "../../support/effect/express";
import { InventoryService } from "./inventory.service";

const postProduct = Express.gen(function*(_){
    const { request, response } = yield* _(Express.RouteContext("/products"));
    const inventory = yield* _(InventoryService);

    yield* _(
        inventory.createProduct(request.body),
        Effect.map(product => {
            response.status(200);
            response.json(product);
        }),
        Effect.catchAll(err => {
            response.status(400);
            response.json(err);
            return Effect.void;
        })
    )
})

const getProduct = Express.gen(function*(_){
    const { request, response } = yield* _(Express.RouteContext("/products/:id"));
    const inventory = yield* _(InventoryService);

    yield* _(
        inventory.getProduct(request.params.id),
        Effect.map(product => {
            response.status(200);
            response.json(product);
        }),
        Effect.catchAll((e) => {
            response.status(404);
            response.send("Not Found");
            return Effect.void;
        })
    )
})

const getProducts = Express.gen(function*(_){
    const { response } = yield* _(Express.RouteContext("/products"));
    const inventory = yield* _(InventoryService);

    yield* _(
        inventory.getProducts(),
        Effect.map(products => {
            response.status(200);
            response.json(products);
        })
    )
})

const InventoryRouter = pipe(
    Express.makeRouter(),
    Express.post("/", postProduct),
    Express.get("/:id", getProduct),
    Express.get("/", getProducts)
)

export const InventoryModule = Express.makeModule("/products", InventoryRouter);