# Automated Chrome bookmark filter 0.0.5

## Usage

> `./data/` folder is added to gitignore to ensure potentially sensitive bookmarks and/or configs are not accidentally committed. The application **will not work** without providing a data folder with config.js and bookmarks.html

* Navigate to the [Chrome History](chrome://history/) page
* Inspect an element on the page to bring up the chrome dev tools
* Find the div labeled '#results-display'
* Right click and copy the entire element into a text editor
* Repeat if you want to aggregate more than one history page
* Wrap your copied divs into a single html page
* Remove any colliding IDs
* Save the HTML into `./data/bookmarks.html`
* Create a `./data/config.json` file to specify your include and exclude filters
* Navigate to the root of the project and run `npm install` followed by `npm start`

### Example Bookmarks.html

> Script will locate and scrape all <a> urls and text

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

### Example config.json

> Include and Exclude are regexes that will be matched (ignoring case) against an individual bookmarks url and text. Exclude is matched before include

```json
{
    "inputFile": "../data/bookmarks.html",
    "output": "../data/bookmarks.md",
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
