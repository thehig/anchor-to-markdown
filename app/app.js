const   version                     = require('../package.json').version
        , chalk                     = require('chalk')
        , optparse                  = require('optparse');


// Ensure chalk coloring is enabled
chalk.enabled = true;

// Configuration files for each selector
const selectorConfigs = {
    'a': require('./config/anchor.js')
    , 'li': require('./config/list-item.js')
}

parseOptsAsync = ()=> new Promise((c, e)=>{
        let promptConfig = {};

        // Switches for optparse
        const switches = [

            ['-i', '--input INPUTFILE', 'Input file to be processed']
            , ['-o', '--output OUTPUTFILE', 'Output file to write to']
            
            , ['-u', '--url URL', 'URL to site to process']
            , ['-s', '--selector SELECTOR', 'CSS selector to scrape for']

            , ['-c', '--config CONFIGFILE', 'Config file to read from (Overrides switches)']

            , ['-d', '--debug', 'Enable all debug flags']
            , ['-v', '--verbose', 'More output']
            , ['-h', '--help', 'Display this help document']
        ];

        const parser = new optparse.OptionParser(switches);
        parser.banner = "Usage:\tTBC [OPTIONS]\n\teg:\tTBC";
        parser.options_title = `=== Item to Markdown v${version} ===\n`;

        // Show optparse usage and exit
        showUsage = (code, msg) => {
            let error = new Error("Error parsing options");
            error._code = code || 0;
            error._usage = parser.toString();
            error._message = msg;
            e(error);
        }


        parser.on('input', (k, v) => { promptConfig.inputFile = v; });
        parser.on('output', (k, v) => { promptConfig.output = v; });
        parser.on('url', (k, v) => { promptConfig.inputUrl = v; });
        parser.on('selector', (k, v) => { promptConfig.selector = v; });
        parser.on('config', (k, v) => { promptConfig.configurl = v; });

        parser.on('verbose', ()=> { promptConfig.verbose = true; });
        parser.on('debug', ()=> { promptConfig.debugAll = true; });
        parser.on('help', showUsage);

        parser.on(opt=> {
            // Catch any unhandled switches and exit
            showUsage(-1, `No handler for option ${opt}`);
        });

        // If there are no arguments, showUsage
        if(process.argv.length <= 2) showUsage(-1, "Insufficient arguments");

        try{
            parser.parse(process.argv);

            // If the user specified a config file, load it now and smear it across the prompt data
            if(promptConfig.hasOwnProperty("configurl")){
                const userSpecifiedConfig = process.cwd() + "\\" + promptConfig.configurl;
                console.log(`[+] Loading config from file ${userSpecifiedConfig}`);
                let configFromFile = require(userSpecifiedConfig);
                Object.assign(promptConfig, configFromFile);
            }
        } catch(err){
            showUsage(-1, `Unable to parse options: ${err}`);
        }
        c(promptConfig);
    });

initializeLibraryAsync = (promptConfig)=> new Promise((c, e)=>{
        let buildingConfig = {};

        // Smear the default config and prompt configs
        const defaultConfig = require('./config/default.js');
        Object.assign(buildingConfig, defaultConfig, promptConfig);

        // Attempt to load the config file for the specified selector
        let selectorConfig = selectorConfigs[buildingConfig.selector];
        if(!selectorConfig) return e(`No selector provided. Valid selectors:\n\t${Object.keys(selectorConfigs).join(', ')}`);

        // Apply any appropriate settings from the selector config
        Object.assign(buildingConfig, selectorConfig);

        const lib = require('./anchor2markdown.js')(buildingConfig, selectorConfig.scrape, selectorConfig.regex, selectorConfig.markdown);
        c(lib);
    });

invokeLibraryAsync = (lib)=> {
    return lib.processConfigAsync()
            // .then(lib.readFileAsync)
            .then(lib.loadJsdomAsync)
            .then(lib.gatherItemsAsync)
            .then(lib.filterItemsAsync)
            .then(lib.sortAndMergeItemsAsync)
            .then(lib.createMarkdownAsync)
            .then(lib.writeFileAsync);
}

// -- Main --
parseOptsAsync()
    .then(initializeLibraryAsync)
    .then(invokeLibraryAsync)
    .then((markdown)=>{
        console.log(`[+] Generated markdown (${markdown.length} characters)`);
    })
    .then(null, (err)=>{
        if(err.hasOwnProperty("_message") && err.hasOwnProperty("_code")){
            // This error came from opts parsing
            console.log(`[-] Error (${err._code}): ${err._message}`);
            if(err.hasOwnProperty("_usage")) console.log(err._usage);
        } else {
            console.log(`[-] Error:`);
            console.log(err);
        }        
    });