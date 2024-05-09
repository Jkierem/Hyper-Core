import { onRequest } from "firebase-functions/v2/https";
import { main } from "../../src/firebase";

export const app = onRequest(main);