import React, { ReactElement } from 'react'
import { showElement } from "./utils"
import ReactDOMServer from 'react-dom/server'
import nodeHtmlToImage from 'node-html-to-image'

const css = `
body {
    font-size: 600%;
    background-color: #002;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
}

.error {
    background-color: #300;
}

h1, h2, h3, p {
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
    margin: 0;
}

h1 {
    color: steelblue;
}

h2, h3, p {
    color: white;
}
`

const width = 1920
const height = 1080
function Frame({ children, className }: { children: any, className?: any }) {
    return <html>
        <head>
            <style dangerouslySetInnerHTML={{ __html: css }} />
        </head>
        <body className={className} style={{ width, height, minHeight: height }}>
            {children}
        </body>
    </html>
}

function renderFrames(list: JSX.Element[], folder: string) {
    list.map(async (el, i) => {
        const html = ReactDOMServer.renderToStaticMarkup(el)

        await nodeHtmlToImage({
            html, type: 'jpeg', quality: 100, output: `${folder}/${i}.png`, puppeteerArgs: {
                executablePath: 'chromium'
            }
        })
    })
}

const loading_frames = [
    <Frame>
        <h1>Loading your shizzle</h1>
        <h2>Please ein bisschen geduldizzle</h2>
    </Frame>,
    <Frame>
        <h1>PENIS!</h1>
        <p>Nun, da wir Ihre Aufmerksamkeit haben: Das Video wird geladen...</p>
    </Frame>,
    <Frame>
        <h1>Rüdiger</h1>
        <h3>Durchsucht gerade die Weiten des Internats.</h3>
    </Frame>
]
renderFrames(loading_frames, 'static/screens/loading')


const error_frames = [
    <Frame className="error">
        <h1>Ohnoes</h1>
        <h2>Rüdiger-sama did a fucksy wucksie UwU</h2>
    </Frame>,
    <Frame className="error">
        <h1>Shit's broken, Yo</h1>
    </Frame>,
    <Frame className="error">
        <h1>Das klappt nicht.</h1>
        <h3>Aber immerhin ist der Fernseher geil.</h3>
    </Frame>
]
renderFrames(error_frames, 'static/screens/error')
