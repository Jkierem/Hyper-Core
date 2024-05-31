import { Product } from "../../models/product";
import { mkRandom, mkRandomFn } from "./rand";

const sizeCategories = ["male", "female", "unisex", "oversize", "child"] as const

const productTypes = ["jacket", "shirt", "accessory", "pants", "hoodie", "shoe"] as const

const stockImages = [
    "https://assets.adidas.com/images/w_383,h_383,f_auto,q_auto,fl_lossy,c_fill,g_auto/e65f37d7194c43f3969a23e960710437_9366/buzo-liviano-con-medio-cierre.jpg",
    "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/d02cb0ef1bea42ee8eb57bd55ff1bc23_9366/Tenis_TMNT_Shell-Toe_Splinter_Gris_IH4767_01_standard.jpg",
    "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/9e408787fa3949748759004a79d513fb_9366/100T_JERSEY_Multi_IW4595_01_laydown.jpg",
    "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/29c4b36d80b1451b8deb0475e152fbca_9366/Gorro_COLD.RDY_Tech_Cuff_Morado_IR7913_01_standard.jpg",
    "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/2817991c7ef74c58aac023f946c9014c_9366/Pantalon_Mickey_x_Originals_Bordado_Negro_IY2267_01_laydown.jpg",
    "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/f10dacba6cca412d9382aeee00c35a33_9366/Chaqueta_con_Capucha_Terrex_MYSHELTER_Termica_Granate_HH9214_01_laydown.jpg",
    "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/710c11ad417f4caf9ca3af3b010b2220_9366/Morral_Essentials_Linear_Negro_HT4746_01_standard.jpg",
    "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/55bb3ab9342d4db09a3949f548d5796d_9366/TERREX_AX4_MID_GTX_W_Negro_HQ1049_HM1.jpg"
]

export const makeProductGen = (seed: number) => {
    const random = mkRandomFn(mkRandom(seed));

    const randomFromArray = <const T extends readonly string[]>(arr: T) => (): typeof arr[number] => arr[random(0, arr.length)];

    const getSize = randomFromArray(sizeCategories);
    const getType = randomFromArray(productTypes);
    const getImage = randomFromArray(stockImages);
    let seqId = 0

    return {
        get(){
            seqId += 1;
            return {
                id: `${seqId}`,
                image: getImage(),
                name: `Mock-${seqId}`,
                price: 10.50,
                sizes: ["S", "M", "L"],
                sizeCategory: getSize(),
                type: getType(),
                creator: '8h5s6XFczvCC2FFrxVtT'
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