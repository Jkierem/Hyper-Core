import { Schema } from "@effect/schema";
import { Effect, Option } from "effect";
import { omit } from "effect/Struct";
import { Timestamp } from "firebase-admin/firestore"

export const EventItem = Schema.Struct({
    productId: Schema.String,
    stock: Schema.Number,
    limit: Schema.Number.pipe(Schema.Option),
})

export type EventItem = Schema.Schema.Type<typeof EventItem>;

export const EventStatus = Schema.Union(
    Schema.Literal("ready"),
    Schema.Literal("active"),
    Schema.Literal("finished"),
)

export type EventStatus = Schema.Schema.Type<typeof EventStatus>;

export const HypeEvent = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    invites: Schema.Array(Schema.String),
    inventory: Schema.Array(EventItem), 
    creator: Schema.String,
    start: Schema.Date,
    status: EventStatus,
    productLimit: Schema.Number,
    purchaseLimit: Schema.Number,
})

export type HypeEvent = Schema.Schema.Type<typeof HypeEvent>;

export const HypeEvents = Schema.Array(HypeEvent);

export type HypeEvents = Schema.Schema.Type<typeof HypeEvents>;

export const CreateEvent = Schema.Struct({
    name: Schema.String,
    creator: Schema.String,
    start: Schema.Date,
    productLimit: Schema.Number,
    purchaseLimit: Schema.Number,
})

export type CreateEvent = Schema.Schema.Type<typeof CreateEvent>;

export const decodeCreateEvent = Schema.decodeUnknown(CreateEvent);

const BaseTransition = Schema.Struct({
    userId: Schema.String,
    eventId: Schema.String,
})

export const StartEvent = BaseTransition.pipe(
    Schema.extend(Schema.Struct({
        transition: Schema.Literal("start")
    }))
)
export type StartEvent = Schema.Schema<typeof StartEvent>;

export const EndEvent = BaseTransition.pipe(
    Schema.extend(Schema.Struct({
        transition: Schema.Literal("end")
    }))
)
export type EndEvent = Schema.Schema<typeof EndEvent>;

export const EventTransition = Schema.Union(
    StartEvent,
    EndEvent
)

export type EventTransition = Schema.Schema.Type<typeof EventTransition>;

export const decodeEventTransition = Schema.decodeUnknown(EventTransition);

export const HypeEventPatch = HypeEvent.pipe(
    Schema.omit("id"),
    Schema.omit("creator"),
    Schema.omit("status"),
    Schema.partial()
)

export const decodeEventPatch = Schema.decodeUnknown(HypeEventPatch);

const FirestoreEventItem = Schema.Struct({
    productId: Schema.String,
    stock: Schema.Number,
    limit: Schema.Union(
        Schema.Number, 
        Schema.Null, 
        Schema.Undefined
    ),
})

type FirestoreEventItem = Schema.Schema.Type<typeof FirestoreEventItem>;

const FirestoreTimestamp = Schema.Struct({
    seconds: Schema.Number,
    nanoseconds: Schema.Number
})

export const FirestoreHypeEvent = Schema.Struct({
    inventory: Schema.Array(FirestoreEventItem),
    start: FirestoreTimestamp,
    name: Schema.String,
    invites: Schema.Array(Schema.String),
    creator: Schema.String,
    status: EventStatus,
    productLimit: Schema.Number,
})

export type FirestoreHypeEvent = Schema.Schema.Type<typeof FirestoreHypeEvent>;

export const Firestore = {
    EventItem: {
        to: (data: EventItem) => {
            return {
                ...data,
                limit: data.limit.pipe(Option.getOrNull)
            } as FirestoreEventItem
        },
        from: (data: FirestoreEventItem) => {
            const raw = {
                ...data,
                limit: Option.fromNullable(data.limit)
            }
            return Schema.encodeUnknown(EventItem)(raw);
        }
    },
    HypeEvent: {
        to: (data: HypeEvent) => {
            return {
                ...omit(data, "id"),
                inventory: data.inventory.map(Firestore.EventItem.to),
                start: Timestamp.fromDate(new Date(data.start))
            } as FirestoreHypeEvent
        },
        from: (data: FirestoreHypeEvent & { id: string }) => {
            return Effect.gen(function*(_){
                const inventory = yield* _(
                    data.inventory.map(Firestore.EventItem.from),
                    Effect.all
                )

                const raw = {
                    ...data,
                    inventory,
                    start: (data.start as Timestamp).toDate().toISOString(),
                }

                return yield* _(Schema.decodeUnknown(HypeEvent)(raw))
            }).pipe(Effect.either)
        }
    }
};

export const IncreaseStock = Schema.Struct({
    amount: Schema.Positive,
    productId: Schema.String
})

export type IncreaseStock = Schema.Schema.Type<typeof IncreaseStock>;