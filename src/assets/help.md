# usage examples

* Minimum call, 'input.png' located in the current directory: ```npm run flight input.png```

 * Call specifying the output directory, this is where `workFiles` folder and `output` folder will be placed. ```npm run flight input.png -- --out /path/to/folder```
 
 *NOTICE* write streams retrieved through writeStreamManager service will be placed in these folders based on the types passed to it, `workFiles` type will put the files in `/path/to/folder/workFiles/` folder, otherwise they will be put in `/path/to/folder/output` folder.

* Call specifying the JSON file to be used as parameters for the bee ```npm run flight input.png -- -params /path/to/parameters.json```

* Call specifying the size of the instance to mimick ```npm run flight input.png -- -size m```

*NOTICE* You need to put the '--' (without the quotes) before passing any switch to the script

* Call with -o flag, deleting any file inside the workFiles and output folders before executing ```npm run flight input.png -- -o --out /path/to/output```