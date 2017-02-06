"use strict";

/**
 * Copyright 2017 XcooBee LLC

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const chalk = require("chalk");

const runTest = (argv, callback) => {
    const path = require("path");
    const fs = require("fs-extra");
    const util = require("./util");

    // The default path to the parameters.json file, not necessary it exists
    let parametersFilePath = path.resolve("./parameters.json");

    // The default path for the workFiles and output directories
    let outputPath = path.resolve(".");

    // The full path to workFiles directory
    let workFilesPath = null;

    // The full path to output directory
    let outputFilesPath = null;

    // The default ttl, changes with size
    let ttl = 30000;
    // How long have we been running?
    let ellapsed = 0;

    // The amount of time reserved for clean up tasks
    const timeToCleanUp = 5000;

    // Track the number of open write streams
    const streamArray = [];

    // Flag to determine if the bee timed-out
    let callbackCalled = false;

    // mail object to be written
    const mailObject = {
        mail: [],
    };

    // log object to be written
    const logObject = {
        logs: [],
    };

    // processing object to be written
    const processingObject = {
        params: [],
    };

    const closeStreams = () => {
        streamArray.forEach((value) => {
            value.close();
        });
    };

    let globalSequence = 1;
    const getNextId = () => {
        const current = globalSequence;
        globalSequence += 1;
        return current;
    };

    const createServices = (inputFilePath) => {
        // TODO: Validation for fileName, what should happen if the user requests a writeStream for an
        // already created fileName
        // Create the services object
        const readStream = fs.createReadStream(inputFilePath);
        const services = {
            // Just log a message to the system console
            log: (message, type) => {
                logObject.logs.push({ date: Date.now(), type, message });
            },
            // email service to mock the sending of an email
            mail: (recipient, template, replacement) => {
                mailObject.mail.push({ recipient, template, replacement });
            },
            getNextId,
            addParam: (key, value) => {
                processingObject.params.push({ key, value });
            },
            timeToRun: () => ttl - ellapsed,
            // The default streams for reading and writing
            readStream: () => readStream,
            // TODO: Should overwrite the files
            writeStreamManager: {
                getWriteStream: (fileName, type) => {
                    const filesBlackList = ["xcoobeemail.json",
                        "xcoobeelog.json",
                        "xcoobeeparam.json",
                    ];

                    if (filesBlackList.indexOf(fileName.toLowerCase()) !== -1) {
                        return callback(Error(`Attempted to use reserved file name '${fileName}'`));
                    }

                    const typePath = type === "wip" ? "workFiles" : "output";
                    const stream = fs.createWriteStream(`${outputPath}${path.sep}${typePath}${path.sep}${fileName}`);
                    streamArray.push(stream);
                    return stream;
                },
                getReadStream: (fileName, type) => {
                    const typePath = type === "wip" ? "workFiles" : "output";
                    const stream = fs.createReadStream(`${outputPath}${path.sep}${typePath}${path.sep}${fileName}`);
                    return stream;
                },
            },
        };

        return services;
    };

    const showHelp = argv.indexOf("--help") !== -1;
    if (showHelp) {
        const marked = require("marked");
        const TerminalRenderer = require("marked-terminal");
        marked.setOptions({
            renderer: new TerminalRenderer(),
            gfm: true,
            tables: true,
            breaks: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false,
        });
        const helpText = fs.readFileSync("./src/assets/help.md");
        console.log(marked(helpText.toString("utf8")));
        return callback();
    }

    const overWriteFiles = argv.indexOf("-o") !== -1;

    // Assume we are on the node project directory
    // unless otherwise specified by the --bee switch
    let beeModule = null;
    try {
        const beeIndex = argv.indexOf("--bee");
        if (beeIndex !== -1) {
            const pathToBee = path.resolve(argv[beeIndex + 1]);
            beeModule = require(pathToBee);
        } else {
            // TODO: Don't rely on cwd
            beeModule = require(process.cwd());
        }
    } catch (err) {
        callback(new Error("It was not possible to load the bee, make sure you are inside a valid node project or use the '--bee' switch"));
    }

    // Set the size instance in which this bee will be run
    // We use the size to, among other things, choose the proper ttl
    const sizeIndex = argv.indexOf("--size");
    let size = "s";
    if (sizeIndex !== -1) {
        const validSizes = ["s", "m", "l"];
        size = argv[sizeIndex + 1].toLowerCase();

        if (validSizes.indexOf(size) === -1) {
            callback(new Error(`'${size}' is not a valid size, must be one of [s, m, l]`));
        }

        if (size === "s") {
            ttl = 30000;
        } else if (size === "m") {
            ttl = 150000;
        } else {
            ttl = 300000;
        }
    }

    // Substract the timeToCleanUp from ttl to get the net time the bee got available
    ttl -= timeToCleanUp;

    // If no params file are provided we assume the bee won't require integrations
    // nor parameters, unless the '--params' flag is used in which case it is, probably,
    // an user error pointing to an unexistent file
    const paramsIndex = argv.indexOf("--params");
    if (paramsIndex !== -1) {
        parametersFilePath = path.resolve(argv[paramsIndex + 1]);

        if (!fs.existsSync(parametersFilePath)) {
            callback(Error(`${parametersFilePath} doesn't exist`));
        }
    }

    // If the user specifies the output as a directory, use a default file name 'output' with no extension
    // The output directory must exists, the utility WON'T create it
    const outputIndex = argv.indexOf("--out");
    if (outputIndex !== -1) {
        outputPath = path.resolve(argv[outputIndex + 1]);

        // TODO: A way to create the hierarchy
        if (!fs.existsSync(outputPath)) {
            callback(new Error(`${outputPath} is not a valid directory`));
        }

        const stats = fs.lstatSync(outputPath);

        if (!stats.isDirectory()) {
            callback(new Error(`${outputPath} is not a valid directory`));
        }
    }

    // Be extremely careful to not delete a sensitive folder
    outputFilesPath = `${outputPath}${path.sep}output`;
    workFilesPath = `${outputPath}${path.sep}workFiles`;

    if (!fs.existsSync(outputFilesPath)) {
        fs.mkdirSync(outputFilesPath);
    } else if (overWriteFiles) {
        fs.emptyDirSync(outputFilesPath);
    }

    if (!fs.existsSync(workFilesPath)) {
        fs.mkdirSync(workFilesPath);
    } else if (overWriteFiles) {
        fs.emptyDirSync(workFilesPath);
    }

    // The input file must be the first argument
    const inputFilePath = path.resolve(argv[2]);

    if (!fs.existsSync(inputFilePath)) {
        callback(new Error(`Input file '${inputFilePath}' doesn't exist`));
    }

    const services = createServices(inputFilePath);

    const data = {
        // Mock data just for testing purposes
        user_data: {
            first_name: "John",
            last_name: "Testerson",
            xcoobee_id: "~johnt",
        },
    };

    let parametersContent = null;

    if (fs.existsSync(parametersFilePath)) {
        try {
            parametersContent = JSON.parse(fs.readFileSync(parametersFilePath, "utf8"));
            data.integrations = parametersContent.integrations;
            data.parameters = parametersContent.bee_params;
        } catch (err) {
            callback(new Error(`${parametersFilePath} is not a valid JSON file`));
        }
    }

    const outputXcoobeeObjects = () => {
        if (logObject.logs.length > 0) {
            fs.writeFileSync(path.join(outputFilesPath, "xcoobeelog.json"), JSON.stringify(logObject, null, 2));
        }

        if (mailObject.mail.length > 0) {
            fs.writeFileSync(path.join(outputFilesPath, "xcoobeemail.json"), JSON.stringify(mailObject, null, 2));
        }

        if (processingObject.params.length > 0) {
            fs.writeFileSync(path.join(outputFilesPath, "xcoobeeparam.json"), JSON.stringify(processingObject, null, 2));
        }
    };

    setInterval(() => {
        ellapsed += 2;
    }, 2);

    setTimeout(() => {
        if (!callbackCalled) {
            clearInterval();
            closeStreams();
            outputXcoobeeObjects();
            util.prune(outputFilesPath);
            util.prune(workFilesPath);
            callback(new Error("Timed-out"));
        }
    }, ttl);

    const beeCallback = (err, result) => {
        callbackCalled = true;
        clearInterval();
        closeStreams();

        util.prune(outputFilesPath);
        util.prune(workFilesPath);

        outputXcoobeeObjects();

        const outputFolderSize = util.sizeOfFolder(outputFilesPath);
        const workFolderSize = util.sizeOfFolder(workFilesPath);

        const totalSize = outputFolderSize + workFolderSize;
        const issueWarning = totalSize >= 536870912;
        console.log(`
==========================================
Bee test result completed
==========================================
status: Success
instance: ${size}
time: ${chalk.green(ellapsed + " ms")}
space: ${issueWarning ? chalk.red(totalSize + " bytes") : chalk.green(totalSize + " bytes")} ${issueWarning ? "--->WARNING" : ""}
        `);

        if (err) {
            return callback(err);
        }

        return callback(null, result);
    };
    beeModule.flight(services, data, beeCallback);
};

if (require.main === module) {
    const callback = (err, result) => {
        if (err) {
            console.log(`
==========================================
Bee test result completed
==========================================
status: ${chalk.red("Failure")}
reason: ${err.message}
        `);
            return process.exit(1);
        }
        return process.exit(0);
    };
    runTest(process.argv, callback);
}

module.exports.runTest = (argv, callback) => {
    runTest(argv, callback);
};
