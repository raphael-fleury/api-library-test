import { IncomingMessage, ServerResponse, createServer } from 'http'
import { routes, errorHandlers } from './'
import { ErrorHandler, Method } from './types'

function routesMatching(url: string | undefined, path: string) {
    if (path === "*") return true
    if (!url) return false

    const urlSplit = url.split('/')
    const pathSplit = path.split('/')

    for (const index in urlSplit) {
        if (pathSplit[index] === undefined)
            return false
        if (pathSplit[index] === '*')
            continue
        if (pathSplit[index][0] === ':')
            continue
        if (pathSplit[index] !== urlSplit[index])
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
        params.set(key, urlSplit[index])
    }

    return params
}

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

function parseBody(content: string, contentType: string) {
    if (contentType === "application/json") {
        return content ? JSON.parse(content) : {}
    }
}

const defaultErrorHandler: ErrorHandler = (error, req, res, next) => {
    if (error instanceof Error) {
        console.error(error)
        res.status = 500
        res.body = {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
    }
    next()
}

function handleRequest(req: IncomingMessage, bodyStr: string) {
    let response = {
        status: 200,
        body: {}
    }

    const request = {
        query: extractQuery(req.url || ""),
        headers: req.headers,
        params: new Map(),
        body: {}
    }

    try {
        let matches = 0
        request.body = parseBody(bodyStr, getContentType(req))
    
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
            response.status = 404
            response.body = {message: "Not found"}
        }
    }
    catch (error) {
        let stop = true
        const next = () => { stop = false }

        response.status = 500
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
    let response = {
        status: 200,
        body: {}
    }

    let bodyStr = ''
    req.on('data', (chunk) => {
        bodyStr += chunk.toString()
    })
    .on('error', (error) => {
        response.status = 500
        response.body = { message: "Unknown error" }
    })
    .on('end', () => {
        response = handleRequest(req, bodyStr)
        res.writeHead(response.status, {'Content-Type': 'application/json'})
        res.write(JSON.stringify(response.body))
        res.end()
    })
})