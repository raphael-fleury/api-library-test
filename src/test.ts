import { get, listen } from "."

get('/', (req, res) => res.send('Hello World'))
listen(8080)