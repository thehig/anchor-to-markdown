const   jsdom = require("jsdom")
        , fs = require('fs')
        , path = require('path')
        , _ = require('lodash');

const getAbsolutePathFrom = (param) => path.resolve(process.cwd(), param); // TODO: Needs work. Not quite right

const processConfigAsync = (config) => new Promise((c, e)=>{
        if(config.debugAll || config.logFn) console.log(`[*] processConfigAsync()`);

        // Check the input and output
        if(typeof config === "undefined") return e(new Error("config not loaded in processConfigAsync"));
        if((typeof config.inputFile === "undefined") && typeof config.inputUrl === "undefined") return e(new Error("config.inputFile and config.inputUrl not loaded in processConfigAsync"));
        if(typeof config.output === "undefined") return e(new Error("config.output not loaded in processConfigAsync"));

        // Check we have a selector
        if(typeof config.selector === "undefined") return e(new Error("No config.selector loaded in processConfigAsync"));

        // Check we have a way to scrape, regex and markdown the results of the selector
        if(typeof config.scrape !== "function") return e(new Error("No config.scrape in processConfigAsync"));
        if(typeof config.regex !== "function") return e(new Error("No config.regex in processConfigAsync"));
        if(typeof config.markdown !== "function") return e(new Error("No config.markdown in processConfigAsync"));

        // Don't show 'false' items in the config unless verbose is enabled
        const filterJson = (key, value)=> {
            if(config.verbose) return value;
            return value === false ? undefined : value;
        }

        try{
            // Print the config
            if(config.debugAll || config.logConfig) console.log(`[+] Config:\n${JSON.stringify(config, filterJson, 4)}`);
        } catch(err){
            e(err);
        }
        c();
    });

// Read file specified by config.input and return the file contents
const readFileAsync = (config) => new Promise((c, e)=>{
        if(config.debugAll || config.logFn) console.log(`[*] readFileAsync()`);
        if(typeof config === "undefined") return e(new Error("config not loaded in readFileAsync"));
        if(typeof config.inputFile === "undefined") return e(new Error("config.inputFile not loaded in readFileAsync"));

        const filePath = getAbsolutePathFrom(config.inputFile);
        if(config.debugAll || config.logReadWrite) console.log(`[+] Reading input from ${filePath}`);
        fs.readFile(filePath, "utf-8", (err, data)=>{
            if(config.debugAll || config.logReadWrite) console.log(`[+] Reading input complete ()`);
            err ? e(err) : c(data);
        });
    });
    
// Load in, inject jquery, create and return the DOM
const loadJsdomAsync = (config) => new Promise((c, e)=>{
        if(config.debugAll || config.logFn) console.log(`[*] loadJsdomAsync()`);
        if(typeof config === "undefined") return e(new Error("No config loaded in loadJsdomAsync"));
        if((typeof config.inputFile === "undefined") && (typeof config.inputUrl === "undefined")) return e(new Error("No config.inputFile or config.inputUrl loaded in loadJsdomAsync"));

        const jquery = fs.readFileSync('./app/lib/jquery.js', 'utf-8').toString();
        let jsdomConfig = {
            src: [jquery],
            done: (err, window)=> err ? e(err) : c(window)
        }

        if(config.inputUrl) {
            console.log(`[+] Loading jsdom from url: ${config.inputUrl}`);
            jsdomConfig.url = config.inputUrl;
            jsdom.env(jsdomConfig);
        } else if(config.inputFile){
            console.log(`[+] Loading jsdom from file: ${getAbsolutePathFrom(config.inputFile)}`);
            readFileAsync(config).then((html)=>{
                jsdomConfig.html = html;
                jsdom.env(jsdomConfig);
            }, e);
        } else {
            return e(new Error("Unknown input in loadJsdomAsync"));
        }
    });

