import { Array, Data, Effect, Equal, Ref, pipe } from "effect"

export class NotFound<ID>
extends Data.TaggedError("NotFound")<{ id: ID }> {}

const make = <T, ID>(startingData: T[], getId: (data: T) => ID) => {
    return pipe(
        Ref.make(startingData),
        Effect.map(ref => ({
            find: (id: ID) => {
                return pipe(
                    Ref.get(ref),
                    Effect.flatMap(ps => {
                        return pipe(
                            ps,
                            Array.findFirst(p => Equal.equals(getId(p), id))
                        )
                    }),
                    Effect.mapError(() => new NotFound({ id }))
                )
            },
            read: () => Ref.get(ref),
            add: (elem: T) => {
                return ref.pipe(Ref.update(e => [...e, elem]))
            },
            delete: (id: string) => {
                return ref.pipe(Ref.update(ps => ps.filter(p => !Equal.equals(getId(p), id))))
            }
        }))
    )
}

export const ArrayRef = { make };