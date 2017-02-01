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

const fs = require("fs");

let parametersFilePath = "parameters.json";
let outputPath = "./";
let ttl = 30000;

// The amount of time reserved for clean up tasks
const timeToCleanUp = 5000;

// Track the number of open write streams
const streamArray = [];

const argv = process.argv;

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

// Assume we are on the node project directory
// unless otherwise specified by the --bee switch
let beeModule = null;
try {
    const beeIndex = argv.indexOf("--bee");
    if (beeIndex !== -1) {
        beeModule = require(argv[beeIndex + 1]);
    } else {
        beeModule = require(".");
    }
} catch (err) {
    console.log("It was not possible to load the bee, make sure you are inside a valid node project or use the '--bee' switch");
    process.exit(1);
}

// Set the size instance in which this bee will be run
// We use the size to, among other things, choose the proper ttl
const sizeIndex = argv.indexOf("--size");
if (sizeIndex !== -1) {
    const validSizes = ["s", "m", "l"];
    const size = argv[sizeIndex + 1].toLowerCase();

    if (validSizes.indexOf(size) === -1) {
        console.log(`'${size}' is not a valid size, must be one of [s, m, l]`);
        process.exit(1);
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
    parametersFilePath = argv[paramsIndex + 1];

    if (!fs.existsSync(parametersFilePath)) {
        console.log(`${parametersFilePath} doesn't exist`);
        process.exit(1);
    }
}

// If the user specifies the output as a directory, use a default file name 'output' with no extension
// The output directory must exists, the utility WON'T create it
const outputIndex = argv.indexOf("--out");
if (outputIndex !== -1) {
    outputPath = argv[outputIndex + 1];

    const stats = fs.lstatSync(outputPath);

    if (!stats.isDirectory()) {
        console.log(`${outputPath} is not a valid directory`);
        process.exit(1);
    }

    if (!outputPath.endsWith("/")) {
        outputPath = outputPath.concat("/");
    }
}

// The input file must be the first argument
const inputFilePath = argv[2];

if (!fs.existsSync(inputFilePath)) {
    console.log(`Input file '${inputFilePath}' doesn't exist`);
    process.exit(1);
}
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
    timeToRun: () => ttl,
    // The default streams for reading and writing
    readStream: fs.createReadStream(inputFilePath),
    writeStream: fs.createWriteStream(`${outputPath}output/bee_default_output`),
    writeStreamManager: () => ({
        getWriteStream: (fileName, type) => {
            const typePath = type === "wip" ? "workFiles/" : "output/";
            const stream = fs.createWriteStream(`${outputPath}${typePath}${fileName}`);
            streamArray.push(stream);
            return stream;
        },
        getReadStream: (fileName, type) => {
            const typePath = type === "wip" ? "workFiles/" : "output/";
            const stream = fs.createReadStream(`${outputPath}${typePath}${fileName}`);
            return stream;
        },
    }),
};

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
        console.log(`${parametersFilePath} is not a valid JSON file`);
        process.exit(1);
    }
}


const beeCallback = (err, result) => {
    callbackCalled = true;
    clearInterval();
    closeStreams();
    if (err) {
        console.log(err);
        process.exit(1);
    }

    console.log(result);
    process.exit(0);
};

setTimeout(() => {
    if (!callbackCalled) {
        console.log("Timed-out");
        clearInterval();
        closeStreams();
        process.exit(2);
    }
}, ttl);

setInterval(() => {
    ttl -= 100;
}, 100);

beeModule.flight(services, data, beeCallback);
