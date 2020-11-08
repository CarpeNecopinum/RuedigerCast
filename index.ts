import express from 'express'
import bodyParser from 'body-parser'
import { ChildProcess, spawn } from 'child_process'
import { showError, showLoading } from './messages'
import { clearScreen, run } from './utils'
import fs from 'fs'

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
    }
}

const fallbackHandler = {
    match: (url: string) => true,
    prepare: (url: string) => `youtube-dl -g -f 'best[ext=mp4]' "${url}"`
}

const handlerChain = [youtubeHandler, fallbackHandler]

let currentPlayer: ChildProcess | null = null

app.post("/start", async (req, res) => {
    showLoading()

    const { url } = req.body
    if (!url) return res.status(404).end()
    const handler = handlerChain.find(x => x.match(url))!

    const url_getter_cmd = handler.prepare(url)
    const video_url = await run(url_getter_cmd)

    if (currentPlayer != null) currentPlayer.kill()

    console.debug(video_url)
    await fs.promises.writeFile('vidurl.txt', video_url)

    currentPlayer = spawn(`${player} \`cat vidurl.txt\``, { shell: true })
    currentPlayer.stdout?.on('data', (d: Buffer) => console.log(d.toString('utf-8')))
    currentPlayer.on('exit', clearScreen)

    res.status(204).end()
})

app.post("/control/stop", (req, res) => {
    currentPlayer?.stdin?.write("q")
    res.status(204).end()
})

app.post("/control/pause", (req, res) => {
    currentPlayer?.stdin?.write("p")
    res.status(204).end()
})

app.post("/control/fwd", (req, res) => {
    currentPlayer?.stdin?.write("\x1B[C")
    res.status(204).end()
})

app.post("/control/rwd", (req, res) => {
    currentPlayer?.stdin?.write("\x1B[D")
    res.status(204).end()
})

app.use(function (err, req, res, next) {
    showError()
    res.status(500).send('Something broke!')
    next(err)
})

clearScreen()
app.listen(1337, () => console.debug("Started Server."))