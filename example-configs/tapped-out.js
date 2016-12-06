module.exports = {
    "inputFile": "data/tapped-out-example-deck.html"
    // "inputUrl": "http://tappedout.net/mtg-decks/saskia-the-beatdown-boss/"
    , "output": "data/tapped-out.md"
    , 'selector': 'li'

    , "exclude": [
        "^/users/"
        , "^\\s*$"        // Any number of spaces **ONLY**
    ]
    , "include": [
        "^[0-9]+x\\s"      // Starts with "1x ", "2x "
    ]

    // Should unknown items be included in the output?
    // , "includeUnknown": true
    // Should the output order be ascending or descending?
    // , "invertOutputOrder": true

    // Header & Footer for the markdown document
    // , "markdownPreamble": "# anchor-to-markdown\n\n"
    // , "markdownPostamble": `\n> Generated ${new Date()}\n\n`

    // Generic debug flags

    // , "debugAll": true
    // , "verbose": true
    // , "logFn": true
    // , "logConfig": true

    // Debug flags for higher order functions

    // , "logReadWrite": true
    // , "logGather": true
    // , "logFilter": true
    // , "logCreateMD": true

    // Debug flags for scrape, regex and markdown submodules

    // , "logScrape": true
    // , "logRegex": true
    // , "logMarkdown": true
};