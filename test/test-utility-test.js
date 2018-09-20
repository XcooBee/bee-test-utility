"use strict";

const proxyquire = require("proxyquire");
const path = require("path");
const sinon = require("sinon");
const assert = require("assert");
const fs = require("fs-extra");

const sandbox = sinon.createSandbox();

let argv = [
    "",
    "path-to-script",
    "./test/assets/input.txt",
    "--bee",
    "./test/assets/bee_simple.js",
];
let beeKey = path.resolve(argv[4]);
let createWriteStreamSpy;
let createReadStreamSpy;
let stubs = { fs };

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
        const argv = [
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
        utility.runTest(argv, (err, result) => {
            try {
                assert.equal("Success", result);
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    // it("Should throw an error when no input file", (done) => {
    //     const argv = [
    //         "",
    //         "path-to-script",
    //         "./test/assets/fake.txt",
    //         "--bee",
    //         "./test/assets/bee_simple.js",
    //     ];
    //     let beeKey = path.resolve(argv[4]);
    //
    //     stubs[beeKey] = {
    //         flight: (services, data, callback) => {
    //             callback(null, "Success");
    //         },
    //     };
    //     const utility = proxyquire("../src/test-utility", stubs);
    //     const runTestSpy = sandbox.spy(utility.runTest);
    //     try {
    //         runTestSpy(argv, (err) => {
    //             assert.equal(
    //                 err.message,
    //                 `Input file '${inputFilePath}' doesn't exist`
    //             );
    //             done();
    //         });
    //     } catch (e) {
    //         console.log("");
    //     }
    // });

    it("Should throw an error when received incorrect size param", (done) => {
        const argv = [
            "",
            "path-to-script",
            "",
            "--size",
            "k",
        ];
        let beeKey = path.resolve(argv[4]);
        const size = argv[4];

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        const runTestSpy = sandbox.spy(utility.runTest);


        try {
            runTestSpy(argv, (err) => {
                assert.equal(err.message, `'${size}' is not a valid size, must be one of [s, m, l]`)
                done();
            });
        } catch (e) {
            console.log("");
        }
    });

    it("Should throw an error when no existing output directory", (done) => {
        const argv = [
            "",
            "path-to-script",
            "",
            "--out",
            "fake-output-directory",
        ];
        let beeKey = path.resolve(argv[4]);
        const outputPath = path.resolve(argv[4]);

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        const runTestSpy = sandbox.spy(utility.runTest);
        try {
            runTestSpy(argv, (err) => {
                assert.equal(err.message, `${outputPath} is unknown`)
                done();
            });
        } catch (e) {
            console.log("");
        }
    });

    it("Should create the read and write streams with proper values", (done) => {
        stubs[beeKey] = {
            flight: (services, data, callback) => {
                const outputPath = path.resolve("./");
                services.writeStreamManager.getWriteStream("bee_default_output", "output");
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
        const argv = [
            "",
            "path-to-script",
            "",
            "--params",
            "./test/assets/input.txt",
        ];
        let beeKey = path.resolve(argv[4]);
        const parametersFilePath = path.resolve(argv[4]);

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        const runTestSpy = sandbox.spy(utility.runTest);
        try {
            runTestSpy(argv, (err) => {
                assert.equal(err.message, `${parametersFilePath} is not a valid JSON file`);
                done();
            });
        } catch (e) {
            console.log("");
        }
    });

    it("Should throw an error when no info file supplied", (done) => {
        const argv = [
            "",
            "path-to-script",
            "",
            "--info",
            "fake-file",
        ];
        let beeKey = path.resolve(argv[4]);
        const infoFilePath = path.resolve(argv[4]);

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        const runTestSpy = sandbox.spy(utility.runTest);
        try {
            runTestSpy(argv, (err) => {
                assert.equal(err.message, `${infoFilePath} doesn't exist`)
                done();
            });
        } catch (e) {
            console.log("");
        }
    });

    it("Should throw an error info file is not a JSON file", (done) => {
        const argv = [
            "",
            "path-to-script",
            "",
            "--info",
            "./test/assets/input.txt",
        ];
        let beeKey = path.resolve(argv[4]);
        const infoFilePath = path.resolve(argv[4]);

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        const runTestSpy = sandbox.spy(utility.runTest);
        try {
            runTestSpy(argv, (err) => {
                debugger;
                assert.equal(err.message, `${infoFilePath} is not a valid JSON file`);
                done();
            });
        } catch (e) {
            console.log("");
        }
    });

    it("Should throw an error when unable to open a bee file", (done) => {
        const argv = [
            "",
            "path-to-script",
            "",
            "--bee",
            "fake-file",
        ];
        let beeKey = path.resolve(argv[4]);

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        const runTestSpy = sandbox.spy(utility.runTest);
        try {
            runTestSpy(argv, (err) => {
                debugger;
                assert.equal(
                    err.message,
                    "It was not possible to load the bee, make sure you are inside a valid node project or use the '--bee' switch"
                );
                done();
            });
        } catch (e) {
            console.log("");
        }
    });

    //
    // it("Should throw a timeout error when callback is not called from bee", (done) => {
    //     stubs[beeKey] = {
    //         flight: (services, data, callback) => {
    //             callback(null, "Success");
    //         },
    //     };
    //     const utility = proxyquire("../src/test-utility", stubs);
    //     const runTestSpy = sandbox.spy(utility.runTest);
    //     try {
    //         runTestSpy(argv, (err) => {
    //             assert.equal(err.message, "Timed-out");
    //             done();
    //         });
    //     } catch (e) {
    //         console.log("");
    //     }
    // });

});
