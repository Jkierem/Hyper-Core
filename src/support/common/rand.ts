const _m = 743432380
const _a = 876441
const _c = 213457
const step = (x: number) => (_a * x + _c) % _m;

export const randomSeed = () => Math.floor(9999999 * Math.random());

export function* mkRandom(seed: number): Generator<number, void>{
    const x = step(seed)
    yield x
    yield* mkRandom(x);
}

export const mkRandomFn = 
    (randomGen: Generator<number, void, never>) => 
    (min: number, max: number) => {
        const { value, done } = randomGen.next();
        if( !done ){
            return Math.floor(value % max) + min; 
        }
        throw new Error("No more numbers");
    }