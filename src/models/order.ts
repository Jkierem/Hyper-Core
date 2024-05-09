import { Schema } from "@effect/schema";

export const Cart = Schema.Array(Schema.Struct({
    productId: Schema.String,
    amount: Schema.Positive.pipe(Schema.compose(Schema.Int)),
}))

export const Order = Schema.Struct({
    eventId: Schema.String,
    inviteId: Schema.String,
    cart: Cart
})

export type Order = Schema.Schema.Type<typeof Order>;

export const decodeOrder = Schema.decodeUnknown(Order);