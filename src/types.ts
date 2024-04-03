import { IncomingHttpHeaders } from 'http'

export const methods = [
    "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
    "HEAD", "CONNECT", "TRACE", "*"
] as const

export type Method = typeof methods[number]

export type HttpRequest = {
    params: Map<string, string>,
    query: URLSearchParams,
    body: any,
    headers: IncomingHttpHeaders
}

export type HttpResponse = {
    status: number,
    body: any
}

export type Callback = (
    request: HttpRequest,
    response: HttpResponse,
    next: () => void
) => void

export type ErrorHandler = (
    error: unknown,
    request: HttpRequest,
    response: HttpResponse,
    next: () => void
) => void

export type Route = {
    path: string,
    method: Method,
    callback: Callback
}
