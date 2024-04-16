import { HttpRequest } from './request'
import { HttpResponse } from './response'

export const methods = [
    "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
    "HEAD", "CONNECT", "TRACE", "*"
] as const

export type Method = typeof methods[number]

export type Serializable = number | string | boolean
    | null | Serializable[]
    | {[key: string | number]: Serializable | undefined}

export type Callback = (
    request: HttpRequest,
    response: HttpResponse,
    next: () => void
) => any

export type ErrorHandler = (
    error: unknown,
    request: HttpRequest,
    response: HttpResponse,
    next: () => void
) => any

export type Route = {
    path: string,
    method: Method,
    callback: Callback
}
