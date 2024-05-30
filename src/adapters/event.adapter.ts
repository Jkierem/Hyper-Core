import { Context, Effect, Either, Layer, Option, pipe } from "effect"
import { ArrayRef, NotFound } from "../support/effect/array-ref";
import { CreateEvent, Firestore, FirestoreHypeEvent, HypeEvent } from "../models/event";
import { FirestoreAdapter } from "./firestore.adapter";
import { Query } from "../support/query/query";
import crypto from "node:crypto";

export declare namespace EventAdapter {
    type Shape = {
        get: (eventId: string) => Effect.Effect<HypeEvent, NotFound<string>>;
        update: (event: HypeEvent) => Effect.Effect<void, NotFound<string>>;
        create: (data: CreateEvent) => Effect.Effect<HypeEvent>;
        delete: (eventId: string) => Effect.Effect<void>;
        doQuery: (query: Query<HypeEvent>) => Effect.Effect<HypeEvent[]>
    }
}

export class EventAdapter extends Context.Tag("EventAdapter")<
    EventAdapter,
    EventAdapter.Shape
>(){
    static Firebase = Layer.effect(EventAdapter, Effect.gen(function*(_){
        const { database: db } = yield* _(FirestoreAdapter);

        return EventAdapter.of({
            create(data) {
                const newEvent = {
                    ...data,
                    inventory: [],
                    invites: [],
                    productLimit: 999,
                    purchaseLimit: 999,
                    status: "ready",
                } as Omit<HypeEvent, "id">;

                return pipe(
                    Effect.promise(() => db.collection("/events").add(newEvent)),
                    Effect.map(ref => {
                        return {
                            ...newEvent,
                            id: ref.id
                        }
                    })
                )
            },
            delete(eventId) {
                return pipe(
                    Effect.promise(() => db.collection("/events").doc(eventId).delete()),
                )
            },
            get(eventId) {
                return pipe(
                    Effect.promise(() => db.collection("/events").doc(eventId).get()),
                    Effect.flatMap(ref => Option.fromNullable(ref.data() as FirestoreHypeEvent)),
                    Effect.catchTag("NoSuchElementException", () => new NotFound({ id: eventId })),
                    Effect.flatMap(ev => Firestore.HypeEvent.from({ ...ev, id: eventId })),
                    Effect.flatten,
                    Effect.catchTag("ParseError", () => new NotFound({ id: eventId }))
                )
            },
            update(event) {
                return pipe(
                    Effect.sync(() => db.collection("/events").doc(event.id)),
                    Effect.bindTo("ref"),
                    Effect.bind("snap", ({ ref }) => Effect.promise(() => ref.get())),
                    Effect.flatMap(({ snap, ref }) => {
                        if( snap.exists ){
                            return Effect.promise(() => ref.set(Firestore.HypeEvent.to(event), { merge: true }))
                        } else {
                            return Effect.fail(new NotFound({ id: event.id }))
                        }
                    })
                )
            },
            doQuery(query) {
                return pipe(
                    Effect.promise(() => query.toFirebase(db.collection("/events")).get()),
                    Effect.flatMap(ref => Effect.all(
                        ref.docs
                        .map(d => ({ ...d.data() as FirestoreHypeEvent, id: d.id }))
                        .map(d => Firestore.HypeEvent.from(d)))
                    ),
                    Effect.map(es => es.filter(Either.isRight).map(e => e.right))
                )
            },
        })
    }))

    static InMemoryWith = (data: HypeEvent[] = []) => Layer.effect(EventAdapter, Effect.gen(function*(_){
        const events = yield* _(ArrayRef.make(data, e => e.id))

        return EventAdapter.of({
            create(data) {
                const newEvent = {
                    ...data,
                    id: crypto.randomUUID(),
                    inventory: [],
                    invites: [],
                    productLimit: 0,
                    purchaseLimit: 0,
                    status: "ready",
                } as HypeEvent;

                return events.add(newEvent)
                    .pipe(Effect.zipRight(Effect.succeed(newEvent)));
            },
            delete(eventId) {
                return events.delete(eventId)
            },
            get(eventId) {
                return events.find(eventId);
            },
            update(event) {
                return events.delete(event.id).pipe(
                    Effect.zipRight(events.add(event))
                )
            },
            doQuery(query) {
                return pipe(
                    events.read(),
                    Effect.map(data => data.filter(query.toMemory()))
                )
            },
        })
    }))

    static InMemory = EventAdapter.InMemoryWith([
        {
            creator: '2eb32c64-34f6-4f96-b2ae-92cc342dc5db',
            id: '123456789',
            inventory: [
                {
                    limit: Option.some(2),
                    productId: "1",
                    stock: 100
                }
            ],
            invites: [
                "957474949965434",
            ],
            name: "Mock Event",
            productLimit: 50,
            start: new Date(),
            status: "ready",
        },
        {
            creator: '2eb32c64-34f6-4f96-b2ae-92cc342dc5db',
            id: '1234567890',
            inventory: [],
            invites: [
                "957474949965434",
            ],
            name: "Mock Event 2",
            productLimit: 100,
            start: new Date(),
            status: "ready",
        }
    ])
}