// Use jQuery to convert all <a> into objects
const gatherItemsAsync = (config, scrapeItemFn, window) => new Promise((c, e)=>{
        if(config.debugAll || config.logFn) console.log(`[*] gatherItemsAsync(window)`);
        if(typeof scrapeItemFn !== "function") return e(new Error("No scrapeItemFn in gatherItemsAsync"));
        if(typeof window === "undefined") return e(new Error("No window in gatherItemsAsync"));
        if(typeof window.$ === "undefined") return e(new Error("No jquery in gatherItemsAsync"));
        if(typeof config === "undefined") return e(new Error("No config loaded in gatherItemsAsync"));
        if(typeof config.selector === "undefined") return e(new Error("No config.selector loaded in gatherItemsAsync"));
        const $ = window.$;
        let items = [];
        try{
            if(config.debugAll || config.logGather) console.log(`[+] Gathering '${config.selector}' from  'window'`);
            let scrapedItems = $(config.selector);
            if(config.debugAll || config.logGather) console.log(`[+] Gathered ${scrapedItems.length} items`);
            scrapedItems.each((index, value)=>{
                var item = scrapeItemFn($, index, value);
                // No item -> Skip
                if(!item) return;
                // Item without text -> Error
                if(!item.hasOwnProperty('text')) return e(new Error("[-] All items returned from scrape must have a text parameter"));
                // 'valid' item -> Push
                items.push(item);
            });
        } catch(err){
            e(err);
        }
        if(config.debugAll || config.logGather) console.log(`[+] Gathered '${items.length}' after scraping`);
        c(items);
    });

// Filter the item collection by regexes in config.include and config.exclude
const filterItemsAsync = (config, regexTestFn, items) => new Promise((c, e)=>{
        if(config.debugAll || config.logFn) console.log(`[*] filterItemsAsync(${items.length} items)`);
        if(typeof regexTestFn !== "function") return e(new Error("No regexTestFn in filterItemsAsync"));
        if(typeof items === "undefined") return e(new Error("No items in filterItemsAsync"));
        if(typeof config === "undefined") return e(new Error("No config loaded"));
        if(typeof config.include === "undefined") return e(new Error("No config.include loaded in filterItemsAsync"));
        if(typeof config.exclude === "undefined") return e(new Error("No config.exclude loaded in filterItemsAsync"));

        // Convert our provided strings into regexes (ignoring case)
        const createRegex = regexString => new RegExp(regexString, 'i');
        const includeRegexs = config.include.map(createRegex);
        const excludeRegexs = config.exclude.map(createRegex);

        // Structure to hold the filtered data
        let filtered = {
            include: [],
            exclude: [],
            unknown: []
        }

        if(config.debugAll || config.logFilter) console.log(`[*] Filtering ${items.length} using ${excludeRegexs.length} exclude and ${includeRegexs.length} include regexes`);
        
        try{
            items.forEach((item)=>{
                // Use the regexTestFn
                const testItem = regexTestFn.bind(null, item); // Bind on the item so we can inline the _.some call
                if(_.some(excludeRegexs, testItem)){
                    if(config.debugAll || config.logFilter) console.log(`[-] Exclude:\t"${item.text}"`);
                    filtered.exclude.push(item);
                }
                else if(_.some(includeRegexs, testItem)){
                    if(config.debugAll || config.logFilter) console.log(`[+] Include:\t"${item.text}"`);
                    filtered.include.push(item);
                }
                else{
                    if(config.debugAll || config.logFilter) console.log(`[?] Unknown:\t"${item.text}"`);
                    filtered.unknown.push(item);
                }
            });
        } catch(err){ 
            e(err); 
        }

        if(config.debugAll || config.logFilter) {
            console.log(`[+] Filtered items:`);
            console.log(`\texclude: ${filtered.exclude.length}`);
            console.log(`\tinclude: ${filtered.include.length}`);
            console.log(`\tunknown: ${filtered.unknown.length}`);
        }

        c(filtered);
    });


