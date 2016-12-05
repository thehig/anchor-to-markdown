const startingConfig = require('../data/config-li.js')
        , version = require('../package.json').version;

console.log(`=== Item to Markdown v${version} ===\n`);

const defaultAnchor = {
        // scrape a set of parameters from an item. index & text are required
        scrape: (config, debug, $, index, value)=>{
            if(debug.verbose && debug.logFn) console.log(`[*] scrape($, ${index}, ${$(value).text()})`);
            if(typeof config === undefined) return e(new Error("config not loaded in scrape"));

            // index & text are **REQUIRED** for sorting and filter tagging
            const item = {
                index: index,                           // Keep track of index for potential sorting later on
                text: $(value).text(),
                url: $(value).attr('href'),
                hostname: $(value).prop('hostname')     // An empty hostname can be a relative local link on a page eg: '/home/home.html'
            };

            // Check for empty hostnames
            if(config.includeEmptyHostname || item.hostname !== undefined && item.hostname.length > 0) {
                if(debug.logScrape) console.log(`[+] Adding item: ${item.url}`);
                return item;
            } else {
                if(debug.logScrape) console.log(`[-] Ignoring item due to blank hostname in: ${item.url}`);
                return undefined;
            }
        },

        // check an items 'url' and 'text' against a regex
        regex: (config, debug, item, regex) => {
            if(debug.verbose && debug.logFn) console.log(`[*] anchorRegex(item, ${regex})`);
            const matchesUrl = regex.test(item.url);
            const matchesText = regex.test(item.text);
            if(debug.logRegexMatching){
                if(matchesUrl) console.log(`[+] Regex ${regex} matches url "${item.url}"`);
                if(matchesText) console.log(`[+] Regex ${regex} matches text "${item.text}"`);
            }
            return matchesUrl || matchesText;
        },

        // Convert a given item into Markdown
        markdown: (config, debug, item) => `* *(${item.hostname})* [${item.text}](${item.url})\n`
}

// TODO: Consider using some form of Object.assign({})
let config = {
    debugAllTheThings: startingConfig.debugAllTheThings                                                             // Toggle all debug flags in one go

    , selector: startingConfig.selector || 'a'                                                                      // Items to select from the DOM
    , exclude: startingConfig.exclude || []                                                                         // Array of regexes to exclude from output
    , include: startingConfig.include || []                                                                         // Array of regexes to include in output
    , includeUnknown: startingConfig.includeUnknownInMD                                                             // Toggle inclusion of unknown items
    , includeEmptyHostname: startingConfig.includeEmptyHostname                                                     // Toggle inclusion of items with unknown hostname

    , input: startingConfig.inputFile                                                                               // File to read from
    , output: startingConfig.output                                                                                 // File to write to
    , markdownPreamble: startingConfig.outputPreamble || "# Automated Item extraction\n\n"                          // What to write at the top of the markdown
}

const debug = {
    logFn: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logFn)                         // Output the name of the function when called
    , logScrape: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logScrape)               // Output the scrape process of whats included or excluded
    , logRegexMatching: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logRegexMatching) // Output the regex matching process
    , logFilter: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logFilter)               // Output filter include/exclude/unknown
    , logMarkdown: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logMarkdown)           // Output the markdown to the console
    , logReadWrite: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logReadWrite)         // Output the read and write targets
    , verbose: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.verbose)                   // Output more verbose output
}

// Bind the config and debug options for the scrape, regex & markdown functions
config.scrape = (startingConfig.scrape ? startingConfig.scrape : defaultAnchor.scrape).bind(null, config, debug);
config.regex = (startingConfig.regex ? startingConfig.regex : defaultAnchor.regex).bind(null, config, debug);
config.markdown = (startingConfig.markdown ? startingConfig.markdown : defaultAnchor.markdown).bind(null, config, debug);

const lib = require('./lib.js')(config, debug);

// Bind the scrape, regex and markdown functions to the appropriate higher order functions
let scrapeMyItems = lib.scrapeItemsAsync.bind(null, config.scrape);
let regexMyItems = lib.regexItemsAsync.bind(null, config.regex);
let markdownMyItems = lib.createMarkdownAsync.bind(null, config.markdown);

lib.readFileAsync()
    .then(lib.loadJsdomAsync)
    .then(scrapeMyItems)
    .then ( items => {
        console.log(`[+] Scraped ${items.length} items`);
        return items;
    })
    .then(regexMyItems)
    .then( items => {
        console.log(`[+] Sorted items:`)
        console.log(`\texclude: ${items.exclude.length}`);
        console.log(`\tinclude: ${items.include.length}`);
        console.log(`\tunknown: ${items.unknown.length}`);
        return items;
    })
    .then(markdownMyItems)
    .then(lib.writeFileAsync)
    .then(()=>{
        console.log("[+] Complete");
    })
    .then(null, (err)=>{
        console.log("[-] Error");
        console.log(err);
    });