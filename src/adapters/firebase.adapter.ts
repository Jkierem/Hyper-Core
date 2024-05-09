import { Context, Effect, Layer } from "effect";
import admin, { type app } from "firebase-admin";

export declare namespace FirebaseAdapter {
    type Shape = {
        app: app.App
    }
}

export class FirebaseAdapter 
extends Context.Tag("FirebaseAdapter")<
    FirebaseAdapter,
    FirebaseAdapter.Shape
>(){
    static Live = Layer.effect(FirebaseAdapter, Effect.sync(() => {
        return FirebaseAdapter.of({
            app: admin.initializeApp()
        })
    }))
}