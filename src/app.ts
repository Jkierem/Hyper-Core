import { EventModule } from "./core/Events/event.module";
import { InventoryModule } from "./core/Inventory/inventory.module";
import { UserModule } from "./core/Users/user.module";
import { Express, pipe } from "./support/effect/express"
import { Logger } from "./support/effect/logger.middleware";

export const app = pipe(
    Express.makeApp(),
    Express.classic.use(Express.express.json()),
    Express.use(Logger(r => `${r.method} - ${r.path}`)),
    Express.useModule(InventoryModule),
    Express.useModule(UserModule),
    Express.useModule(EventModule),
)
