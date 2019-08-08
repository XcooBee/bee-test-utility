"use strict";

const proxyquire = require("proxyquire");
const path = require("path");
const sinon = require("sinon");
const assert = require("assert");
const fs = require("fs-extra");

const sandbox = sinon.createSandbox();

const argv = [
    "",
    "path-to-script",
    "./test/assets/input.txt",
    "--bee",
    "./test/assets/bee_simple.js",
];
const beeKey = path.resolve(argv[4]);
let createWriteStreamSpy;
let createReadStreamSpy;
const stubs = { fs };

describe("Testing test-utility", () => {
    beforeEach(() => {
        createWriteStreamSpy = sandbox.stub(fs, "createWriteStream");
        createReadStreamSpy = sandbox.stub(fs, "createReadStream");
    });

    afterEach(() => sandbox.restore());

    it("Should return proper ids when getNextId service is called", (done) => {
        stubs[beeKey] = {
            flight: (services, data, callback) => {
                assert.equal(1, services.getNextId());
                callback(null, "Success");
            },
        };

        const utility = proxyquire("../src/test-utility", stubs);
        utility.runTest(argv, (err, result) => {
            try {
                assert.equal("Success", result);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should show help info from help.md file", (done) => {
        const argvInt = [
            "",
            "path-to-script",
            "./test/assets/input.txt",
            "--help",
            "./test/assets/bee_simple.js",
        ];
        const readFileSyncSpy = sandbox.stub(fs, "readFileSync");
        const helpInfoPath = "./src/assets/help.md";

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                sinon.assert.calledWith(readFileSyncSpy, helpInfoPath);
                callback(null, "Success");
            },
        };

        const utility = proxyquire("../src/test-utility", stubs);

        utility.runTest(argvInt, (err, result) => {
            try {
                assert.equal("Success", result);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should throw an error when received incorrect size param", (done) => {
        const argvInt = [
            "",
            "path-to-script",
            "",
            "--size",
            "k",
        ];
        const beeKeyInt = path.resolve(argvInt[4]);
        const size = argvInt[4];

        stubs[beeKeyInt] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);

        utility.runTest(argvInt, (err) => {
            try {
                assert.equal(err.message, `'${size}' is not a valid size, must be one of [s, m, l]`);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should throw an error when no existing output directory", (done) => {
        const argvInt = [
            "",
            "path-to-script",
            "",
            "--out",
            "fake-output-directory",
        ];
        const beeKeyInt = path.resolve(argvInt[4]);
        const outputPath = path.resolve(argvInt[4]);

        stubs[beeKeyInt] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        utility.runTest(argvInt, (err) => {
            try {
                assert.equal(err.message, `${outputPath} is unknown`);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should create the read and write streams with proper values", (done) => {
        stubs[beeKey] = {
            flight: (services, data, callback) => {
                const outputPath = path.resolve("./");
                services.writeStreamManager.getWriteStream("bee_default_output", "output");
                services.readStream();
                sinon.assert.calledWith(createReadStreamSpy, path.resolve("./test/assets/input.txt"));
                sinon.assert.calledWith(createWriteStreamSpy, `${outputPath}${path.sep}output${path.sep}bee_default_output`);
                callback(null, "Success");
            },
        };

        const utility = proxyquire("../src/test-utility", stubs);
        utility.runTest(argv, (err, result) => {
            try {
                assert.equal("Success", result);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should throw an error when no JSON file in params", (done) => {
        const argvInt = [
            "",
            "path-to-script",
            "",
            "--params",
            "./test/assets/input.txt",
        ];
        const beeKeyInt = path.resolve(argvInt[4]);
        const parametersFilePath = path.resolve(argvInt[4]);

        stubs[beeKeyInt] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        utility.runTest(argvInt, (err) => {
            try {
                assert.equal(err.message, `${parametersFilePath} is not a valid JSON file`);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should throw an error when no info file supplied", (done) => {
        const argvInt = [
            "",
            "path-to-script",
            "",
            "--info",
            "fake-file",
        ];
        const beeKeyInt = path.resolve(argvInt[4]);
        const infoFilePath = path.resolve(argvInt[4]);

        stubs[beeKeyInt] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        utility.runTest(argvInt, (err) => {
            try {
                assert.equal(err.message, `${infoFilePath} doesn't exist`);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should throw an error info file is not a JSON file", (done) => {
        const argvInt = [
            "",
            "path-to-script",
            "",
            "--info",
            "./test/assets/input.txt",
        ];
        const beeKeyInt = path.resolve(argvInt[4]);
        const infoFilePath = path.resolve(argvInt[4]);

        stubs[beeKeyInt] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        utility.runTest(argvInt, (err) => {
            try {
                assert.equal(err.message, `${infoFilePath} is not a valid JSON file`);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should throw an error when unable to open a bee file", (done) => {
        const argvInt = [
            "",
            "path-to-script",
            "",
            "--bee",
            "fake-file",
        ];
        const beeKeyInt = path.resolve(argvInt[4]);

        stubs[beeKeyInt] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        utility.runTest(argvInt, (err) => {
            try {
                assert.equal(
                    err.message,
                    "It was not possible to load the bee, make sure you are inside a valid node project or use the '--bee' switch"
                );
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });
});
