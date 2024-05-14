/* eslint-disable @typescript-eslint/no-explicit-any */
import { Context, Effect, Either, pipe } from 'effect'
import express from 'express'
import type * as E from 'express'

const Methods = [
    "checkout", "copy", "delete", "get", "head",
    "lock", "merge", "mkactivity", "mkcol", "move",
    "m-search", "notify", "options", "patch", "post",
    "purge", "put", "report", "search", "subscribe", 
    "trace", "unlock", "unsubscribe", "all"
] as const

export type Method = typeof Methods[number]

export type UnaryOperator = <
    A extends E.Express | E.Router, 
    E=never, 
    R=never
>(eff: Effect.Effect<A,E,R>) => Effect.Effect<A,E,R>

export type BinaryOperator<
    E0=never, 
    R0=never
> = <
    A extends E.Express | E.Router, 
    E=never,
    R=never
>(eff: Effect.Effect<A,E,R>) => Effect.Effect<A, E | E0, R | R0>

export type ExpressEffect<E=never, R=never> = Effect.Effect<E.Express, E, R>

export type EffectRequestHandler<
    Path extends string,
    E=never,
    R=never
> = Effect.Effect<Either.Either<void, E>, never, R | HandlerContext<Path>>

export type ExitHandler<
    Path extends string, 
    E=never
> = (result: Either.Either<void, E>, handlerContext: HandlerContext<Path>) => void

export type RouterEffect<E=never,R=never> = Effect.Effect<E.Router,E,R>

/**
 * Creates an effect that creates an express app
 */
const makeApp = (): ExpressEffect => Effect.sync(() => express())

/**
 * Creates an effect that creates an express router
 */
const makeRouter = (options?: express.RouterOptions) => Effect.sync(() => express.Router(options))

const map = Effect.map

const flatMap = Effect.flatMap

type Scoped<A,E=never,R=never> = [path: string, effect: Effect.Effect<A | A[],E,R>]
type Unscoped<A,E=never,R=never> = [effect: Effect.Effect<A | A[],E,R>]
type EffectParams<A extends E.RequestHandler<any>,E=never,R=never> = Scoped<A,E,R> | Unscoped<A,E,R>
const isScoped = <
    A extends E.RequestHandler<any>,
    E=never,
    R=never
>(params: EffectParams<A,E,R>): params is Scoped<A,E,R> => params.length === 2

/**
 * Binds an effect to a request in a given path. Effectful version of use
 */
function bindEffect<
    T extends E.RequestHandler<any>,
    E=never,
    R=never
>(path: string, eff: Effect.Effect<T,E,R>): BinaryOperator<E,R>
/**
 * Binds an effect to all requests. Effectful version of use
 */
function bindEffect<T extends E.RequestHandler<any>,E=never,R=never>(eff: Effect.Effect<T,E,R>): BinaryOperator<E,R>
function bindEffect<T extends E.RequestHandler<any>,E=never,R=never>(...args: EffectParams<T,E,R>){
    let effect: Effect.Effect<T | T[],E,R>;
    let path: string | undefined;
    if( isScoped(args) ){
        path = args[0]
        effect = args[1]
    } else {
        effect = args[0]
    }
    return flatMap((app: E.Express) => {
        return effect.pipe(map((rawHandlers) => {
            const handlers = Array.isArray(rawHandlers) ? rawHandlers : [rawHandlers]
            return path === undefined 
                ? app.use(...handlers) 
                : app.use(path, ...handlers)
        }))
    })
}

/**
 * Binds an effect router to a request in a given path
 * 
 * @alias useEffect
 */
function useRouter<E=never,R=never>(path: string, effect: Effect.Effect<E.Router,E,R>): BinaryOperator<E,R> {
    return bindEffect(path, effect);
}

export type Module<Path extends string, E, R> = {
    path: Path,
    router: RouterEffect<E, R>
} 

function makeModule<
    const Path extends string, 
    E, 
    R
>(path: Path, router: RouterEffect<E,R>): Module<Path,E,R>{ 
    return {
        path,
        router
    }
}

const useModule = <Path extends string, E, R>(module: Module<Path, E, R>) => {
    return bindEffect(module.path, module.router)
}

