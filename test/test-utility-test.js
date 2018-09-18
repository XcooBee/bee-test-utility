"use strict";

const proxyquire = require("proxyquire");
const path = require("path");
const sinon = require("sinon");
const assert = require("assert");
const fs = require("fs-extra");

const sandbox = sinon.createSandbox();

let argv = [];
let beeKey = "";
let createWriteStreamSpy = sandbox.stub(fs, "createWriteStream");
let createReadStreamSpy = sandbox.stub(fs, "createReadStream");
let stubs = {};

describe("Testing test-utility", () => {

    beforeEach(() => {
        argv = [
            "",
            "path-to-script",
            "./test/assets/input.txt",
            "--bee",
            "./test/assets/bee_simple.js",
        ];
        beeKey = path.resolve(argv[4]);
        sandbox.restore();
        createWriteStreamSpy = sandbox.stub(fs, "createWriteStream");
        createReadStreamSpy = sandbox.stub(fs, "createReadStream");
        stubs = {
            fs,
        };
    });

    it("Should return proper ids when getNextId service is called", (done) => {
        stubs[beeKey] = {
            flight: (services, data, callback) => {
                assert.equal(1, services.getNextId());
                createReadStreamSpy.restore();
                createWriteStreamSpy.restore();
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
        argv = [
            "",
            "path-to-script",
            "./test/assets/input.txt",
            "--help",
            "./test/assets/bee_simple.js",
        ];
        beeKey = path.resolve(argv[4]);
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
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        });
    });

    it("Should result in error with incorrect size param", (done) => {
        argv = [
            "",
            "path-to-script",
            "",
            "--size",
            "k",
        ];
        beeKey = path.resolve(argv[4]);

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                callback(null, "Success");
            },
        };
        const utility = proxyquire("../src/test-utility", stubs);
        const runTestSpy = sandbox.spy(utility.runTest);


        try {
            runTestSpy(argv, (err, result) => {
                assert.equal(err.message, "'k' is not a valid size, must be one of [s, m, l]")
                done();
            });
        } catch (e) {
            console.log("");
        }
        // "k is not a valid size, must be one of [s, m, l]"
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

    it("Should throw a timeout error when callback is not called from bee", (done) => {

        stubs[beeKey] = {
            flight: (services, data, callback) => {

            },
        };

        const utility = proxyquire("../src/test-utility", stubs);
        const callback = (err) => {
            assert.equal(err.message, "Timed-out");
            done();
        };

        utility.runTest(argv, callback);
    });
});
