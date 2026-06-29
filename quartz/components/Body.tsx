// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
// @ts-ignore
import lazyLoadScript from "./scripts/lazy.inline"
// @ts-ignore
import audioPlayerScript from "./scripts/audioPlayer.inline"
// @ts-ignore
import dappledLightScript from "./scripts/dappledLight.inline"
import clipboardStyle from "./styles/clipboard.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return <div id="quartz-body">{children}</div>
}

// each entry is wrapped in its own IIFE by the emitter, so keep them as
// separate array items rather than one concatenated string (concatenating
// pre-bundled scripts into one function body merges their IIFEs and breaks)
Body.afterDOMLoaded = [clipboardScript, lazyLoadScript, audioPlayerScript, dappledLightScript]
Body.css = clipboardStyle

export default (() => Body) satisfies QuartzComponentConstructor
