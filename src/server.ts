import { createServer } from 'http'
import { routes, errorHandlers } from './'
import { ErrorHandler, Method, Route } from './types'
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

function handleRequest(request: HttpRequest) {
    const response = new HttpResponse(200, '')
    try {
        const matches = routes.filter(({path, method}) =>
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
    let bodyStr = ''
    req.on('data', (chunk) => {
        bodyStr += chunk.toString()
    })
    .on('end', () => {
        const request = new HttpRequest(req, bodyStr)
        const response = handleRequest(request)

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