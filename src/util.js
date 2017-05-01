"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Convenience function to, recursively, get the size of a folder
 * @param {string} pathToFolder The Path to the folder of which we want to know the size
 * @returns {Number} The total size of the contents of the folder in bytes
 */
const sizeOfFolder = (pathToFolder) => {
    const _pathToFolder = path.resolve(pathToFolder);
    const stats = fs.lstatSync(_pathToFolder);
    if (stats.isDirectory()) {
        const list = fs.readdirSync(_pathToFolder);
        let total = 0;

        list.forEach((value) => {
            const itemAbsolutePath = path.join(_pathToFolder, value);
            try {
                const itemStats = fs.lstatSync(itemAbsolutePath);

                if (itemStats.isDirectory()) {
                    total += sizeOfFolder(itemAbsolutePath);
                } else {
                    total += itemStats.size;
                }
            } catch (err) {
                console.log("no such file or folder - it may have been removed (1):", itemAbsolutePath);
            }
        });

        return total;
    }
};

/**
 * Convenience function to remove, recursively any file with zero bytes
 * @param {string} pathToFolder The path to the folder we want to prune
 */
const prune = (pathToFolder) => {
    const _pathToFolder = path.resolve(pathToFolder);
    const stats = fs.lstatSync(_pathToFolder);
    if (stats.isDirectory()) {
        const list = fs.readdirSync(_pathToFolder);

        list.forEach((value) => {
            const itemAbsolutePath = path.join(_pathToFolder, value);
            try {
                const itemStats = fs.lstatSync(itemAbsolutePath);

                if (!itemStats.isDirectory()) {
                    const size = itemStats.size;

                    if (size === 0) {
                        fs.unlinkSync(itemAbsolutePath);
                    }
                }
            } catch (err) {
                console.log("No such file or dir - it may have been removed (2):", itemAbsolutePath);
            }
        });
    }
};

module.exports = {
    sizeOfFolder,
    prune,
};
