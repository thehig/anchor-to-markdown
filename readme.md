# Anchor to Markdown converter 0.0.9

## Usage

> `./data/` folder is added to gitignore to ensure potentially sensitive bookmarks and/or configs are not accidentally committed. The application **will not work** without providing a data folder with config.json and target.html

##### Converting Chrome History to HTML

* Navigate to the Chrome History (chrome://history/) page
* Inspect an element on the page to bring up the chrome dev tools
* Find the div labeled '#results-display'
* Right click and copy the entire element into a text editor
* Repeat if you want to aggregate more than one history page
* Wrap your copied divs into a single html page
* Save the HTML into `./data/target.html`

##### Converting HTML to Markdown

* Create a `./data/config.json` file to specify your include regexes, exclude regexes, file inputs & outputs
* Navigate to the root of the project and run `npm install` followed by `npm start`

**Simplest (useful) config.js possible:**

> Will extract all anchors, convert to object format and output to markdown file

```javascript
{
    "inputFile": "../data/target.html",
    "output": "../data/target.md",
    "includeUnknownInMD": true
}
```

#### Showing specific fields using **logFilter**

* In the config.js set `logFilter` to true
* Grep the output based on the line preamble

Command | Filters
:--- | :---
`npm start | grep '^\[?\] Unknown'` |`[?] Unknown`
`npm start | grep '^\[\-\] Exclude'` |`[-] Exclude`
`npm start | grep '^\[+\] Include'` |`[+] Include`

--- 

## config.js

### Example

> Include and Exclude are regexes that will be matched (ignoring case) against an individual anchor url and text. Exclude is matched before include

**Note:** the inputFile and output locations are relative to the `/app/` folder

```javascript
{
    "inputFile": "../data/target.html",
    "output": "../data/target.md",
    "selector": "a",
    "includeUnknownInMD": false,
    "includeEmptyHostname": false,
    "exclude": [ "mail", "netflix", "reddit"],
    "include": [ "react", "uwp"],
    "debugAllTheThings": false,
    "debug":{
        "logFn": false,
        "logScrape": false,
        "logRegexMatching": false,
        "logFilter": false,
        "logMarkdown": false,
        "logReadWrite": false,
        "verbose": false
    }
}
```

### Config Parameters

Parameter | Effect | Default
:--- | :--- | :---
selector | Items to select from the DOM for scraping | `'a'`
exclude | Array of regexes to exclude from output | `[]`
include | Array of regexes to include in output | `[]`
includeUnknown | Toggle inclusion of unknown items | `false`
includeEmptyHostname | Toggle inclusion of items with unknown hostname | `false`
includeUnknownInMD | Toggle inclusion of items from the unknown category in the markdown output | `false`
inputFile | File to read from | **REQUIRED**
output | File to write to | **REQUIRED**
markdownPreamble | What to write at the top of the markdown | `# Automated Item extraction\n\n`


### Debug Parameters

Parameter | Effect
:--- | :---
debugAllTheThings | Toggle all debug flags in one go (excluding verbose)
logFn | Log the name of the function when called
logScrape | Log the scrape process of whats included or excluded
logRegexMatching | Log the regex matching process
logFilter | Log filter include/exclude/unknown
logMarkdown | Log the markdown to the console
logReadWrite | Log the read and write targets
verbose | Log more verbose output

---

## target.html

### Example target.html

> Script will locate and scrape all <a> (by default) urls and text

```html
<!DOCTYPE html>
<html>
<head>
    <title></title>
</head>
<body>
    <div class="title"><a href="file:///C:/Users/David/Desktop/Bookmarks.html" id="id-0" target="_top" title="file:///C:/Users/David/Desktop/Bookmarks.html" focus-type="title" tabindex="0">file:///C:/Users/David/Desktop/Bookmarks.html</a></div>
</body>
</html>
```

---

## Future plans

* Add prompt support to allow for useful invoking from CLI
* Add support for passing in a URI to suck out links
* Remove dependance on jQuery http request