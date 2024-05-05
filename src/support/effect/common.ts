import { ParseError } from "@effect/schema/ParseResult";
import { Brand, Data } from "effect";

type StatusCode<num extends number> = num & Brand.Brand<"StatusCode">;
export const StatusCode = <N extends number>(n: N) => Brand.refined<StatusCode<N>>(
    (n) => n >= 100 && n <=599 && Number.isInteger(n),
    e => Brand.error(`Expected ${e} to be an integer between 100 and 599`)
)(n as Brand.Brand.Unbranded<StatusCode<N>>)

export function HttpError<
    const T extends string,
    const Code extends StatusCode<number>
>(tag: T, status: Code){
    return class Base<Data = unknown> 
    extends Data.TaggedError(tag)<{ error: Data }> {
        get code(): Code { return status }
    }
}

export function TaggedHttpError<
    const T extends string,
    const Code extends StatusCode<number>
>(tag: T, status: Code, error?: string){
    return class Base
    extends Data.TaggedError(tag) {
        get code(): Code { return status }
        get error() { return error || this as unknown }
    }
}

export class CreateError 
extends HttpError("CreateError", StatusCode(400))<ParseError> {
    static fromParseError(error: ParseError){
        return new CreateError({ error })
    }
}
