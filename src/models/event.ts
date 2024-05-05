import { Schema } from "@effect/schema";

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
    creator: Schema.UUID,
    start: Schema.Date,
    status: EventStatus,
    productLimit: Schema.Number,
})

export type HypeEvent = Schema.Schema.Type<typeof HypeEvent>;

export const CreateEvent = HypeEvent.pipe(
    Schema.omit("id"),
    Schema.omit("inventory"),
    Schema.omit("invites"),
    Schema.omit("status"),
    Schema.omit("productLimit"),
);

export type CreateEvent = Schema.Schema.Type<typeof CreateEvent>;

export const decodeCreateEvent = Schema.decodeUnknown(CreateEvent);

const BaseTransition = Schema.Struct({
    userId: Schema.UUID,
    eventId: Schema.UUID,
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