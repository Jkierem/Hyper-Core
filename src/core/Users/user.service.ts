import { Context, Effect, Layer } from "effect"
import { Users } from "../../models/user";
import { UserAdapter } from "../../adapters/user.adapter";

export declare namespace UserService {
    type Shape = {
        getUsers: () => Effect.Effect<Users>;
    }
}

export class UserService extends Context.Tag("UserService")<
    UserService,
    UserService.Shape
>(){
    static Live = Layer.effect(UserService, Effect.gen(function*(_){
        const users = yield* _(UserAdapter);

        return UserService.of({
            getUsers() {
                return users.getAll()
            },
        })
    }))
}