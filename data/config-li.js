let generateConfig = ()=>{
    return {
        "inputFile": "../data/target.html",
        "output": "../data/target.md",
        "includeUnknownInMD": true,

        "debugAllTheThings": true,

        "selector": "li",
        // scrape the text from the selected item
        scrape: (config, $, index, value)=>{
            if(config.verbose && config.logFn) console.log(`[*] scrape($, ${index}, ${$(value).text()})`);
            if(config.verbose && config.logScrape) console.log(`[S] ${$(value).text()}`);
            return $(value).text();
        },

        // run the regex against the text
        regex: (config, item, regex) => {
            if(config.verbose && config.logFn) console.log(`[*] regex(${item}, ${regex})`);
            if(config.verbose && config.logRegex) console.log(`[R] ${regex.test(item)}`);
            return regex.test(item);
        },

        // Convert text into bullet point
        markdown: (config, item) => {
            if(config.verbose && config.logMarkdown) console.log(`[M] ${item}`);
            return "* " + item + "\n";
        }
    }
}

module.exports = generateConfig();