const sortAndMergeItemsAsync = (config, sortedItems) => new Promise((c, e) =>{
        if(config.debugAll || config.logFn) console.log(`[*] sortAndMergeItemsAsync()`);
        if(typeof sortedItems === "undefined") return e(new Error("No items in sortAndMergeItemsAsync"));
        if(typeof config === "undefined") return e(new Error("No config loaded"));

        let sourceList = [].concat(sortedItems.include);
        if(config.includeUnknown) {
            console.log(`[+] Including ${sortedItems.unknown.length} unknown items in markdown`);
            sourceList = sourceList.concat(sortedItems.unknown);
        }

        // Sort in order with the lowest index first (config.invertOutputOrder switches the sorting order)
        if(config.debugAll || config.logSort) console.log(`[+] Sorting in ${config.invertOutputOrder ? 'ascending' : 'descending'} order`);
        c(sourceList.sort((a, b)=> {return config.invertOutputOrder ? b.index - a.index : a.index - b.index;}));
    });

// Convert the items into markdown
const createMarkdownAsync = (config, convertToMarkdownFn, items) => new Promise((c, e)=>{
        if(config.debugAll || config.logFn) console.log(`[*] createMarkdownAsync(items)`);
        if(typeof convertToMarkdownFn !== "function") return e(new Error("No convertToMarkdownFn in createMarkdownAsync"));
        if(typeof items === "undefined") return e(new Error("No items in createMarkdownAsync"));
        if(typeof config === "undefined") return e(new Error("No config loaded in createMarkdownAsync"));
        if(typeof config.markdownPreamble === "undefined") return e(new Error("No config.markdownPreamble loaded in createMarkdownAsync"));
        if(typeof config.markdownPostamble === "undefined") return e(new Error("No config.markdownPostamble loaded in createMarkdownAsync"));

        if(config.debugAll || config.logCreateMD) console.log(`[+] Creating markdown from items`);

        // Convert each item into a MD entry
        let outputMarkdown = items.reduce((previous, item) => {
            let markdown = convertToMarkdownFn(item);
            return "" + (markdown ? previous + markdown : previous) + "\n";
        }, config.markdownPreamble);

        outputMarkdown += config.markdownPostamble;

        if(config.debugAll || config.logCreateMD) console.log(`[*] ===== Output Markdown =====\n${outputMarkdown}[*] ==== /Output Markdown/ ====`);
        c(outputMarkdown);
    });

// Write the text in inputString to the file specified by config.input
const writeFileAsync = (config, inputString) => new Promise((c, e)=>{
        if(config.debugAll || config.logFn) console.log(`[*] writeFileAsync(${inputString.length} characters)`);
        if(typeof inputString === "undefined") return e(new Error("No inputString in writeFileAsync"));
        if(typeof config === "undefined") return e(new Error("config not loaded in writeFileAsync"));
        if(typeof config.output === "undefined") return e(new Error("config.output not loaded in writeFileAsync"));

        const filePath = getAbsolutePathFrom(config.output);
        if(config.debugAll || config.logReadWrite) console.log(`[+] Writing output to ${filePath}`);
        
        fs.writeFile(filePath, inputString, {flags: 'w'}, (err)=>{
            if(config.debugAll || config.logReadWrite) console.log(`[+] Writing output complete`);
            err ? e(err) : c(inputString);
        });
    });


module.exports = (config, scrapeItemFn, regexTestFn, convertToMarkdownFn)=>{
    // Bind all the functions to the config
    myScrapeItemFn = scrapeItemFn.bind(null, config);
    myRegexTestFn = regexTestFn.bind(null, config);
    myConvertToMarkdownFn = convertToMarkdownFn.bind(null, config);
    return {
        processConfigAsync: processConfigAsync.bind(null, config),
        readFileAsync: readFileAsync.bind(null, config),
        loadJsdomAsync: loadJsdomAsync.bind(null, config),
        gatherItemsAsync: gatherItemsAsync.bind(null, config, myScrapeItemFn),
        filterItemsAsync: filterItemsAsync.bind(null, config, myRegexTestFn),
        sortAndMergeItemsAsync: sortAndMergeItemsAsync.bind(null, config),
        createMarkdownAsync: createMarkdownAsync.bind(null, config, myConvertToMarkdownFn),
        writeFileAsync: writeFileAsync.bind(null, config)
    };
};