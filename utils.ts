
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

export async function runMultitry(cmd: string, tries = 3) {
    try {
        return await run(cmd)
    } catch (e) {
        if (tries > 0) return await runMultitry(cmd, tries - 1)
        throw e
    }
}

let width = 1920
let height = 1080

export function showImage(filename: string) {
    return run(`convert "${filename}" -gravity center -background black -resize ${width}x${height} -extent ${width}x${height} bgra:/dev/fb0`)
}

const motds = [
    "Ruedigercast is awaiting your orders, master...",
    "Gib me video or something...",
    "Fürs Wetter kannst du auch nach draußen gucken.",
    "Das Leben ist schön. Dank Rüdiger."
]

export function showImageWithClock(filename: string) {
    const now = new Date()
    const min = ("0" + now.getMinutes()).substr(-2)
    const hrs = now.getHours()

    const time = `${hrs}:${min}`
    const motd = motds[Math.floor(Math.random() * motds.length)]
    //const command = `convert -gravity center -background none -strokewidth 2 -stroke black -fill white -pointsize 150 label:'${text}' -shadow 200x30 +repage -annotate 0x0 '${text}' '${filename}' -gravity center -background black -resize ${width}x${height} -extent ${width}x${height} +swap -gravity NorthEast -composite bgra:/dev/fb0`
    //const command = `convert "${filename}" -gravity center -background black -resize ${width}x${height} -extent ${width}x${height} -gravity NorthEast -strokewidth 4 -stroke black -fill white -pointsize 150 -annotate +50+50 '${text}' bgra:/dev/fb0 `
    const command = `
        convert ${filename} -resize ${width}x${height}^ -gravity center -extent ${width}x${height} -modulate 80 -blur 20x10  \
            ${filename} -background none -resize ${width}x${height} -gravity center -extent ${width}x${height} -composite \
            -font "Open-Sans" -stroke black \
            \\( -pointsize 150 -stroke black -strokewidth 5 -geometry +50+50 label:"${time}" -extent 150%x150% -blur 0x10 \\) -gravity NorthEast -composite \
            \\( -gravity center -pointsize 150 -strokewidth 2 -stroke black -fill white -geometry +50+50 label:"${time}" -extent 150%x150% \\) -gravity NorthEast -composite \
            \\( -gravity center -pointsize 50 -strokewidth 2 -stroke black -fill white -geometry +5+5 label:"${motd}" \\) -gravity SouthWest -composite \
        bgra:/dev/fb0    
    `


    return run(command)
}

export async function readFramebufferSize() {
    const fbset = await run("fbset")
    const match = fbset.match(/\"(\d+)x(\d+)\"/)
    if (match) {
        width = parseInt(match[1])
        height = parseInt(match[2])
        console.log(`Read framebuffer size as ${width}x${height}`)
    }
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