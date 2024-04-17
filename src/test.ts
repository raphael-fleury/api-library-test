import { createServer } from "."

createServer()
    .get('/', (req, res) => res.send('Hello World'))
    .listen(8080)