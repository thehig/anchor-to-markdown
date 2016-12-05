let generateConfig = ()=>{
    return {
        "inputFile": "../data/target.html",
        "output": "../data/target.md",
        "includeUnknownInMD": true,
        "includeEmptyHostname": false,
        "exclude": [ "mail", "netflix", "reddit"],
        "include": [ "react", "uwp"],
        "debugAllTheThings": false,
        "debug":{
            "logFn": false,
            "logScrape": true,
            "logRegexMatching": false,
            "logFilter": false,
            "logMarkdown": true,
            "logReadWrite": false,
            "verbose": false
        },
        
        "selector": "li",
        // scrape the text from the selected item
        scrape: (config, debug, $, index, value)=>{
            if(debug.verbose && debug.logFn) console.log(`[*] scrape($, ${index}, ${$(value).text()})`);
            if(debug.verbose && debug.logScrape) console.log(`[S] ${$(value).text()}`);
            return $(value).text();
        },

        // run the regex against the text
        regex: (config, debug, item, regex) => {
            if(debug.verbose && debug.logFn) console.log(`[*] regex(${item}, ${regex})`);
            if(debug.verbose && debug.logRegexMatching) console.log(`[R] ${regex.test(item)}`);
            return regex.test(item);
        },

        // Convert text into bullet point
        markdown: (config, debug, item) => {
            if(debug.verbose && debug.logMarkdown) console.log(`[M] ${item}`);
            return "* " + item + "\n";
        }
    }
}

module.exports = generateConfig();