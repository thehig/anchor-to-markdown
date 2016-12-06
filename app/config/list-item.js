module.exports = {
    // scrape the text from the selected item
    scrape: (config, $, index, value)=>{
        if(config.debugAll || (config.verbose && config.logFn)) console.log(`[S] scrape($, ${index}, ${$(value).text()})`);
        if(config.debugAll || (config.verbose && config.logScrape)) console.log(`[*] ${$(value).text()}`);
        return {
            'text': $(value)
                .text()
                .replace(/\t/g, '')             // Remove tabs
                .replace(/\n/g, '')             // Remove newlines
                .replace(/[^ -~]+/g, '')        // Remove any non-printable ascii characters (http://stackoverflow.com/questions/24229262/match-non-printable-non-ascii-characters-and-remove-from-text)
                .replace(/[\s]+/g, ' ')         // Replace any more than one space with a single space (inner-trim)
                .trim()
        };
    },

    // run the regex against the text
    regex: (config, item, regex) => {
        if(config.debugAll || (config.verbose && config.logFn)) console.log(`[R] regex(${item.text}, ${regex})`);

        let matchesText = regex.test(item.text);

        if(config.debugAll || config.logRegex) console.log(`[*] ${matchesText ? "Matched r" : "R"}egex ${regex} on "${item.text}"`);

        return matchesText;
    },

    // Convert sortedItems into bulletpoints
    markdown: (config, item) => {
        if(config.debugAll || (config.verbose && config.logFn)) console.log(`[M] markdown(${item.text})`);
        const addition = `* ${item.text}`;
        if(config.debugAll || config.logMarkdown) console.log(`[+] Created markdown: ${addition}`);
        return addition;
    }
}