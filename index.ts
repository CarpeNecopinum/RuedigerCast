import express from 'express'
import bodyParser from 'body-parser'
import { ChildProcess, spawn } from 'child_process'
import { showError, showLoading } from './messages'
import { clearScreen, run, runMultitry } from './utils'
import fs from 'fs'
import slideshow from './slideshow'

export type CommonState = {
    busy: boolean,
    player: ChildProcess | null,
    info: any | null
}

const player = "omxplayer" // "mplayer"
const www = __dirname + "/static/"
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.sendFile(www + "index.html")
})

const youtubeHandler = {
    match: (url: string) => url.includes("youtube.com"),
    prepare: (url: string) => {
        const format = 137
        return `youtube-dl -g -f 'best[ext=mp4]' "${url}"`
    },
    getInfoCommand: (url: string) => {
        return `youtube-dl -j "${url}"`
    }
}

const fallbackHandler = {
    match: (url: string) => true,
    prepare: (url: string) => `youtube-dl -g -f 'best[ext=mp4]' "${url}"`,
    getInfoCommand: (url: string) => {
        return `youtube-dl -j "${url}"`
    }
}

const handlerChain = [youtubeHandler, fallbackHandler]

const current: CommonState = {
    busy: false,
    player: null,
    info: null
}

app.post("/start", async (req, res) => {
    const { url } = req.body
    if (!url) return res.status(404).end()
    console.log("Asked to play: ", url)

    if (current.busy) return res.status(204).end()

    showLoading()
    current.player?.stdin?.write("q")

    const handler = handlerChain.find(x => x.match(url))!
    const url_getter_cmd = handler.prepare(url)
    current.busy = true
    current.info = null

    await Promise.all([
        (async () => {
            const video_url = await runMultitry(url_getter_cmd)
            await fs.promises.writeFile('vidurl.txt', video_url)

            current.player = spawn(`${player} \`cat vidurl.txt\``, { shell: true })
            current.player.stdout?.on('data', (d: Buffer) => console.log(d.toString('utf-8')))
            current.player.on('exit', () => {
                clearScreen()
                current.player = null
                current.info = null
            })
        })(),
        (async () => {
            const info_json = await runMultitry(handler.getInfoCommand(url))
            current.info = JSON.parse(info_json)
        })()
    ])

    current.busy = false


    res.status(204).end()
})

app.get("/current", (req, res) => {
    return res.status(200).json(current.info)
})

app.post("/control/stop", (req, res) => {
    current.player?.stdin?.write("q")
    res.status(204).end()
})

app.post("/control/pause", (req, res) => {
    current.player?.stdin?.write("p")
    res.status(204).end()
})

app.post("/control/fwd", (req, res) => {
    current.player?.stdin?.write("\x1B[C")
    res.status(204).end()
})

app.post("/control/rwd", (req, res) => {
    current.player?.stdin?.write("\x1B[D")
    res.status(204).end()
})

app.post("/control/volumeup", (req, res) => {
    current.player?.stdin?.write("+")
    res.status(204).end()
})

app.post("/control/volumedown", (req, res) => {
    current.player?.stdin?.write("-")
    res.status(204).end()
})

slideshow(app, current)

app.use(function (err, req, res, next) {
    showError()
    res.status(500).send('Something broke!')
    next(err)
})

clearScreen()
app.listen(1337, () => console.debug("Started Server."))