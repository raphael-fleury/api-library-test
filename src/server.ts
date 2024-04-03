import { IncomingMessage, ServerResponse, createServer } from 'http'
import { routes, errorHandlers } from './'
import { Method } from './types'

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

function handleRequest(req: IncomingMessage, bodyStr: string) {
    let response = {
        status: 200,
        body: {}
    }

    const contentType = getContentType(req)
    const query = extractQuery(req.url || "")
    const body = parseBody(bodyStr, contentType)
    const headers = req.headers

    let matches = 0
    for (const { path, method, callback } of routes) {
        if (!routesMatching(req.url, path) || !methodsMatching(req.method, method))
            continue

        matches++
        const request = {
            query, body, headers,
            params: extractParams(req.url || "", path)
        }
    
        let stop = true
        const next = () => { stop = false }
        
        try {
            request.body = parseBody(bodyStr, contentType)
            callback(request, response, next)
            if (stop)
                break
        }
        catch (error) {
            for (const handler of errorHandlers) {
                handler(error, request, response, next)
                if (stop)
                    break
            }
        }
    }

    if (matches < 1) {
        response.status = 404
        response.body = {message: "Not found"}
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
        try {
            response = handleRequest(req, bodyStr)
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(error)
                response.status = 500
                response.body = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            }
        }
        res.writeHead(response.status, {'Content-Type': 'application/json'})
        res.write(JSON.stringify(response.body))
        res.end()
    })
})