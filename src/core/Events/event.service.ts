import { Array, Context, Data, Effect, Layer, Option, pipe } from "effect"
import { CreateError, HttpError, StatusCode, TaggedHttpError } from "../../support/effect/common";
import { EventAdapter } from "../../adapters/event.adapter";
import { HypeEvent, IncreaseStock, decodeCreateEvent, decodeEventPatch } from "../../models/event";
import { NotFound } from "../../support/effect/array-ref";
import { decodeEventTransition } from "../../models/event";
import { NoSuchElementException } from "effect/Cause";
import { decodeOrder } from "../../models/order";
import { and } from "effect/Boolean";
import { Query } from "../../support/query/query";
import { head } from "effect/Array";
import { Schema } from "@effect/schema";

class InvalidEventState 
extends TaggedHttpError("InvalidEventState", StatusCode(400)){}

class EmptyEvent
extends TaggedHttpError("EmptyEvent", StatusCode(400)){}

class NotAllowed
extends TaggedHttpError("NotAllowed", StatusCode(403)){}

class BadRequest
extends HttpError("BadRequest", StatusCode(400)){}

class HttpNotFound
extends HttpError("HttpNotFound", StatusCode(404)) {
    static fromInternal(e: NotFound<string>){
        return new HttpNotFound({ error: "Not Found" });
    }

    static fromNoSuchElement(e: NoSuchElementException){
        return new HttpNotFound({ error: "Not Found"})
    }
}

class OrderSubmit extends Data.TaggedClass("OrderSubmit") {}
class OrderFailed extends Data.TaggedClass("OrderFailed") {}
type OrderResult = OrderSubmit | OrderFailed

export declare namespace EventService {
    type Shape = {
        getEvent: (id: string) => Effect.Effect<HypeEvent, HttpNotFound>;
        getEvents: (creator: string) => Effect.Effect<HypeEvent[]>;
        getEventForConsumer: (consumer: string, eventId: string) => Effect.Effect<HypeEvent, HttpNotFound>;
        createEvent: (data: unknown) => Effect.Effect<HypeEvent, CreateError>;
        updateEvent: (event: HypeEvent) => Effect.Effect<void, HttpNotFound | NotAllowed>;
        startEvent: (eventId: string) => Effect.Effect<HypeEvent, HttpNotFound | InvalidEventState | EmptyEvent | NotAllowed>;
        endEvent: (eventId: string) => Effect.Effect<HypeEvent, HttpNotFound | InvalidEventState | NotAllowed>;
        receiveEventTrigger: (eventTrigger: unknown) => Effect.Effect<
            HypeEvent,
            HttpNotFound | InvalidEventState | EmptyEvent | NotAllowed | BadRequest
        >;
        receiveOrder: (order: unknown) => Effect.Effect<
            OrderResult,
            HttpNotFound | NotAllowed | BadRequest
        >;
        recieveEventPatch: (eventId: string, changes: unknown) => Effect.Effect<
            HypeEvent,
            HttpNotFound | NotAllowed | BadRequest
        >
        increaseStock: (eventId: string, data: unknown) => Effect.Effect<
            void,
            HttpNotFound | NotAllowed | BadRequest
        >
    }
}

export class EventService extends Context.Tag("EventService")<
    EventService,
    EventService.Shape
