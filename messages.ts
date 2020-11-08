import fs from 'fs'
import { showImage } from './utils'

export async function showRandom(folder: string) {
    const images = await fs.promises.readdir(folder)
    const image = images[Math.floor(Math.random() * images.length)]

    await showImage(`${folder}/${image}`)
}

export function showLoading() {
    return showRandom('static/screens/loading')
}

export function showError() {
    return showRandom('static/screens/error')
}