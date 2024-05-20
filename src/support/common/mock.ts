import { Product } from "../../models/product";
import { mkRandom, mkRandomFn } from "./rand";

const sizeCategories = ["male", "female", "unisex", "oversize", "child"] as const

const productTypes = ["jacket", "shirt", "accessory", "pants", "hoodie", "shoe"] as const

export const makeProductGen = (seed: number) => {
    const random = mkRandomFn(mkRandom(seed));

    const randomFromArray = <const T extends readonly string[]>(arr: T) => (): typeof arr[number] => arr[random(0, arr.length)];

    const getSize = randomFromArray(sizeCategories);
    const getType = randomFromArray(productTypes);
    let seqId = 0

    return {
        get(){
            seqId += 1;
            return {
                id: `${seqId}`,
                image: "https://assets.adidas.com/images/w_383,h_383,f_auto,q_auto,fl_lossy,c_fill,g_auto/e65f37d7194c43f3969a23e960710437_9366/buzo-liviano-con-medio-cierre.jpg",
                name: `Mock-${seqId}`,
                price: 10.50,
                sizes: ["S", "M", "L"],
                sizeCategory: getSize(),
                type: getType(),
                creator: '2eb32c64-34f6-4f96-b2ae-92cc342dc5db'
            } as Product
        }
    }
}

const defaultSeed = 123124315135457
export const makeNProducts = (n: number, seed: number = defaultSeed) => {
    const gen = makeProductGen(seed);
    const products = []
    for (let index = 0; index < n; index++) {
        products.push(gen.get());
    }
    return products
}