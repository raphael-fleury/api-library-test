import { Serializable } from "./types";

export class HttpResponse {
    statusCode: number
    body: Serializable

    constructor(status: number, body: Serializable) {
        this.statusCode = status
        this.body = body
    }

    status(code: number) {
        this.statusCode = code
        return this
    }

    send(body: Serializable) {
        this.body = body
        return this
    }
}