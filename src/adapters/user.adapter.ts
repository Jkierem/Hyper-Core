import { Context, Effect, Layer } from "effect"
import { User } from "../models/user"
import { ArrayRef } from "../support/effect/array-ref"

export declare namespace UserAdapter {
    type Shape = {
        getAll: () => Effect.Effect<User[]>
    }
}


export class UserAdapter extends Context.Tag("UserAdapter")<
    UserAdapter,
    UserAdapter.Shape
>(){
    static InMemoryWith = (data: User[] = []) => Layer.effect(UserAdapter, Effect.gen(function*(_){
        const users = yield* _(ArrayRef.make(data, u => u.id));

        return UserAdapter.of({
            getAll() {
                return users.read()
            },
        }) 
    }))

    static InMemory = this.InMemoryWith([
        { 
            name: "Juan Gomez", 
            id: '2eb32c64-34f6-4f96-b2ae-92cc342dc5db',
            group: "admin"
        }
    ]);
}