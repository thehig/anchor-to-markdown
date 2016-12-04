const   jsdom = require("jsdom"),
        fs = require('fs'),
        path = require('path'),
        config = require('../data/config.json');


let readFileAsync = url =>
    new Promise((c, e)=>{
        if(typeof url === undefined) e(new Error("No url to load"));
        fs.readFile(path.resolve(__dirname, url), "utf-8", (err, data)=>{
            err ? e(err) : c(data);
        });
    });

let loadJsdomAsync = html =>
    new Promise((c, e)=>{
        if(typeof html === undefined) e(new Error("No HTML for JSDOM"));
        jsdom.env(html, ["http://code.jquery.com/jquery.js"], (err, window)=>{
            err ? e(err) : c(window);
        });
    });

let scrapeBookmarksAsync = window =>
    new Promise((c, e)=>{
        if(typeof window === undefined) e(new Error("No window from JSDOM"));
        if(typeof window.$ === undefined) e(new Error("No jquery in window from JSDOM"));
        let $ = window.$;
        let titles = [];
        try{
            $('a').each((index, value)=>{
                titles.push({
                    index: index,
                    url: $(value).attr('href'),
                    text: $(value).text()
                });
            });
        }catch(err){
            e(err);
        }
        c(titles);
    });

let filterBookmarksAsync = bookmarks =>
    new Promise((c, e)=>{
        if(typeof bookmarks === undefined) e(new Error("No bookmarks from scrapeBookmarksAsync"));
        if(typeof config === undefined) e(new Error("No config loaded"));
        let includeRegex = new RegExp(config.include, 'i'); // Ignore case
        let excludeRegex = new RegExp(config.exclude, 'i'); // Ignore case
        let filtered = {
            include: [],
            exclude: [],
            unknown: []
        }

        try{
            bookmarks.forEach((bookmark)=>{
                if(includeRegex.test(bookmark.url) || includeRegex.test(bookmark.text)) 
                    filtered.include.push(bookmark);
                else if(excludeRegex.test(bookmark.url) || excludeRegex.test(bookmark.text)) 
                    filtered.exclude.push(bookmark);
                else
                    filtered.unknown.push(bookmark);
            });
        }
        catch(err){ 
            e(err); 
        }
        c(filtered);
    });

let printBookmark = (maxText, maxUrl, bookmark) => `${bookmark.index} :\t${bookmark.text.substring(0, maxText)} --\t${bookmark.url.substring(0, maxUrl)}`;

let printShort = printBookmark.bind(null, 50, 30);
let printLong = printBookmark.bind(null, 1000, 1000);
let printTextOnly = printBookmark.bind(null, 1000, 0);
let printUrlOnly = printBookmark.bind(null, 0, 1000);

let createMarkdownAsync = filteredBookmarks =>
    new Promise((c, e)=>{
        if(typeof filteredBookmarks === undefined) e(new Error("No bookmarks from filterBookmarksAsync"));

        let outputMarkdown = "# Automated bookmark filtration\n\n";
        try{
            filteredBookmarks.include.forEach((inc)=>{
                outputMarkdown += `* [${inc.text}](${inc.url})\n`;
            });
        } catch(err){
            e(err);
        }

        c(outputMarkdown);
    });

let outputMarkdownAsync = markdownText =>
    new Promise((c, e)=>{
        if(typeof markdownText === undefined) e(new Error("No markdownText from createMarkdownAsync"));
        fs.writeFile(path.resolve(__dirname, '../data/bookmarks.md'), markdownText, {flags: 'w'}, (err)=>{
            err ? e(err) : c();
        });
    });

readFileAsync('../data/bookmarks.html')
    .then(loadJsdomAsync)
    .then(scrapeBookmarksAsync)
    .then(filterBookmarksAsync)
    .then(createMarkdownAsync)
    .then(outputMarkdownAsync)
    .then(()=>{
        console.log("[+] Success");
    })
    .then(null, (err)=>{
        console.log("[-] Error");
        console.log(err);
    });