import { Schema } from "@effect/schema";

export const parseQuery = {
    string: (pq: unknown) => Schema.decodeUnknown(Schema.String)(pq)
} 