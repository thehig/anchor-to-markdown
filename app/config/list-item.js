module.exports = {
    // scrape the text from the selected item
    scrape: (config, $, index, value)=>{
        if(config.debugAll || (config.verbose && config.logFn)) console.log(`[S] scrape($, ${index}, ${$(value).text()})`);
        if(config.debugAll || (config.verbose && config.logScrape)) console.log(`[*] ${$(value).text()}`);
        return {
            'text': $(value).text().trim()
        };
    },

    // run the regex against the text
    regex: (config, item, regex) => {
        if(config.debugAll || (config.verbose && config.logFn)) console.log(`[R] regex(${item}, ${regex})`);
        if(config.debugAll || (config.verbose && config.logRegex)) console.log(`[*] ${regex.test(item)}`);
        return regex.test(item);
    },

    // Convert sortedItems into bulletpoints
    markdown: (config, sortedItems) => {
        if(config.debugAll || config.logMarkdown) console.log(`[M] markdown(sortedItems)`);

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
            const addition = `* ${item.text}`;
            if(config.debugAll || (config.verbose && config.logMarkdown)) console.log(`[+] Created markdown for list item: ${addition}`);
            return "" + previous + addition + "\n";
        }, config.markdownPreamble);

        return outputMarkdown;
    }
}