
module.exports = {
        "selector": 'a',

        "logScrape": false,
        "logRegex": false,
        "logMarkdown": false,
        
        // scrape a set of parameters from an item. index & text are required
        scrape: (config, $, index, value)=>{
            if(config.debugAllTheThings || (config.verbose && config.logFn)) console.log(`[*] scrape($, ${index}, ${$(value).text()})`);
            if(typeof config === undefined) return e(new Error("config not loaded in scrape"));

            // index & text are **REQUIRED** for sorting and filter tagging
            const item = {
                index: index,                           // Keep track of index for potential sorting later on
                text: $(value).text(),
                url: $(value).attr('href'),
                hostname: $(value).prop('hostname')     // An empty hostname can be a relative local link on a page eg: '/home/home.html'
            };

            // Check for empty hostnames
            if(config.includeEmptyHostname || item.hostname !== undefined && item.hostname.length > 0) {
                if(config.debugAllTheThings || config.logScrape) console.log(`[+] Adding item: ${item.url}`);
                return item;
            } else {
                if(config.debugAllTheThings || config.logScrape) console.log(`[-] Ignoring item due to blank hostname in: ${item.url}`);
                return undefined;
            }
        },

        // check an items 'url' and 'text' against a regex
        regex: (config, item, regex) => {
            if(config.debugAllTheThings || (config.verbose && config.logFn)) console.log(`[*] anchorRegex(item, ${regex})`);
            const matchesUrl = regex.test(item.url);
            const matchesText = regex.test(item.text);
            if(config.debugAllTheThings || config.logRegex){
                if(matchesUrl) console.log(`[+] Regex ${regex} matches url "${item.url}"`);
                if(matchesText) console.log(`[+] Regex ${regex} matches text "${item.text}"`);
            }
            return matchesUrl || matchesText;
        },

        // Convert a given item into Markdown
        markdown: (config, item) => {
            if(config.debugAllTheThings || (config.verbose && config.logFn)) console.log(`[*] markdown(item)`);
            let markdown = `* *(${item.hostname})* [${item.text}](${item.url})\n`;
            if(config.debugAllTheThings || config.logMarkdown) console.log(`[+] Created markdown: ${markdown}`);
            return markdown;
        }
}