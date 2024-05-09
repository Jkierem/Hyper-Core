import { FirestoreAdapter } from "./adapters/firestore.adapter";
import { EventAdapter } from "./adapters/event.adapter";
import { FirebaseAdapter } from "./adapters/firebase.adapter";
import { ProductAdapter } from "./adapters/product.adapter";
import { UserAdapter } from "./adapters/user.adapter";
import { app } from "./app"
import { EventService } from "./core/Events/event.service";
import { InventoryService } from "./core/Inventory/inventory.service";
import { UserService } from "./core/Users/user.service";
import { Effect, Express, Layer, pipe } from "./support/effect/express"

const mainLayer = pipe(
    Layer.mergeAll(
        InventoryService.Live,
        UserService.Live,
        EventService.Live
    ),
    Layer.provide(ProductAdapter.Firebase),
    Layer.provide(UserAdapter.Firebase),
    Layer.provide(EventAdapter.Firebase),
    Layer.provide(FirestoreAdapter.Live),
    Layer.provide(FirebaseAdapter.Live),
)

export const main = Effect.runSync(Express.provide(app, mainLayer));