/**
 * Takes an effect that resolves in an express app, and returns an effect that calls listen on it.
 */
const listen = (port: number, cb: () => void) => map((app: E.Express) => app.listen(port, cb))

type MethodHandler = (path: string, ...handlers: E.RequestHandler[]) => UnaryOperator

const makeClassicMethod = (method: Lowercase<Method>): MethodHandler => (
    path: string, 
    ...handlers:  E.RequestHandler[]
): UnaryOperator => map((app) => (app as any)[method](path, ...handlers))

function classicUse<T>(path: string, ...handlers: E.RequestHandler<T>[]): UnaryOperator
function classicUse<T>(...handlers: E.RequestHandler<T>[]): UnaryOperator
function classicUse(...handlers: any[]){
    return map((app: E.Express) => app.use(...handlers))
}

const classic = Methods.reduce((rec, next) => {
    return {
        ...rec,
        [next]: makeClassicMethod(next)
    }
},{
    use: classicUse
} as Record<Lowercase<Method>, MethodHandler> & { use: typeof classicUse })

type ParamKeys<T> = T extends `${string}:${infer R}`
    ? R extends `${infer P}/${infer L}`
        ? P | ParamKeys<L>
        : R
    : never

type ParamRecord<T extends string> = Record<ParamKeys<T>, string>

export type PathBoundRequest<Path extends string> = E.Request<ParamRecord<Path>>

const effect = <const Path extends string,E,R>(
    method: Lowercase<Method>, 
    path: Path, 
    effect: Effect.Effect<E.RequestHandler<ParamRecord<Path>>,E,R>
) => <A extends E.Router | E.Express,E,R>(self: Effect.Effect<A,E,R>) => {
    return pipe(
        Effect.Do,
        Effect.bind('app', () => self),
        Effect.bind('handler', () => effect),
        Effect.map(({ app, handler }) => (app as any)[method](path, handler))
    )
}

export interface HandlerContext<
    Path extends string = '/', 
    ResBody = any, 
    ReqBody = any,
> {
    response: E.Response<ResBody>
    request: E.Request<ParamRecord<Path>, ResBody, ReqBody>
    next: E.NextFunction
}

const HandlerContext = Context.GenericTag<HandlerContext>("@@express/HandlerContext");

export interface DefaultContext extends HandlerContext {}

const DefaultContext = HandlerContext as Context.Tag<DefaultContext, DefaultContext>;

const RouteContext = (
    () => HandlerContext
) as <const T extends string>(path: T) => Context.Tag<HandlerContext<T>, HandlerContext<T>>

const defaultExitHandler = <E>(result: Either.Either<void, E>, handlerContext: HandlerContext) => {
    return result.pipe(Either.mapLeft(e => handlerContext.next(e)))
}

/**
 * Binds an Effect to a method and path, providing the handler context.
 * @param method HTTP method to be bound to
 * @param path the path of the request
 * @param effect Effect to be executed
 * @param onExit callback to recover from errors. It will receive the result of the effect (as a either)
 * and the handler context.
 */
const withContext = <const Path extends string,E,R>(
    method: Lowercase<Method>,
    path: Path,
    effect: EffectRequestHandler<Path, E, R>,
    onExit: ExitHandler<Path, E> = defaultExitHandler
) => <A extends E.Express | E.Router, E0, R0>(self: Effect.Effect<A, E0, R0>) => {
    return Effect.gen(function* (_){
        const ctx = yield* _(Effect.context<R>());
        const app = yield* _(self);

        (app as any)[method](path, (request: E.Request, response: E.Response, next: E.NextFunction) => {
            const handlerCtx = HandlerContext.of({ request, response, next }) as HandlerContext<Path>
            return effect
                .pipe(Effect.provideService(HandlerContext, handlerCtx))
                .pipe(Effect.provide(ctx))
                .pipe(Effect.tap(result => Effect.sync(() => onExit(result, handlerCtx))))
                .pipe(Effect.runPromise)
        })

        return app
    })
}

