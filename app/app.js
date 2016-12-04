const   jsdom = require("jsdom")
        , fs = require('fs')
        , path = require('path')
        , _ = require('lodash')
        , startingConfig = require('../data/config.json')
        , version = require('../package.json').version;

console.log(`=== Anchor to Markdown v${version} ===\n`);

// TODO: Consider using some form of Object.assign({})
const config = {
    debugAllTheThings: startingConfig.debugAllTheThings                                                             // Toggle all debug flags in one go

    , exclude: startingConfig.exclude || []                                                                         // Array of regexes to exclude from output
    , include: startingConfig.include || []                                                                         // Array of regexes to include in output
    , includeUnknown: startingConfig.includeUnknown                                                                 // Toggle inclusion of unknown items

    , input: startingConfig.inputFile                                                                               // File to read from
    , output: startingConfig.output                                                                                 // File to write to
    , markdownPreamble: startingConfig.outputPreamble || "# Automated anchor extraction\n\n"                        // What to write at the top of the markdown
}

const debug = {
    logFn: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logFn)                         // Output the name of the function when called
    , logScrape: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logScrape)               // Output the scrape process of whats included or excluded
    , logRegexMatching: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logRegexMatching) // Output the regex matching process
    , logFilter: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logFilter)               // Output filter include/exclude/unknown
    , logMarkdown: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logMarkdown)           // Output the markdown to the console
    , logReadWrite: config.debugAllTheThings || (startingConfig.debug && startingConfig.debug.logReadWrite)         // Output the read and write targets
}

// Read file specified by config.input and return the file contents
let readFileAsync = () => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] readFileAsync()`);
        if(typeof config === undefined) return e(new Error("config not loaded in readFileAsync"));
        if(typeof config.input === undefined) return e(new Error("config.input not loaded in readFileAsync"));

        let filePath = path.resolve(__dirname, config.input);
        if(debug.logReadWrite) console.log(`[+] Reading input from ${filePath}`);
        fs.readFile(filePath, "utf-8", (err, data)=>{
            if(debug.logReadWrite) console.log(`[+] Reading input complete`);
            err ? e(err) : c(data);
        });
    });

// Load in a html file, inject jquery, create and return the DOM
let loadJsdomAsync = html => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] loadJsdomAsync()`);
        if(typeof html === undefined) return e(new Error("No HTML in loadJsdomAsync"));
        jsdom.env(html, ["http://code.jquery.com/jquery.js"], (err, window)=>{
            err ? e(err) : c(window);
        });
    });

// Use jQuery to convert all <a> into objects
let scrapeAnchorsAsync = window => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] scrapeAnchorsAsync()`);
        if(typeof window === undefined) return e(new Error("No window in scrapeAnchorsAsync"));
        if(typeof window.$ === undefined) return e(new Error("No jquery in scrapeAnchorsAsync"));
        let $ = window.$;       // Pull jQuery out from the JSDOM
        let anchors = [];
        try{
            $('a').each((index, value)=>{
                let anchor = {
                    index: index,                           // Keep track of index for potential sorting later on
                    url: $(value).attr('href'),
                    text: $(value).text(),
                    hostname: $(value).prop('hostname')     // An empty hostname can be a relative local link on a page eg: '/home/home.html'
                };

                // Check for empty hostnames
                if(anchor.hostname !== undefined && anchor.hostname.length > 0){
                    if(debug.logScrape) console.log(`[+] Adding anchor: ${anchor.url}`);
                    anchors.push(anchor);
                } else {
                    if(debug.logScrape) console.log(`[-] Ignoring anchor due to blank hostname in: ${anchor.url}`);
                }
            });
        } catch(err){
            e(err);
        }
        c(anchors);
    });

// Filter the anchor collection by regexes in config.include and config.exclude
let sortAnchorsAsync = anchors => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] sortAnchorsAsync(${anchors.length} anchors)`);
        if(typeof anchors === undefined) return e(new Error("No anchors in sortAnchorsAsync"));
        if(typeof config === undefined) return e(new Error("No config loaded"));
        if(typeof config.include === undefined) return e(new Error("No config.include loaded"));
        if(typeof config.exclude === undefined) return e(new Error("No config.exclude loaded"));

        // Convert our provided strings into regexes (ignoring case)
        let createRegex = regexString => new RegExp(regexString, 'i');
        let includeRegexs = config.include.map(createRegex);
        let excludeRegexs = config.exclude.map(createRegex);

        // Structure to hold the sorted data
        let sorted = {
            include: [],
            exclude: [],
            unknown: []
        }
        
        // Function to check an anchor url and text against a regex
        let testRegex = (anchor, regex) => {
            let matchesUrl = regex.test(anchor.url);
            let matchesText = regex.test(anchor.text);
            if(debug.logRegexMatching){
                if(matchesUrl) console.log(`[+] Regex ${regex} matches url "${anchor.url}"`);
                if(matchesText) console.log(`[+] Regex ${regex} matches text "${anchor.text}"`);
            }
            return matchesUrl || matchesText;
        }

        try{
            anchors.forEach((anchor)=>{
                let testAnchor = testRegex.bind(null, anchor); // Bind on the anchor so we can inline the _.some call
                if(_.some(excludeRegexs, testAnchor)){
                    if(debug.logFilter) console.log(`[-] Exclude:\t "${anchor.text}"`);
                    sorted.exclude.push(anchor);
                }
                else if(_.some(includeRegexs, testAnchor)){
                    if(debug.logFilter) console.log(`[+] Include:\t "${anchor.text}"`);
                    sorted.include.push(anchor);
                }
                else{
                    if(debug.logFilter) console.log(`[?] Unknown:\t "${anchor.text}"`);
                    sorted.unknown.push(anchor);
                }
            });
        } catch(err){ 
            e(err); 
        }
        c(sorted);
    });

