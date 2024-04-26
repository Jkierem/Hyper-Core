import { Express, pipe } from "./support/effect/express"

const program = pipe(
    Express.makeApp(),
    Express.get("/hello", Express.gen(function*(_){
        const { response } = yield* _(Express.RouteContext("/hello"));

        response.send("Hello World!");
    })),
    Express.listen(3000, () => console.log("Listening on port 3000..."))
)

Express.run(program);