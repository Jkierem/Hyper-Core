import type { Request } from "express";
import { Effect, Express } from "./express";

export const Logger = (format: (r: Request) => string) => Express.gen(function*(_){
    const { next, request: r } = yield* _(Express.DefaultContext);

    yield* _(Effect.logInfo(format(r)))

    next()
})