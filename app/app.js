const   jsdom = require("jsdom")
        , fs = require('fs')
        , path = require('path')
        , _ = require('lodash')
        , config = require('../data/config.json');

const debugAllTheThings = true;                       // Enable all the debug outputs in one setting
const debug = {
    logFn: debugAllTheThings || false                 // Output the name of the function when called
    , logRegexMatching: debugAllTheThings || false    // Output the regex matching process
    , logFilter: debugAllTheThings || false           // Output include/exclude/unknown
    , logMarkdown: debugAllTheThings || false         // Output the markdown to the console
}

// Read file specified by config.input and return the file contents
let readFileAsync = () => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] readFileAsync()`);
        if(typeof config === undefined) return e(new Error("config not loaded in readFileAsync"));
        if(typeof config.input === undefined) return e(new Error("config.input not loaded in readFileAsync"));
        fs.readFile(path.resolve(__dirname, config.input), "utf-8", (err, data)=>{
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
        let $ = window.$;
        let titles = [];
        try{
            $('a').each((index, value)=>{
                let anchor = {
                    index: index,
                    url: $(value).attr('href'),
                    text: $(value).text(),
                    hostname: $(value).prop('hostname')
                };
                titles.push(anchor);
            });
        } catch(err){
            e(err);
        }
        c(titles);
    });

// Reverse the array of anchors
let reverseListAync = list => Promise.resolve(list.reverse());

// Filter the anchor collection by regexes in config.include and config.exclude
let filterAnchorsAsync = anchors => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] filterAnchorsAsync(${anchors.length} anchors)`);
        if(typeof anchors === undefined) return e(new Error("No anchors in filterAnchorsAsync"));
        if(typeof config === undefined) return e(new Error("No config loaded"));
        if(typeof config.include === undefined) return e(new Error("No config.include loaded"));
        if(typeof config.exclude === undefined) return e(new Error("No config.exclude loaded"));

        let createRegex = regexString => new RegExp(regexString, 'i');
        let includeRegexs = config.include.map(createRegex);
        let excludeRegexs = config.exclude.map(createRegex);
        let filtered = {
            include: [],
            exclude: [],
            unknown: []
        }
        
        let testRegex = (anchor, regex) => {
            let matchesUrl = regex.test(anchor.url);
            let matchesText = regex.test(anchor.text);
            if(debug.logRegexMatching){
                if(matchesUrl) console.log(`[*] Regex ${regex} matches url "${anchor.url}"`);
                if(matchesText) console.log(`[*] Regex ${regex} matches text "${anchor.text}"`);
            }
            return matchesUrl || matchesText;
        }

        try{
            anchors.forEach((anchor)=>{
                let matchesRegex = testRegex.bind(null, anchor);
                if(_.some(excludeRegexs, matchesRegex)){
                    if(debug.logFilter) console.log(`[-] Filter Excluding:\t "${anchor.text}"`);
                    filtered.exclude.push(anchor);
                }
                else if(_.some(includeRegexs, matchesRegex)){
                    if(debug.logFilter) console.log(`[+] Filter Including:\t "${anchor.text}"`);
                    filtered.include.push(anchor);
                }
                else{
                    if(debug.logFilter) console.log(`[?] Filter Unknown:\t "${anchor.text}"`);
                    filtered.unknown.push(anchor);
                }
            });
        } catch(err){ 
            e(err); 
        }
        c(filtered);
    });

// From the filteredAnchors, convert the 'include' anchors into markdown
let createMarkdownAsync = filteredAnchors => new Promise((c, e)=>{
        if(debug.logFn) console.log(`[*] createMarkdownAsync(${filteredAnchors.include.length} anchors)`);
        if(typeof filteredAnchors === undefined) return e(new Error("No anchors in createMarkdownAsync"));

        let outputMarkdown = "";
        try{
            outputMarkdown = filteredAnchors.include.reduce((previous, anchor) => {
                return "" + previous + `* *(${anchor.hostname})* [${anchor.text}](${anchor.url})\n`;
            }, "# Automated anchor filtration\n\n");
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
        fs.writeFile(path.resolve(__dirname, config.output), inputString, {flags: 'w'}, (err)=>{
            err ? e(err) : c();
        });
    });

// let anchorToString = (maxText, maxUrl, anchor) =>  
//     `${anchor.index} :\t${anchor.text.substring(0, maxText)} --\t${anchor.url.substring(0, maxUrl)}`;

// let printShort = anchorToString.bind(null, 50, 30);
// let printLong = anchorToString.bind(null, 1000, 1000);
// let printTextOnly = anchorToString.bind(null, 1000, 0);
// let printUrlOnly = anchorToString.bind(null, 0, 1000);


readFileAsync('../data/bookmarks.html')
    .then(loadJsdomAsync)
    .then(scrapeAnchorsAsync)
    .then ( anchorsList => {
        console.log(`[+] Got ${anchorsList.length} anchors`);
        return anchorsList;
    })
    .then(reverseListAync)
    .then(filterAnchorsAsync)
    .then( filteredAnchors => {
        console.log(`[+] ${filteredAnchors.exclude.length} exclude items`);
        console.log(`[+] ${filteredAnchors.include.length} include items`);
        console.log(`[+] ${filteredAnchors.unknown.length} unknown items`);
        return filteredAnchors;
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