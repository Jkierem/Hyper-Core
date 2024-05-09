import { Context, Effect, Layer } from "effect"
import { firestore } from "firebase-admin"
import { FirebaseAdapter } from "./firebase.adapter"

export declare namespace FirestoreAdapter {
    type Shape = {
        database: firestore.Firestore
    }
}

export class FirestoreAdapter 
extends Context.Tag("FirestoreAdapter")<
    FirestoreAdapter,
    FirestoreAdapter.Shape
>(){
    static Live = Layer.effect(FirestoreAdapter, Effect.gen(function*(_){
        const { app } = yield* _(FirebaseAdapter);

        return FirestoreAdapter.of({
            database: app.firestore()
        })
    }))
}