// imports
const {program} = require("commander");
const {Contentfully, ContentfulClient} = require("../dist");


// define cli
program.version("0.0.1");
program
    .requiredOption("-t, --token <value>", "your accessToken")
    .requiredOption("-s, --space <value>", "a space ID")
    .option("-e, --env <value>", "an environment", "master")
    .option("-p, --preview", "use preview server");


// print command
program
    .command("getModels <type> [destination]")
    .description("gets all entities of a type")
    .action((type, destination) => {
        if (destination) {
            console.log(`downloading all "${type}" models to "${destination}"`);
        }
        else {
            console.log(`printing all "${type}" models`);
        }
    });

// execute cli
program.parse(process.argv);

if (program.args.length <= 1) {
    program.help();
}

