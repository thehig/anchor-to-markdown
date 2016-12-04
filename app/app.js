const   jsdom = require("jsdom")
        , fs = require('fs')
        , path = require('path')
        , _ = require('lodash')
        , startingConfig = require('../data/config.json')
        , version = require('../package.json').version;

console.log(`=== Item to Markdown v${version} ===\n`);

// TODO: Consider using some form of Object.assign({})
const config = {
    debugAllTheThings: startingConfig.debugAllTheThings                                                             // Toggle all debug flags in one go

    , selector: startingConfig.selector || 'a'                                                                      // Items to select from the DOM
    , exclude: startingConfig.exclude || []                                                                         // Array of regexes to exclude from output
    , include: startingConfig.include || []                                                                         // Array of regexes to include in output
    , includeUnknown: startingConfig.includeUnknownInMD                                                             // Toggle inclusion of unknown items
    , includeEmptyHostname: startingConfig.includeEmptyHostname                                                     // Toggle inclusion of items with unknown hostname

    , input: startingConfig.inputFile                                                                               // File to read from
    , output: startingConfig.output                                                                                 // File to write to
    , markdownPreamble: startingConfig.outputPreamble || "# Automated Item extraction\n\n"                        // What to write at the top of the markdown
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

// Function to scrape a set of parameters from an item
const scrapeItem = ($, index, value)=>{
    if(debug.verbose && debug.logFn) console.log(`[*] scrapeItem($, ${index}, ${$(value).text()})`);
    if(typeof config === undefined) return e(new Error("config not loaded in scrapeItem"));

    const item = {
        index: index,                           // Keep track of index for potential sorting later on
        url: $(value).attr('href'),
        text: $(value).text(),
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
}

// Function to check an items 'url' and 'text' against a regex
const testRegex = (item, regex) => {
    if(debug.logMyFunctions && debug.logFn) console.log(`[*] testRegex(item, ${regex})`);
    const matchesUrl = regex.test(item.url);
    const matchesText = regex.test(item.text);
    if(debug.logRegexMatching){
        if(matchesUrl) console.log(`[+] Regex ${regex} matches url "${item.url}"`);
        if(matchesText) console.log(`[+] Regex ${regex} matches text "${item.text}"`);
    }
    return matchesUrl || matchesText;
}

// Convert a given item into Markdown
const itemToMarkdownLine = item => `* *(${item.hostname})* [${item.text}](${item.url})\n`;

// Read file specified by config.input and return the file contents
const readFileAsync = () => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] readFileAsync()`);
        if(typeof config === undefined) return e(new Error("config not loaded in readFileAsync"));
        if(typeof config.input === undefined) return e(new Error("config.input not loaded in readFileAsync"));

        const filePath = path.resolve(__dirname, config.input);
        if(debug.logReadWrite) console.log(`[+] Reading input from ${filePath}`);
        fs.readFile(filePath, "utf-8", (err, data)=>{
            if(debug.logReadWrite) console.log(`[+] Reading input complete`);
            err ? e(err) : c(data);
        });
    });

// Load in a html file, inject jquery, create and return the DOM
const loadJsdomAsync = html => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] loadJsdomAsync()`);
        if(typeof html === undefined) return e(new Error("No HTML in loadJsdomAsync"));
        jsdom.env(html, ["http://code.jquery.com/jquery.js"], (err, window)=>{
            err ? e(err) : c(window);
        });
    });

