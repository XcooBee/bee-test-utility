"use strict";

const proxyquire = require("proxyquire");
const path = require("path");
const sinon = require("sinon");
const assert = require("assert");


const sandbox = sinon.createSandbox();

describe("Testing test-utility", () => {

    afterEach(() => {
        sandbox.restore();
    });

    it("Should return proper ids when getNextId service is called", (done) => {
        const argv = [
            "",
            "path-to-script",
            "./test/assets/input.txt",
            "--bee",
            "./test/assets/bee_simple.js",
        ];
        const beeKey = path.resolve(argv[4]);

        const fs = require("fs");
        const createWriteStreamSpy = sandbox.stub(fs, "createWriteStream");
        const createReadStreamSpy = sandbox.stub(fs, "createReadStream");

        const stubs = {
            fs,
        };

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

    it("Should create the read and write streams with proper values", (done) => {
        const argv = [
            "",
            "path-to-script",
            "./test/assets/input.txt",
            "--bee",
            "./test/assets/bee_simple.js",
        ];

        const beeKey = path.resolve(argv[4]);
        const fs = require("fs-extra");

        const createWriteStreamSpy = sinon.stub(fs, "createWriteStream");
        const createReadStreamSpy = sinon.stub(fs, "createReadStream");

        const stubs = {
            fs,
        };

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
        const argv = [
            "",
            "path-to-script",
            "./test/assets/input.txt",
            "--bee",
            "./test/assets/bee_simple.js",
        ];
        const beeKey = path.resolve(argv[4]);

        const fs = require("fs");

        const stubs = {
            fs,
        };

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
