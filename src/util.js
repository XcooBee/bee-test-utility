"use strict";

const fs = require("fs");
const path = require("path");

const sizeOfFolder = (pathToFolder) => {
    const _pathToFolder = path.resolve(pathToFolder);
    const stats = fs.lstatSync(_pathToFolder);
    if (stats.isDirectory()) {
        const list = fs.readdirSync(_pathToFolder);
        let total = 0;

        list.forEach((value) => {
            const itemAbsolutePath = path.join(_pathToFolder, value);
            const itemStats = fs.lstatSync(itemAbsolutePath);

            if (itemStats.isDirectory()) {
                total += sizeOfFolder(itemAbsolutePath);
            } else {
                total += itemStats.size;
            }
        });
        
        return total;
    }
};

module.exports = {
    sizeOfFolder,
};
