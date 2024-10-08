import { EventAdapter } from "./adapters/event.adapter";
import { ProductAdapter } from "./adapters/product.adapter";
import { UserAdapter } from "./adapters/user.adapter";
import { app } from "./app"
import { EventService } from "./core/Events/event.service";
import { InventoryService } from "./core/Inventory/inventory.service";
import { UserService } from "./core/Users/user.service";
import { Express, Layer, pipe } from "./support/effect/express"

const program = app.pipe(Express.listen(3000, () => console.log("App started in port 3000")))

const mainLayer = pipe(
    Layer.mergeAll(
        InventoryService.Live,
        UserService.Live,
        EventService.Live
    ),
    Layer.provide(ProductAdapter.InMemory),
    Layer.provide(UserAdapter.InMemory),
    Layer.provide(EventAdapter.InMemory)
)

Express.run(Express.provide(program, mainLayer));