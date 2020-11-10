import { Application } from 'express'
import { createWriteStream, existsSync, readFileSync, statSync, writeFileSync } from 'fs'
import fs from 'fs'
const { readFile, writeFile } = fs.promises
import { google } from 'googleapis'
import fetch from 'node-fetch'
import { CommonState } from '.'
import { showImage } from './utils'

type AccessToken = {
    access_token: string,
    refresh_token: string,
    scope: string,
    token_type: string,
    expiry_date: number
}

const { CLIENT_ID, CLIENT_SECRET } = require('./google_oauth.json')

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://ruediger:1337/auth")

const photos_api = "https://photoslibrary.googleapis.com"

export default function setup(app: Application, stateRef: CommonState) {
    let secret: AccessToken | null = existsSync("secret") ? JSON.parse(readFileSync("secret").toString('utf-8')) : null
    let photos: string[] = []

    const save_secret = () => writeFileSync("secret", JSON.stringify(secret))

    const fetch_photos = async () => {
        const yesterday = Date.now() - 24 * 60 * 60 * 1000
        const can_reuse = existsSync("photos.json") && (yesterday < +statSync("photos.json").mtime)

        if (can_reuse) {
            console.log(`Photos cache is fresh enough, won't hit the Photos API`)
            photos = JSON.parse((await readFile("photos.json")).toString('utf-8'))
        } else {
            if (secret == null) return
            oauth2Client.setCredentials(secret)
            const { token } = await oauth2Client.getAccessToken()
            if (token != null && token != secret.access_token) {
                secret.access_token = token
                save_secret()
            }

            let nextPageToken = ""
            do {
                const result = await fetch(`${photos_api}/v1/mediaItems?pageSize=100`, {
                    headers: {
                        authorization: `${secret.token_type} ${secret.access_token}`
                    }
                })
                if (!result.ok) {
                    console.debug(await result.text())
                    break
                }
                const data = await result.json()
                nextPageToken = data.nextPageToken
                photos = [...photos, ...data.mediaItems.map(x => `${x.baseUrl}=w1920-h1080`)]
                console.log(`Got ${data.mediaItems.length} more photos, total ${photos.length}`)

            } while (nextPageToken && photos.length < 512)
            await writeFile("photos.json", JSON.stringify(photos))
        }
    }

    app.get("/auth", async (req, res) => {
        const { code } = req.query
        if (!code) {
            const auth_url = oauth2Client.generateAuthUrl({
                scope: ["https://www.googleapis.com/auth/photoslibrary.readonly"]
            })
            res.redirect(auth_url)
        } else {
            const { tokens } = await oauth2Client.getToken(code as string)
            secret = tokens as AccessToken
            writeFileSync("secret", JSON.stringify(tokens))
            fetch_photos()
            res.status(200).send("nice")
        }
    })

    if (secret) fetch_photos()

    const show_next_photo = async () => {
        if (stateRef.busy || stateRef.player) return
        if (!photos.length) return

        const photo = photos[Math.floor(Math.random() * photos.length)];
        (await fetch(photo as string)).body.pipe(createWriteStream("image.jpg", "binary")).on('close', () => {
            showImage("image.jpg")
        })
    }

    setInterval(show_next_photo, 10000)
    setTimeout(show_next_photo, 500)
}