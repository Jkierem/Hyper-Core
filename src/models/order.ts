import { Schema } from "@effect/schema";

export const Cart = Schema.Array(Schema.Struct({
    productId: Schema.UUID,
    amount: Schema.Positive.pipe(Schema.compose(Schema.Int)),
}))

export const Order = Schema.Struct({
    eventId: Schema.UUID,
    inviteId: Schema.UUID,
    cart: Cart
})

export type Order = Schema.Schema.Type<typeof Order>;

export const decodeOrder = Schema.decodeUnknown(Order);