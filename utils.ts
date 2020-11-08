
import { exec } from 'child_process'
import { ReactElement } from 'react'
import ReactDOMServer from 'react-dom/server'
import nodeHtmlToImage from 'node-html-to-image'

export function run(cmd: string) {
    return new Promise<string>((good, bad) => {
        exec(cmd, (err, stdout, stderr) => {
            if (!err) return good(stdout)
            return bad(err)
        })
    })
}

const width = 1680
const height = 1050

export function showImage(filename: string) {
    return run(`convert "${filename}" -gravity center -background black -resize ${width}x${height} -extent ${width}x${height} bgra:/dev/fb0`)
}

export function clearScreen() {
    return run(`dd if=/dev/zero of=/dev/fb0 || true`)
}

export async function showElement(el: ReactElement) {
    const html = ReactDOMServer.renderToStaticMarkup(el)
    console.debug(html)
    await nodeHtmlToImage({
        html, type: 'jpeg', quality: 100, output: 'temp.jpg', puppeteerArgs: {
            executablePath: 'chromium-browser'
        }
    })
    await new Promise((good, bad) => {
        exec(`convert temp.jpg -density 8 bgra:/dev/fb0`, (err) => {
            if (err) return bad()
            good()
        })
    })
}