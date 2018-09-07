"use strict";

const proxyquire = require("proxyquire");
const path = require("path");
const sinon = require("sinon");
const assert = require("assert");

describe("Testing test-utility", () => {
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
        const createWriteStreamSpy = sinon.stub(fs, "createWriteStream", () => ({}));
        const createReadStreamSpy = sinon.stub(fs, "createReadStream", () => ({}));

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

        const fs = require("fs");
        const createWriteStreamSpy = sinon.spy(fs, "createWriteStream");
        const createReadStreamSpy = sinon.spy(fs, "createReadStream");

        const stubs = {
            fs,
        };

        stubs[beeKey] = {
            flight: (services, data, callback) => {
                const outputPath = path.resolve("./");
                assert.ok(createReadStreamSpy.calledWith(path.resolve("./test/assets/input.txt")));
                assert.ok(createWriteStreamSpy.calledWith(`${outputPath}${path.sep}output${path.sep}bee_default_output`));
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
        const createWriteStreamSpy = sinon.spy(fs, "createWriteStream");
        const createReadStreamSpy = sinon.spy(fs, "createReadStream");

        const stubs = {
            fs,
        };

        stubs[beeKey] = {
            flight: (services, data, callback) => {

            },
        };

        const utility = proxyquire("../src/test-utility", stubs);
        const callback = (err) => {
            try {
                assert.equal(err.message, "Timed-out");
                done();
            } catch (assertionErr) {
                done(assertionErr);
            }
        };

        utility.runTest(argv, callback);
    });
});
