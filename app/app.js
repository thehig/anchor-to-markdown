const   version                     = require('../package.json').version
        , defaultConfig             = require('./config/default.js')
        , userConfig                = require('../data/config.js');

const selectorConfigs = {
    'a': require('./config/anchor.js')
    , 'li': require('./config/list-item.js')
}

console.log(`=== Item to Markdown v${version} ===\n`);

let selectorConfig = selectorConfigs[userConfig.selector];
if(!selectorConfig) return console.log(`[-] No selector provided. Valid selectors:\n\t${Object.keys(selectorConfigs).join(', ')}`);

// Grab all the configs from the various inputs and smear them onto the config
const config = Object.assign({}, defaultConfig, selectorConfig, userConfig);

// Load the library with the provided config and callbacks
const lib = require('./anchor2markdown.js')(config, selectorConfig.scrape, selectorConfig.regex, selectorConfig.markdown);

lib.processConfigAsync()
    .then(lib.readFileAsync)
    .then(lib.loadJsdomAsync)
    .then(lib.gatherItemsAsync)
    .then(lib.filterItemsAsync)
    .then(lib.sortAndMergeItemsAsync)
    .then(lib.createMarkdownAsync)
    .then(lib.writeFileAsync)
    .then((markdown)=>{
        console.log(`[+] Generated markdown (${markdown.length} characters)`);
    })
    .then(null, (err)=>{
        console.log("[-] Error");
        console.log(err);
    });