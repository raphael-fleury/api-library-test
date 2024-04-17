import { Server, createServer } from 'http'
import { Callback, ErrorHandler, Method, RequestHandler, Route } from './types'
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

export class HttpServer {
    private server: Server
    private routes: Route[] = []
    private errorHandlers: ErrorHandler[] = []
    
    constructor() {
        this.server = this.createHttpServer()
    }

    route(path: string, method: Method, callback: Callback) {
        this.routes.push({ path, method, callback })
        return this
    }
    
    all(path: string, callback: Callback) {
        this.route(path, '*', callback)
        return this
    }
    
    get(path: string, callback: Callback) {
        this.route(path, 'GET', callback)
        return this
    }
    
    post(path: string, callback: Callback) {
        this.route(path, 'POST', callback)
        return this
    }
    
    put(path: string, callback: Callback) {
        this.route(path, 'PUT', callback)
        return this
    }
    
    patch(path: string, callback: Callback) {
        this.route(path, 'PATCH', callback)
        return this
    }
    
    del(path: string, callback: Callback) {
        this.route(path, 'DELETE', callback)
        return this
    }
    
    listen(port: number) {
        this.server.listen(port)
        return this
    }
    
    onError(handler: ErrorHandler) {
        this.errorHandlers.push(handler)
        return this
    }

    private createHttpServer() {
        return createServer((req, res) => {
            let bodyStr = ''
            req.on('data', (chunk) => {
                bodyStr += chunk.toString()
            })
            .on('end', () => {
                const request = new HttpRequest(req, bodyStr)
                const response = this.handleRequest(request)
        
                res.statusCode = response.statusCode
                if (typeof response.body === "object" || Array.isArray(response.body)) {
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
    }

    private handleRequest(request: HttpRequest) {
        const response = new HttpResponse(200, '')
        try {
            const matches = this.routes.filter(({path, method}) =>
                routesMatching(request.url, path) &&
                methodsMatching(request.method, method))
            
            const resolvers = [() => {}]
            matches.reverse().forEach(({path, callback}, index) => {
                const req = request.toObject()
                req.params = extractParams(request.url || "", path)
                resolvers.push(() => callback(req, response, resolvers[index]))
            })
            resolvers.pop()!()
    
            if (matches.length < 1)
                response.status(400).send({message: "Not found"})
        }
        catch (error) {
            response.statusCode = 500
    
            const resolvers = [() => {}]
            this.errorHandlers.reverse().forEach((handler, index) => {
                resolvers.push(() => handler(
                    error, request, response, resolvers[index]
                ))
            })
            defaultErrorHandler(error, request, response, resolvers.pop()!)
        }
    
        return response
    }
}