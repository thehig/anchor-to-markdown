const   version                     = require('../package.json').version
        , defaultConfig             = require('./config/default.js')
        , anchorConfig              = require('./config/anchor.js')
        , userConfig                = require('../data/config.js');
        // , userConfig                = require('../data/config-li.js');

console.log(`=== Item to Markdown v${version} ===\n`);

// Grab all the configs from the various inputs and smear them onto the config
const config = Object.assign({}, defaultConfig, anchorConfig, userConfig);

// Grab the specific scrape/regex/markdown or default which are not smeared by Object.assign
let scrape = (userConfig.scrape ? userConfig.scrape : anchorConfig.scrape);
let regex = (userConfig.regex ? userConfig.regex : anchorConfig.regex);
let markdown = (userConfig.markdown ? userConfig.markdown : anchorConfig.markdown);

// Load the library with the provided config and callbacks
const lib = require('./lib.js')(config, scrape, regex, markdown);

lib.readFileAsync()
    .then(lib.loadJsdomAsync)
    .then(lib.gatherItemsAsync)
    .then ( items => {
        console.log(`[+] Scraped ${items.length} items`);
        return items;
    })
    .then(lib.categorizeItemsAsync)
    .then( items => {
        console.log(`[+] Sorted items:`)
        console.log(`\texclude: ${items.exclude.length}`);
        console.log(`\tinclude: ${items.include.length}`);
        console.log(`\tunknown: ${items.unknown.length}`);
        return items;
    })
    .then(lib.createMarkdownAsync)
    .then(lib.writeFileAsync)
    .then(()=>{
        console.log("[+] Complete");
    })
    .then(null, (err)=>{
        console.log("[-] Error");
        console.log(err);
    });