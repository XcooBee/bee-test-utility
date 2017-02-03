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
const runTest = (argv, callback) => {
    const path = require("path");
    const fs = require("fs");

    let parametersFilePath = path.resolve("./parameters.json");
    let outputPath = path.resolve(".");
    let ttl = 30000;
    // How long have we been running?
    let ellapsed = 0;

    // The amount of time reserved for clean up tasks
    const timeToCleanUp = 5000;

    // Track the number of open write streams
    const streamArray = [];

    let callbackCalled = false;

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
        const services = {
            // Just log a message to the system console
            log: (message, type) => {
                const chunk = `${Date.now()},${type},${message}\n`;
                console.log(chunk);
            },
            // email service to mock the sending of an email
            mail: () => {
                // TODO: What do in here? Log something? Do Nothing?
            },
            getNextId,
            addParam: (key, value) => {
                console.log(`${key} => ${value} added to the next bee`);
            },
            timeToRun: () => ttl - ellapsed,
            // The default streams for reading and writing
            readStream: fs.createReadStream(inputFilePath),
            // TODO: Should overwrite the files
            writeStreamManager: () => ({
                getWriteStream: (fileName, type) => {
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
            }),
        };

        return services;
    };

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
    if (sizeIndex !== -1) {
        const validSizes = ["s", "m", "l"];
        const size = argv[sizeIndex + 1].toLowerCase();

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

    if (!fs.existsSync(`${outputPath}${path.sep}output`)) {
        fs.mkdirSync(`${outputPath}${path.sep}output`);
    }

    if (!fs.existsSync(`${outputPath}${path.sep}workFiles`)) {
        fs.mkdirSync(`${outputPath}${path.sep}workFiles`);
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


    const beeCallback = (err, result) => {
        callbackCalled = true;
        clearInterval();
        console.log(`Total exec time: ${ellapsed} millis`);
        closeStreams();
        if (err) {
            return callback(err);
        }

        return callback(null, result);
    };

    setTimeout(() => {
        if (!callbackCalled) {
            clearInterval();
            closeStreams();
            callback(new Error("Timed-out"));
        }
    }, ttl);

    setInterval(() => {
        ellapsed += 2;
    }, 2);

    beeModule.flight(services, data, beeCallback);
};

if (require.main === module) {
    const callback = (err, result) => {
        if (err) {
            console.log(err.message);
            return process.exit(1);
        }
        console.log(result);
        return process.exit(0);
    };
    runTest(process.argv, callback);
}

module.exports.runTest = (argv, callback) => {
    runTest(argv, callback);
};
