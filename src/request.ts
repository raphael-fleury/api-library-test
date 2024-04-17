import { IncomingHttpHeaders, IncomingMessage } from "http"
import { Method, Serializable } from "./types"

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

export abstract class GenericRequest<TBody> {
    readonly url: string
    readonly host: string
    readonly hostname: string
    readonly path: string
    readonly method: Method

    readonly query: URLSearchParams
    readonly headers: IncomingHttpHeaders
    readonly contentType: string
    params: Map<string, string> = new Map()

    constructor(req: IncomingMessage) {
        this.query = extractQuery(req.url || "")
        this.headers = req.headers
        this.contentType = getContentType(req)

        this.url = req.url || ""
        this.host = req.headers.host || ""
        this.hostname = this.host.split(':')[0]
        this.path = this.url.split('?')[0]
        this.method = (req.method || "") as Method
    }

    abstract get body(): TBody
}

export class HttpRequest extends GenericRequest<Serializable> {
    private _bodyStr: string
    private _body: Serializable | undefined

    constructor(req: IncomingMessage, bodyStr: string) {
        super(req)
        this._bodyStr = bodyStr
    }

    private parseBody() {
        if (this.contentType === "text/plain")
            this._body = this._bodyStr
        if (this.contentType === "application/json")
            this._body = this._bodyStr ? JSON.parse(this._bodyStr) : {}
    }

    get body() {
        if (this._body === undefined) {
            this.parseBody()
        }
        return this._body as Serializable
    }

    toObject(): GenericRequest<Serializable> {
        return {
            ...this,
            body: this.body,
            toObject: undefined,
            _bodyStr: undefined, _body: undefined
        }
    }
}