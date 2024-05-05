import { EventAdapter } from "./adapters/event.adapter";
import { ProductAdapter } from "./adapters/product.adapter";
import { UserAdapter } from "./adapters/user.adapter";
import { EventModule } from "./core/Events/event.module";
import { EventService } from "./core/Events/event.service";
import { InventoryModule } from "./core/Inventory/inventory.module";
import { InventoryService } from "./core/Inventory/inventory.service";
import { UserModule } from "./core/Users/user.module";
import { UserService } from "./core/Users/user.service";
import { Express, Layer, pipe } from "./support/effect/express"
import { Logger } from "./support/effect/logger.middleware";

const program = pipe(
    Express.makeApp(),
    Express.classic.use(Express.express.json()),
    Express.use(Logger(r => `${r.method} - ${r.path}`)),
    Express.useModule(InventoryModule),
    Express.useModule(UserModule),
    Express.useModule(EventModule),
    Express.listen(3000, () => console.log("Listening on port 3000..."))
)

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
