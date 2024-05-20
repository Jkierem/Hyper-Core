import { Effect, Express, pipe } from "../../support/effect/express";
import { parseQuery } from "../../support/express/query-params";
import { EventService } from "./event.service";

const getEventConsumer = Express.gen(function*(_){
    const { response, request } = yield* _(Express.RouteContext("/consumer/:consumerId/:eventId"));
    const service = yield* _(EventService);
    const {
        consumerId,
        eventId,
    } = request.params
    yield* _(
        service.getEventForConsumer(consumerId, eventId),
        Effect.map(event => {
            response.status(200)
            response.json(event)
        }),
        Effect.catchAll((e) => {
            response.status(e.code);
            response.json(e.error);
            return Effect.void;
        })
    )
})

const getEventsByCreator = Express.gen(function*(_){
    const { response, request } = yield* _(Express.RouteContext("/?creator"));
    const creatorId = request.query.creator;
    const service = yield* _(EventService);

    yield* _(
        parseQuery.string(creatorId),
        Effect.flatMap(id => service.getEvents(id)),
        Effect.map((events) => {
            response.status(200)
            response.json(events)
        }),
        Effect.catchTag("ParseError", (e) => {
            response.status(400);
            response.json({ 
                message: "You must supply a creator as query param"
            });
            return Effect.void;
        })
    );
})

const postEvent = Express.gen(function*(_){
    const { response, request } = yield* _(Express.RouteContext("/:creator"));
    const service = yield* _(EventService);

    yield* _(
        service.createEvent(request.body),
        Effect.map((event) => {
            response.status(200);
            response.json(event);
        }),
        Effect.catchAll((e) => {
            response.status(e.code)
            response.json(e.error);
            return Effect.void;
        })
    )
})

const postTriggerEvent = Express.gen(function*(_){
    const { response, request } = yield* _(Express.RouteContext("/:eventId"));
    const service = yield* _(EventService);
    yield* _(
        service.receiveEventTrigger(request.body),
        Effect.map(updated => {
            response.status(200);
            response.json(updated)
        }),
        Effect.catchAll(e => {
            response.status(e.code);
            response.json(e.error);
            return Effect.void
        })
    )
})

const postOrder = Express.gen(function*(_){
    const { response, request } = yield* _(Express.RouteContext("/orders"));
    const service = yield* _(EventService);

    yield* _(
        service.receiveOrder(request.body),
        Effect.map(res => {
            response.status(200);
            response.json(res);
        }),
        Effect.catchAll(e => {
            response.status(e.code);
            response.json(e.error);
            return Effect.void;
        })
    )
})

const updateEvent = Express.gen(function*(_){
    const { response, request } = yield* _(Express.RouteContext("/:eventId"));
    const service = yield* _(EventService);

    yield* _(
        service.recieveEventPatch(request.params.eventId, request.body),
        Effect.map(event => {
            response.status(200);
            response.json(event);
        }),
        Effect.catchAll(e => {
            response.status(e.code);
            response.json(e.error);
            return Effect.void;
        })
    )
})

const getEventById = Express.gen(function*(_){
    const { response, request } = yield* _(Express.RouteContext("/:eventId"));
    const service = yield* _(EventService);
    const { eventId } = request.params
    yield* _(
        service.getEvent(eventId),
        Effect.map((events) => {
            response.status(200)
            response.json(events)
        }),
        Effect.catchAll(e => {
            response.status(e.code);
            response.json(e.error);
            return Effect.void;
        })
    );
})

const EventRouter = pipe(
    Express.makeRouter(),
    Express.get("/", getEventsByCreator),
    Express.post("/", postEvent),
    Express.post("/orders", postOrder),
    Express.get("/:eventId", getEventById),
    Express.patch("/:eventId", updateEvent),
    Express.post("/:eventId", postTriggerEvent),
    Express.get("/consumers/:consumerId/:eventId", getEventConsumer),
)

export const EventModule = Express.makeModule("/events", EventRouter);