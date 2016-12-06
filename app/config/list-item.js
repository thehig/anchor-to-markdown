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
        if(config.debugAll || (config.verbose && config.logFn)) console.log(`[R] regex(${item.text}, ${regex})`);
        if(config.debugAll || (config.verbose && config.logRegex)) console.log(`[*] ${regex.test(item)}`);
        return regex.test(item);
    },

    // Convert sortedItems into bulletpoints
    markdown: (config, item) => {
        if(config.debugAll || (config.verbose && config.logFn)) console.log(`[M] markdown(${item.text})`);
        const addition = `* ${item.text}`;
        if(config.debugAll || config.logMarkdown) console.log(`[+] Created markdown: ${addition}`);
        return addition;
    }
}