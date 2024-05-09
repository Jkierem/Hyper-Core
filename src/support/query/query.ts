function process(op: FirebaseFirestore.WhereFilterOp, a: any, b: any){
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
        private filters: [keyof A & string, FirebaseFirestore.WhereFilterOp, unknown][]
    ){
    }

    static id<A>(){
        return new Query<A>([])
    }

    static where<A>(
        field: keyof A & string,
        operator: FirebaseFirestore.WhereFilterOp,
        value: unknown
    ){
        return new Query<A>([[field, operator, value]])
    }

    public where(
        field: keyof A & string,
        operator: FirebaseFirestore.WhereFilterOp,
        value: unknown
    ){
        return new Query([ ...this.filters, [field, operator, value]])
    }

    public and(
        field: keyof A & string,
        operator: FirebaseFirestore.WhereFilterOp,
        value: unknown
    ){
        return new Query([ ...this.filters, [field, operator, value]])
    }

    toFirebase(ref: FirebaseFirestore.CollectionReference): FirebaseFirestore.Query {
        return this.filters.reduce((acc, [field, operator, value]) => {
            return acc.where(field, operator, value);
        }, ref as unknown as FirebaseFirestore.Query)
    };

    toMemory(){
        return (data: A) => {
            return this.filters.every(([field, op, value]) => {
                return process(op, data[field], value);
            })
        }
    }
}