import { Schema } from "@effect/schema";

export const User = Schema.Struct({
    name: Schema.String,
    id: Schema.String,
    group: Schema.String
})

export type User = Schema.Schema.Type<typeof User>;