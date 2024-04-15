import { IncomingHttpHeaders, IncomingMessage } from "http"
import { Method } from "./types"

function extractQuery(url: string) {
    if (!url.includes('?'))
        return new URLSearchParams('')

    const query = url.split('/').pop()?.split('?').pop() || ""
    return new URLSearchParams(query)
}

function getContentType(req: IncomingMessage) {
    const header = req.headers
    if (!header["content-type"])
        return ''

    return header["content-type"].indexOf(";") === -1
        ? header["content-type"]
        : header["content-type"].substring(
            0, header["content-type"].indexOf(";")
        )
}

export class HttpRequest {
    readonly url: string
    readonly host: string
    readonly hostname: string
    readonly path: string
    readonly method: Method

    readonly query: URLSearchParams
    readonly headers: IncomingHttpHeaders
    readonly contentType: string
    params: Map<string, string> = new Map()

    private _bodyStr = ""
    private _body: string | null = null

    constructor(req: IncomingMessage, bodyStr: string) {
        this.query = extractQuery(req.url || "")
        this.headers = req.headers
        this.contentType = getContentType(req)
        this._bodyStr = bodyStr

        this.url = req.url || ""
        this.host = req.headers.host || ""
        this.hostname = this.host.split(':')[0]
        this.path = this.url.split('?')[0]
        this.method = (req.method || "") as Method
    }

    private parseBody() {
        if (this.contentType === "application/json") {
            this._body = this._bodyStr ? JSON.parse(this._bodyStr) : {}
        }
    }

    get body() {
        if (this._body === null) {
            this.parseBody()
        }
        return this._body
    }
}