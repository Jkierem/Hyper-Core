import { Context, Effect, Layer, Option } from "effect"
import { ArrayRef, NotFound } from "../support/effect/array-ref";
import { CreateEvent, HypeEvent } from "../models/event";

export declare namespace EventAdapter {
    type Shape = {
        get: (eventId: string) => Effect.Effect<HypeEvent, NotFound<string>>;
        getAll: () => Effect.Effect<HypeEvent[]>;
        update: (event: HypeEvent) => Effect.Effect<void, NotFound<string>>;
        create: (data: CreateEvent) => Effect.Effect<HypeEvent>;
        delete: (eventId: string) => Effect.Effect<void>;
    }
}

export class EventAdapter extends Context.Tag("EventAdapter")<
    EventAdapter,
    EventAdapter.Shape
>(){
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
            getAll() {
                return events.read()
            },
            update(event) {
                return events.delete(event.id).pipe(
                    Effect.zipRight(events.add(event))
                )
            },
        })
    }))

    static InMemory = EventAdapter.InMemoryWith([
        {
            creator: '2eb32c64-34f6-4f96-b2ae-92cc342dc5db',
            id: '1705d85c-4ed6-4e49-8aad-31ab21633819',
            inventory: [
                {
                    limit: Option.some(2),
                    productId: "e3aa05a3-df59-4375-a714-fb41fe531e74",
                    stock: 100
                }
            ],
            invites: [
                "843eab58-e81c-4242-bce1-da9a5a00d90f",
            ],
            name: "Mock Event",
            productLimit: 50,
            start: new Date(),
            status: "ready",
        }
    ])
}