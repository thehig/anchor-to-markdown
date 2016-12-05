
module.exports = {
        // Options for this module
        "anchor_includeEmptyHostname": false,
        
        // scrape a set of parameters from an item. index & text are required
        scrape: (config, $, index, value)=>{
            if(config.debugAll || (config.verbose && config.logFn)) console.log(`[S] scrape(${index})`);
            if(typeof config === undefined) return e(new Error("config not loaded in scrape"));

            // index & text are **REQUIRED** for sorting and filter tagging
            const item = {
                index: index,                           // Keep track of index for potential sorting later on
                text: $(value).text().trim(),
                url: $(value).attr('href'),
                hostname: $(value).prop('hostname')     // An empty hostname can be a relative local link on a page eg: '/home/home.html'
            };

            // Check for empty hostnames
            if(config.anchor_includeEmptyHostname || item.hostname !== undefined && item.hostname.length > 0) {
                if(config.debugAll || config.logScrape) console.log(`[+] Adding item: ${item.url}`);
                return item;
            } else {
                if(config.debugAll || config.logScrape) console.log(`[-] Ignoring item due to blank hostname in: ${item.url}`);
                return undefined;
            }
        },

        // check an items 'url' and 'text' against a regex
        regex: (config, item, regex) => {
            if(config.debugAll || (config.verbose && config.logFn)) console.log(`[R] anchorRegex(item, ${regex})`);
            const matchesUrl = regex.test(item.url);
            const matchesText = regex.test(item.text);
            if(config.debugAll || config.logRegex){
                if(matchesUrl) console.log(`[+] Regex ${regex} matches url "${item.url}"`);
                if(matchesText) console.log(`[+] Regex ${regex} matches text "${item.text}"`);
            }
            return matchesUrl || matchesText;
        },

        markdown: (config, sortedItems) =>{

            if(config.debugAll || (config.verbose && config.logFn)) console.log(`[M] markdown(sortedItems)`);
            // Take the include, and optionally the unknown
            let sourceList = [].concat(sortedItems.include);
            if(config.includeUnknown) {
                console.log(`[+] Including ${sortedItems.unknown.length} unknown items in markdown`);
                sourceList = sourceList.concat(sortedItems.unknown);
            }

            // Sort in order with the lowest index first (config.invertOutputOrder switches the sorting order)
            sourceList = sourceList.sort((a, b)=> {return config.invertOutputOrder ? b.index - a.index : a.index - b.index;});

            // Convert each item into a MD entry
            const outputMarkdown = sourceList.reduce((previous, item) => {
                const addition = `* *(${item.hostname})* [${item.text}](${item.url})`;
                if(config.debugAll || config.logMarkdown) console.log(`[+] Created markdown: ${addition}`);
                return "" + previous + addition + "\n";
            }, config.markdownPreamble);

            return outputMarkdown;
        }
}