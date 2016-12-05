let generateConfig = ()=>{
    return {
        "inputFile": "../data/target.html",
        "output": "../data/target.md",
        "includeUnknownInMD": true,
        "includeEmptyHostname": true,
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
        }
    }
}

module.exports = generateConfig();