>(){
    static Live = Layer.effect(EventService, Effect.gen(function*(_){
        const adapter = yield* _(EventAdapter);

        return EventService.of({
            getEvent(id) {
                return adapter.get(id).pipe(
                    Effect.mapError(HttpNotFound.fromInternal)
                )
            },
            getEventForConsumer(consumer, eventId) {
                return pipe(
                    adapter.doQuery(
                        Query.id<HypeEvent>()
                        .where("id","==", eventId)
                        .and("invites", "array-contains", consumer)
                    ),
                    Effect.flatMap(head),
                    Effect.mapError(HttpNotFound.fromNoSuchElement)
                )
            },
            getEvents(creator: string){
                return adapter.doQuery(Query.where("creator", "==", creator))
            },
            createEvent(data: unknown){
                return pipe(
                    decodeCreateEvent(data),
                    Effect.flatMap(product => adapter.create(product)),
                    Effect.mapError(CreateError.fromParseError)
                )
            },
            updateEvent(event: HypeEvent){
                return Effect.gen(function*(_){
                    const prev = yield* _(adapter.get(event.id))
                    if( prev.creator === event.creator ){
                        return yield* _(adapter.update(event));
                    } else {
                        throw yield* new NotAllowed()
                    }
                }).pipe(Effect.catchTag("NotFound", (e) => {
                    return Effect.fail(HttpNotFound.fromInternal(e));
                }))
            },
            startEvent(eventId: string){
                return Effect.gen(this, function*(_){
                    const original = yield* _(adapter.get(eventId));
                    if( original.status === "ready" ){
                        if( original.inventory.length > 0 ){
                            const updated = {
                                ...original,
                                status: "active"
                            } as typeof original
                            yield* _(this.updateEvent(updated));
                            return updated;
                        } else {
                            throw yield* new EmptyEvent()
                        }
                    } else {
                        throw yield* new InvalidEventState();
                    }
                }).pipe(Effect.catchTag("NotFound", (e) => {
                    return Effect.fail(HttpNotFound.fromInternal(e));
                }))
            },
            endEvent(eventId: string){
                return Effect.gen(this, function*(_){
                    const original = yield* _(adapter.get(eventId));
                    if( original.status === "active" ){
                        const updated = {
                            ...original,
                            status: "finished"
                        } as typeof original
                        yield* _(this.updateEvent(updated));
                        return updated;
                    } else {
                        throw yield* new InvalidEventState();
                    }
                }).pipe(Effect.catchTag("NotFound", (e) => {
                    return Effect.fail(HttpNotFound.fromInternal(e));
                }))
            },
            receiveEventTrigger(trigger: unknown){
                return pipe(
                    decodeEventTransition(trigger),
                    Effect.mapError(error => new BadRequest({ error })),
                    Effect.flatMap(({ transition, eventId, userId }) => {
                        switch( transition ){
                            case "start":
                                return this.startEvent(eventId)
                            case "end":
                                return this.endEvent(eventId)
                        }
                    }),
                )
            },
            receiveOrder(order: unknown) {
                return pipe(
                    decodeOrder(order),
                    Effect.mapError(error => new BadRequest({ error })),
                    Effect.bind("event", ({ eventId, inviteId }) => this.getEventForConsumer(inviteId, eventId)),
                    Effect.flatMap(({ cart, event }) => {
                        if( event.status !== "active" ){
                            return Effect.fail(new NotAllowed())
                        }

                        const itemProducts = cart.map(item => [
                            item,
                            Option.fromNullable(
                                event.inventory.find(p => p.productId === item.productId)
                            )
                        ] as const)

                        const validCart = itemProducts.every(([item, product]) => pipe(
                                product,
                                Option.map(product => {
                                    return pipe(
                                        product.limit,
                                        Option.map(limit => limit >= item.amount),
                                        Option.getOrElse(() => true),
                                        and(product.stock >= item.amount)
                                    )
                                }),
                                Option.getOrElse(() => false)
                            )
                        )

                        const quantity = cart.reduce((acc, { amount }) => acc + amount, 0);

                        if( validCart && quantity <= event.productLimit ){
                            const inventory = event.inventory.map(item => {
                                return pipe(
                                    cart,
                                    Array.findFirst(c => c.productId === item.productId),
                                    Option.map(({ amount }) => ({
                                        ...item,
                                        stock: item.stock - amount 
                                    } as const)),
                                    Option.getOrElse(() => item)
                                )
                            })
                            return this.updateEvent({ ...event, inventory }).pipe(
                                Effect.map(() => new OrderSubmit() as OrderResult)
                            );
                        } else {
                            return Effect.succeed(new OrderFailed() as OrderResult);
                        }
                    })
                )
            },
            recieveEventPatch(eventId: string, changes: unknown) {
                return pipe(
                    decodeEventPatch(changes),
                    Effect.mapError(error => new BadRequest({ error })),
                    Effect.bindTo("changes"),
                    Effect.bind("previous", () => pipe(
                        adapter.get(eventId),
                        Effect.mapError(HttpNotFound.fromInternal)
                    )),
                    Effect.map(({ changes, previous }) => {
                        return {
                            ...previous,
                            ...changes
                        }
                    }),
                    Effect.tap(updated => this.updateEvent(updated))
                )
            },
            increaseStock(eventId, data: unknown) {
                return pipe(
                    Schema.decodeUnknown(IncreaseStock)(data),
                    Effect.mapError(error => new BadRequest({ error })),
                    Effect.bindTo("changes"),
                    Effect.bind("previous", () => pipe(
                        adapter.get(eventId),
                        Effect.mapError(HttpNotFound.fromInternal)
                    )),
                    Effect.map(({ changes, previous }) => {
                        const updated = {
                            ...previous,
                            inventory: previous.inventory.map(item => {
                                if( item.productId === changes.productId ){
                                    return { ...item, stock: item.stock + changes.amount };
                                } else {
                                    return item
                                }
                            })
                        }
                        return updated
                    }),
                    Effect.tap(updated => this.updateEvent(updated))
                )
            },
        })
    }))
}