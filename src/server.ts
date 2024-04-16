import { IncomingMessage, createServer } from 'http'
import { routes, errorHandlers } from './'
import { ErrorHandler, Method } from './types'
import { HttpRequest } from './request'
import { HttpResponse } from './response'

function routesMatching(url: string | undefined, path: string) {
    if (path === "*") return true
    if (!url) return false

    const urlSplit = url.split('/')
    const pathSplit = path.split('/')

    for (const index in urlSplit) {
        const pathWithoutQuery = urlSplit[index].split('?')[0]
        if (pathSplit[index] === undefined)
            return false
        if (pathSplit[index] === '*')
            continue
        if (pathSplit[index][0] === ':')
            continue
        if (pathSplit[index] !== pathWithoutQuery)
            return false
    }

    return true
}

function methodsMatching(urlMethod: string | undefined, routeMethod: Method) {
    if (routeMethod === "*") return true
    if (!urlMethod) return false
    return urlMethod === routeMethod
}

function extractParams(url: string, path: string) {
    const urlSplit = url.split('/')
    const pathSplit = path.split('/')
   
    const params = new Map<string, string>()
    for (const index in urlSplit) {
        if (pathSplit[index] === undefined)
            break
        if (pathSplit[index][0] !== ':')
            continue
        
        const key = pathSplit[index].substring(1)
        const pathWithoutQuery = urlSplit[index].split('?')[0]
        params.set(key, pathWithoutQuery)
    }

    return params
}

const defaultErrorHandler: ErrorHandler = (error, req, res, next) => {
    if (error instanceof Error) {
        console.error(error)
        res.status(500).send({
            name: error.name,
            message: error.message,
            stack: error.stack
        })
    }
    next()
}

function handleRequest(req: IncomingMessage, bodyStr: string) {
    const request = new HttpRequest(req, bodyStr)
    const response = new HttpResponse(200, '')

    try {
        let matches = 0
        for (const { path, method, callback } of routes) {
            if (!routesMatching(req.url, path) || !methodsMatching(req.method, method))
                continue
    
            matches++
            request.params = extractParams(req.url || "", path)
        
            let stop = true
            const next = () => { stop = false }
            
            const cb = callback(request, response, next)
            if (cb !== undefined)
                response.body = cb
            if (stop)
                break
        }

        if (matches < 1) {
            response.statusCode = 404
            response.body = {message: "Not found"}
        }
    }
    catch (error) {
        let stop = true
        const next = () => { stop = false }

        response.statusCode = 500
        for (const handler of [...errorHandlers, defaultErrorHandler]) {
            const cb = handler(error, request, response, next)
            if (cb !== undefined)
                response.body = cb
            if (stop)
                break
        }
    }

    return response
}

export const server = createServer((req, res) => {
    let response = new HttpResponse(200, '')

    let bodyStr = ''
    req.on('data', (chunk) => {
        bodyStr += chunk.toString()
    })
    .on('error', (error) => {
        console.error(error)
        response.send(500).send({message: "Unknown error"})
    })
    .on('end', () => {
        response = handleRequest(req, bodyStr)
        res.statusCode = response.statusCode
        if (typeof response.body === "object" || Array.isArray(response.body)) {
            if (response.body instanceof HttpRequest)
                response.body = response.body.toObject()

            res.setHeader('Content-Type', 'application/json')
            res.write(JSON.stringify(response.body))
        }
        else {
            res.setHeader('Content-Type', 'text/plain')
            res.write(response.body.toString())
        }
        res.end()
    })
})