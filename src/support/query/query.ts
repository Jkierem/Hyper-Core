import { WhereFilterOp, CollectionReference, Query as FireQuery } from "firebase-admin/firestore"

function process(op: WhereFilterOp, a: any, b: any){
    switch(op){
        case "<":
            return a < b;
        case "<=":
            return a <= b;
        case "==":
            return a === b;
        case "!=":
            return a !== b;
        case ">=":
            return a >= b;
        case ">":
            return a > b;
        case "array-contains":
            return (a as any[]).includes(b);
        case "in":
        case "not-in":
        case "array-contains-any":
            return false;
    }
}

export class Query<A>{
    constructor(
        private filters: [keyof A & string, WhereFilterOp, unknown][]
    ){
    }

    static id<A>(){
        return new Query<A>([])
    }

    static where<A>(
        field: keyof A & string,
        operator: WhereFilterOp,
        value: unknown
    ){
        return new Query<A>([[field, operator, value]])
    }

    public where(
        field: keyof A & string,
        operator: WhereFilterOp,
        value: unknown
    ){
        return new Query([ ...this.filters, [field, operator, value]])
    }

    public and(
        field: keyof A & string,
        operator: WhereFilterOp,
        value: unknown
    ){
        return new Query([ ...this.filters, [field, operator, value]])
    }

    toFirebase(ref: CollectionReference): FireQuery {
        return this.filters.reduce((acc, [field, operator, value]) => {
            return acc.where(field, operator, value);
        }, ref as unknown as FireQuery)
    };

    toMemory(){
        return (data: A) => {
            return this.filters.every(([field, op, value]) => {
                return process(op, data[field], value);
            })
        }
    }
}