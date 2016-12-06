module.exports = {
    "exclude": [],
    "include": [],

    // Should unknown items be included in the output?
    "includeUnknown": false,
    // Should the output order be ascending or descending?
    "invertOutputOrder": false,

    // Header for the markdown document
    "markdownPreamble": "# anchor-to-markdown\n\n",

    // Generic debug flags
    "debugAll": false,
    "verbose": false,
    "logFn": false,
    "logConfig": false,

    // Debug flags for higher order functions
    "logReadWrite": false,
    "logGather": false,
    "logFilter": false,
    "logSort": false,
    "logCreateMD": false,

    // Debug flags for scrape, regex and markdown submodules
    "logScrape": false,
    "logRegex": false,
    "logMarkdown": false
}