type ScopedUse<Path extends string,E,R> = [
    path: Path, 
    effect: EffectRequestHandler<Path,E,R>, 
    onExit?: ExitHandler<Path,E>
]
type UnscopedUse<E,R> = [effect: EffectRequestHandler<'/',E,R>, onExit?: ExitHandler<'/',E>]
type UseParams<Path extends string,E,R> = ScopedUse<Path,E,R> | UnscopedUse<E,R>
const isScopedUse = <Path extends string,E,R>(params: UseParams<Path,E,R>): params is ScopedUse<Path,E,R> => typeof params[0] === 'string'

function use<E, R>(
    handler: EffectRequestHandler<'/',E,R>,
    onExit?: ExitHandler<'/',E>
): <
    A extends E.Express | E.Router,
    E0,
    R0
>(self: Effect.Effect<A, E0, R0>) => Effect.Effect<A, E0, Exclude<R | R0, HandlerContext | DefaultContext>>
function use<const Path extends string, E, R>(
    path: Path, 
    handler: EffectRequestHandler<Path, E, R>, 
    onExit?: ExitHandler<Path, E>
): <
    A extends E.Express | E.Router,
    E0,
    R0
>(self: Effect.Effect<A, E0, R0>) => Effect.Effect<A, E0, Exclude<R | R0, HandlerContext<Path> | DefaultContext>>
function use<const Path extends string, E, R>(...args: UseParams<Path,E,R>) {
    let effect: EffectRequestHandler<Path,E,R>;
    let onExit: ExitHandler<Path,E>;
    let path: Path | undefined;
    if( isScopedUse(args) ){
        path = args[0]
        effect = args[1]
        onExit = args[2] ?? defaultExitHandler
    } else {
        effect = args[0] as EffectRequestHandler<Path,E,R>;
        onExit = args[1] ?? defaultExitHandler
    }
    return (<A extends express.Express | express.Router,E0,R0>(self: Effect.Effect<A,E0,R0>) => {
        return Effect.gen(function*(_){
            const ctx = yield* _(Effect.context<R>());
            const app = yield* _(self);

            const handler = (
                request: E.Request, 
                response: E.Response, 
                next: E.NextFunction
            ) => {
                const handlerCtx = HandlerContext.of({ request, response, next }) as HandlerContext<Path>
                return effect
                    .pipe(Effect.provideService(HandlerContext, handlerCtx))
                    .pipe(Effect.provide(ctx))
                    .pipe(Effect.tap(result => Effect.sync(() => onExit(result, handlerCtx))))
                    .pipe(Effect.runPromise)
            }

            return path === undefined 
                ? app.use(handler) 
                : (app as E.Express).use(path, handler);
        })
    }) as UnaryOperator
}

export type EffectMethodHandler = <
    const Path extends string, E, R
>(
    path: Path, 
    effect: EffectRequestHandler<Path, E, R>, 
    onExit?: ExitHandler<Path, E>
) => <
    A extends E.Express | E.Router, 
    E0, 
    R0
>(self: Effect.Effect<A, E0, R0>) => Effect.Effect<A, E0, Exclude<R | R0, HandlerContext<Path>>>

const makeMethod = (method: Method) => <
    const Path extends string,
    E,
    R
>(
    path: Path,
    effect: EffectRequestHandler<Path,E,R>,
    onExit: ExitHandler<Path,E> = defaultExitHandler
) => withContext(method, path, effect, onExit)

const effectMethodHandlers = Methods.reduce((acc, next) => {
    return {
        ...acc,
        [next]: makeMethod(next)
    }
},{} as Record<Method, EffectMethodHandler>)

/**
 * Similar to Effect.gen but moves the error to the success channel via Effect.either
 */
const gen = <
    Eff extends Effect.Effect<any, any, any>,
    AEff 
>(f: (resume: Effect.Adapter) => Generator<Eff, AEff, any>) => pipe(
    Effect.gen(f),
    Effect.either
)

const ExpressModule = {
    classic,
    ...effectMethodHandlers,

    use,
    bindEffect,
    withContext,
    effect,
    useRouter,

    makeModule,
    useModule,

    gen,
    listen,
    makeApp,
    makeRouter,
    provide: Effect.provide,
    run: Effect.runPromise,

    HandlerContext,
    RouteContext,
    DefaultContext,

    defaultExitHandler,
    express,
}

export { ExpressModule as Express }
export { Layer, Effect, Either, Option } from 'effect';
export { pipe }