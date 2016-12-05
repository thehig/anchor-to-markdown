const   jsdom = require("jsdom")
        , fs = require('fs')
        , path = require('path')
        , _ = require('lodash');

// Read file specified by config.input and return the file contents
const readFileAsync = (config, debug) => new Promise((c, e)=>{
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
const loadJsdomAsync = (config, debug, html) => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] loadJsdomAsync()`);
        if(typeof html === undefined) return e(new Error("No HTML in loadJsdomAsync"));
        jsdom.env(html, ["http://code.jquery.com/jquery.js"], (err, window)=>{
            err ? e(err) : c(window);
        });
    });

// Use jQuery to convert all <a> into objects
const scrapeItemsAsync = (config, debug, scrapeItemFn, window) => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] scrapeItemsAsync()`);
        if(typeof scrapeItemFn !== "function") return e(new Error("No scrapeItemFn in scrapeItemsAsync"));
        if(typeof window === undefined) return e(new Error("No window in scrapeItemsAsync"));
        if(typeof window.$ === undefined) return e(new Error("No jquery in scrapeItemsAsync"));
        if(typeof config === undefined) return e(new Error("No config loaded in scrapeItemsAsync"));
        if(typeof config.selector === undefined) return e(new Error("No config.selector loaded in scrapeItemsAsync"));
        const $ = window.$;
        let items = [];
        try{
            if(debug.logScrape) console.log(`[+] Scraping 'window' for '${config.selector}'`);
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
const regexItemsAsync = (config, debug, regexTestFn, items) => new Promise((c, e)=>{
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
const createMarkdownAsync = (config, debug, convertToMarkdownFn, sortedItems) => new Promise((c, e)=>{
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
const writeFileAsync = (config, debug, inputString) => new Promise((c, e)=>{
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


module.exports = (config, debug)=>{
    // Bind all the functions to the config & debug
    return {
        readFileAsync: readFileAsync.bind(null, config, debug),
        loadJsdomAsync: loadJsdomAsync.bind(null, config, debug),
        scrapeItemsAsync: scrapeItemsAsync.bind(null, config, debug),
        regexItemsAsync: regexItemsAsync.bind(null, config, debug),
        createMarkdownAsync: createMarkdownAsync.bind(null, config, debug),
        writeFileAsync: writeFileAsync.bind(null, config, debug)
    };
};