// Use jQuery to convert all <a> into objects
const scrapeItemsAsync = (scrapeItemFn, window) => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] scrapeItemsAsync()`);
        if(typeof scrapeItemFn !== "function") return e(new Error("No scrapeItemFn in scrapeItemsAsync"));
        if(typeof window === undefined) return e(new Error("No window in scrapeItemsAsync"));
        if(typeof window.$ === undefined) return e(new Error("No jquery in scrapeItemsAsync"));
        if(typeof config === undefined) return e(new Error("No config loaded in scrapeItemsAsync"));
        if(typeof config.selector === undefined) return e(new Error("No config.selector loaded in scrapeItemsAsync"));
        const $ = window.$;
        let items = [];
        try{
            // Bind jQuery into the scrapeItem for pure function goodness
            let scrapedItems = $(config.selector).each((index, value)=>{
                var item = scrapeItemFn($, index, value);
                if(item) items.push(item);
            });
        } catch(err){
            e(err);
        }
        c(items);
    });

// Filter the item collection by regexes in config.include and config.exclude
const regexItemsAsync = (regexTestFn, items) => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] regexItemsAsync(${items.length} items)`);
        if(typeof regexTestFn !== "function") return e(new Error("No regexTestFn in regexItemsAsync"));
        if(typeof items === undefined) return e(new Error("No items in regexItemsAsync"));
        if(typeof config === undefined) return e(new Error("No config loaded"));
        if(typeof config.include === undefined) return e(new Error("No config.include loaded in regexItemsAsync"));
        if(typeof config.exclude === undefined) return e(new Error("No config.exclude loaded in regexItemsAsync"));

        // Convert our provided strings into regexes (ignoring case)
        const createRegex = regexString => new RegExp(regexString, 'i');
        const includeRegexs = config.include.map(createRegex);
        const excludeRegexs = config.exclude.map(createRegex);

        // Structure to hold the sorted data
        let sorted = {
            include: [],
            exclude: [],
            unknown: []
        }
        
        try{
            items.forEach((item)=>{
                // Use the regexTestFn
                const testItem = regexTestFn.bind(null, item); // Bind on the item so we can inline the _.some call
                if(_.some(excludeRegexs, testItem)){
                    if(debug.logFilter) console.log(`[-] Exclude:\t"${item.text}"`);
                    sorted.exclude.push(item);
                }
                else if(_.some(includeRegexs, testItem)){
                    if(debug.logFilter) console.log(`[+] Include:\t"${item.text}"`);
                    sorted.include.push(item);
                }
                else{
                    if(debug.logFilter) console.log(`[?] Unknown:\t"${item.text}"`);
                    sorted.unknown.push(item);
                }
            });
        } catch(err){ 
            e(err); 
        }
        c(sorted);
    });

// From the sortedItems, convert the 'include' items into markdown
const createMarkdownAsync = (convertToMarkdownFn, sortedItems) => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] createMarkdownAsync(${sortedItems.include.length} include items)`);
        if(typeof convertToMarkdownFn !== "function") return e(new Error("No convertToMarkdownFn in createMarkdownAsync"));
        if(typeof sortedItems === undefined) return e(new Error("No sortedItems in createMarkdownAsync"));
        if(typeof config === undefined) return e(new Error("No config loaded in createMarkdownAsync"));
        if(typeof config.markdownPreamble === undefined) return e(new Error("No config.markdownPreamble loaded in createMarkdownAsync"));

        // Take the include, and optionally the unknown
        let sourceList = [].concat(sortedItems.include);
        if(config.includeUnknown) {
            if(debug.logMarkdown) console.log(`[+] Including ${sortedItems.unknown.length} unknown items in markdown`);
            sourceList = sourceList.concat(sortedItems.unknown);
        }

        // Sort in order with the lowest index first (config.invertOrder switches the sorting order)
        sourceList = sourceList.sort((a, b)=> {return config.invertOrder ? b.index - a.index : a.index - b.index;});

        // Convert each item into a MD entry
        let outputMarkdown = "";
        try{
            outputMarkdown = sourceList.reduce((previous, item) => {
                // Use the convertToMarkdownFn to convert item into a markdown respective format
                return "" + previous + convertToMarkdownFn(item);
            }, config.markdownPreamble);
        } catch(err){
            e(err);
        }

        if(debug.logMarkdown) console.log(`[*] ===== Output Markdown =====\n${outputMarkdown}\n[*] ==== /Output Markdown/ ====`);
        c(outputMarkdown);
    });

// Write the text in inputString to the file specified by config.input
const writeFileAsync = inputString => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] writeFileAsync(${config.output})`);
        if(typeof inputString === undefined) return e(new Error("No inputString in writeFileAsync"));
        if(typeof config === undefined) return e(new Error("config not loaded in writeFileAsync"));
        if(typeof config.output === undefined) return e(new Error("config.output not loaded in writeFileAsync"));

        const filePath = path.resolve(__dirname, config.output);
        if(debug.logReadWrite) console.log(`[+] Writing output to ${filePath}`);
        
        fs.writeFile(filePath, inputString, {flags: 'w'}, (err)=>{
            if(debug.logReadWrite) console.log(`[+] Writing output complete`);
            err ? e(err) : c();
        });
    });

// Bind the scrape, regex and markdown functions to the appropriate higher order functions
let scrapeMyItems = scrapeItemsAsync.bind(null, scrapeItem);
let regexMyItems = regexItemsAsync.bind(null, testRegex);
let markdownMyItems = createMarkdownAsync.bind(null, itemToMarkdownLine);

readFileAsync()
    .then(loadJsdomAsync)
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
    .then(writeFileAsync)
    .then(()=>{
        console.log("[+] Complete");
    })
    .then(null, (err)=>{
        console.log("[-] Error");
        console.log(err);
    });