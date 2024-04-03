import { Callback, Route, ErrorHandler } from './types'
import { server } from './server'

export const routes: Route[] = []
export const errorHandlers: ErrorHandler[] = []

export function route(path: string, callback: Callback) {
    routes.push({ path, method: '*', callback })
}

export function get(path: string, callback: Callback) {
    routes.push({ path, method: 'GET', callback })
}

export function post(path: string, callback: Callback) {
    routes.push({ path, method: 'POST', callback })
}

export function put(path: string, callback: Callback) {
    routes.push({ path, method: 'PUT', callback })
}

export function patch(path: string, callback: Callback) {
    routes.push({ path, method: 'PATCH', callback })
}

export function del(path: string, callback: Callback) {
    routes.push({ path, method: 'DELETE', callback })
}

export function listen(port: number) {
    server.listen(port)
}

export function onError(handler: ErrorHandler) {
    errorHandlers.push(handler)
}