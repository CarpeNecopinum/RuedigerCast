import { Application } from 'express'
import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs'
import fs from 'fs'
const { readFile, writeFile } = fs.promises
import { google } from 'googleapis'
import fetch from 'node-fetch'
import { CommonState } from '.'
import { showImageWithClock } from './utils'

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

const num_photo_pages = 20

export default function setup(app: Application, stateRef: CommonState) {
    let secret: AccessToken | null = existsSync("secret") ? JSON.parse(readFileSync("secret").toString('utf-8')) : null
    let photos: string[] = []

    const save_secret = () => writeFileSync("secret", JSON.stringify(secret))

    const update_secret = async () => {
        if (secret == null) return
        oauth2Client.setCredentials(secret)
        const { token } = await oauth2Client.getAccessToken()
        if (token != null && token != secret.access_token) {
            secret.access_token = token
            save_secret()
        }
    }

    const fetch_photos = async () => {
        if (secret == null) return
        await update_secret()

        let pages_to_go = Math.floor(Math.random() * num_photo_pages)
        console.log(`Will show page ${pages_to_go} of photos`)
        let nextPageToken = ""
        do {
            const result = await fetch(`${photos_api}/v1/mediaItems?pageSize=25`, {
                headers: {
                    authorization: `${secret.token_type} ${secret.access_token}`
                }
            })
            if (!result.ok) {
                console.debug(await result.text())
                break
            }
            const data = await result.json()
            if (pages_to_go == 0) {
                photos = data.mediaItems.map(x => `${x.baseUrl}=w1920-h1080`)
                break
            }
            pages_to_go--
            nextPageToken = data.nextPageToken
        } while (nextPageToken)
        show_next_photo()
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

        const photo = photos[Math.floor(Math.random() * photos.length)]
        const res = await fetch(photo as string)
        if (res.ok) {
            res.body.pipe(createWriteStream("image.jpg", "binary")).on('close', () => showImageWithClock("image.jpg"))
        } else {
            await fetch_photos()
            setTimeout(show_next_photo, 200)
        }
    }

    setInterval(show_next_photo, 30000)
    setTimeout(show_next_photo, 1000)
}