// From the sortedAnchors, convert the 'include' anchors into markdown
let createMarkdownAsync = sortedAnchors => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] createMarkdownAsync(${sortedAnchors.include.length} include anchors)`);
        if(typeof sortedAnchors === undefined) return e(new Error("No anchors in createMarkdownAsync"));
        if(typeof config === undefined) return e(new Error("No config loaded in createMarkdownAsync"));
        if(typeof config.markdownPreamble === undefined) return e(new Error("No config.markdownPreamble loaded in createMarkdownAsync"));

        // Take the include, and optionally the unknown
        let sourceList = [].concat(sortedAnchors.include);
        if(config.includeUnknown) {
            if(debug.logMarkdown) console.log(`[+] Including ${sortedAnchors.unknown.length} unknown anchors in markdown`);
            sourceList = sourceList.concat(sortedAnchors.unknown);
        }

        // Sort in order with the lowest index first (config.invertOrder switches the sorting order)
        sourceList = sourceList.sort((a, b)=> {return config.invertOrder ? b.index - a.index : a.index - b.index;});

        // Convert each anchor into a MD entry
        let outputMarkdown = "";
        try{
            outputMarkdown = sourceList.reduce((previous, anchor) => {
                return "" + previous + `* *(${anchor.hostname})* [${anchor.text}](${anchor.url})\n`;
            }, config.markdownPreamble);
        } catch(err){
            e(err);
        }

        if(debug.logMarkdown) console.log(`[*] ===== Output Markdown =====\n${outputMarkdown}\n[*] ==== /Output Markdown/ ====`);
        c(outputMarkdown);
    });

// Write the text in inputString to the file specified by config.input
let writeFileAsync = inputString => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] writeFileAsync(${config.output})`);
        if(typeof inputString === undefined) return e(new Error("No inputString in writeFileAsync"));
        if(typeof config === undefined) return e(new Error("config not loaded in writeFileAsync"));
        if(typeof config.output === undefined) return e(new Error("config.output not loaded in writeFileAsync"));

        let filePath = path.resolve(__dirname, config.output);
        if(debug.logReadWrite) console.log(`[+] Writing output to ${filePath}`);
        
        fs.writeFile(filePath, inputString, {flags: 'w'}, (err)=>{
            if(debug.logReadWrite) console.log(`[+] Writing output complete`);
            err ? e(err) : c();
        });
    });

// let anchorToString = (maxText, maxUrl, anchor) =>  
//     `${anchor.index} :\t${anchor.text.substring(0, maxText)} --\t${anchor.url.substring(0, maxUrl)}`;

// let printShort = anchorToString.bind(null, 50, 30);
// let printLong = anchorToString.bind(null, 1000, 1000);
// let printTextOnly = anchorToString.bind(null, 1000, 0);
// let printUrlOnly = anchorToString.bind(null, 0, 1000);

readFileAsync()
    .then(loadJsdomAsync)
    .then(scrapeAnchorsAsync)
    .then ( anchorsList => {
        console.log(`[+] Got ${anchorsList.length} anchors`);
        return anchorsList;
    })
    .then(sortAnchorsAsync)
    .then( sortedAnchors => {
        console.log(`[+] ${sortedAnchors.exclude.length} exclude items`);
        console.log(`[+] ${sortedAnchors.include.length} include items`);
        console.log(`[+] ${sortedAnchors.unknown.length} unknown items`);
        return sortedAnchors;
    })
    .then(createMarkdownAsync)
    .then(writeFileAsync)
    .then(()=>{
        console.log("[+] Complete");
    })
    .then(null, (err)=>{
        console.log("[-] Error");
        console.log(err);
    });