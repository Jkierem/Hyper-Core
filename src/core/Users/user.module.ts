import { Express, pipe } from "../../support/effect/express";
import { UserService } from "./user.service";

const getUsers = Express.gen(function*(_){
    const { response } = yield* _(Express.RouteContext("/users"));
    const service = yield* _(UserService)

    // TODO: Should verify some sort of secret key;
    const users = yield* _(service.getUsers());

    response.status(200).json(users)
})

const UserRouter = pipe(
    Express.makeRouter(),
    Express.get("/", getUsers)
)

export const UserModule = Express.makeModule("/users", UserRouter);