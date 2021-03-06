# Bee Test Utility
## Description
This is a simple *bee* tester, it includes the files needed to test and publish your bees.
We also use this as an example to describe the bee life cycle and code expectations.

## Installation

You can install from npm via:

`npm install xcoobee-bee-test-utility --save-dev`

or 

If you want to use git directly, you can install the bee tester using the standard npm install from git command inside the bee you are developing.

If you are using github + ssh authentication it is:
`npm install git+git@github.com:XcooBee/bee-test-utility.git --save-dev`


The final step is to add a `flight` directive to your scripts section of your `package.json`

```
  "scripts": {
    "flight": "node node_modules/xcoobee-bee-test-utility/src/test-utility.js"
    ...
  },
```

## The Bee Lifecycle

Your code in essence will act as an independent node module (agent or plugin) which we at XcooBee refer to as bee.
Bees run in a restricted environment with limitation on time and space (memory and disk).
Bees can be run in sequence, in which case the sequence of executions is referred to as *flightpath*. 
Bees can communicate along the flightpath using the *flightprocessing* data object if needed.
Each bee works independently on the input file provided to produce an output file for the next bee to process.
The last processed output file is what is returned to the user or designated recipient.


The lifecylce consists of three steps
- invocation
- execution
- shutdown

### invocation
The XcooBee system will invoke the `flight()` method of your primary code file for your module as indicated in your module's package.json file.
 It will use the following signature:

```
flight(services, data, callback) {

}
```
During the invokation `services` and `data` arguments are populated. They allow you to read the input file and get insight into the environment.

### <a id="exec"></a>execution
The exuction step is left to your imagination. Anything you wish to do with the input file can be done given that you stay inside the restrictions for processing time, memory and diskspace.
The current limits are
- time: 
    - small instance: 30s
    - medium instance: 150s
    - large instance: 300s
- memory
    - small:    192 MB
    - medium:   1024 MB
    - large:    1536 MB
- disk: 512 MB

### shutdown
An orderly shutdown occurs when you call the `callback()` function that was passed to you during invokation 
at the end of your processing. You can call it with either an error or success message.
In case of error the XcooBee system will retry your bee two more times.
If you do not complete your processing in the time allocated for your instance it is considered an unorderly shutdown. 
Your process will be terminated and XcooBee will handle it as an Error callback.

__Success Callback Example__
```
callback(null,"success message");
```

__Error Callback Example__
```
callback("problem occured with file",null);
```

## Services
Each bee when invoked will be passed a collection of services and a colleciton of data to conduct its operations. This is passed as **services** argument during the flight() function invocation.

### log(message, type, replacement)
You can use the log to create trace entries for your processing. Use this service to write file processing related feedback.
This is generally not displayed to the end-user but available to XcooBee support.
where message = string: the message to be logged
where type = enum one of (info|warning|error)
where replacement = object: values for variables used in message, optional parameter


### writeStream()
default write stream
If your bee produces output as part of processing you can use this the default `writeStream()` to stream it to disk.
If you need a specific filename, you can use the `writeStreamManager()` to create one as an alternative.


### readStream()
default read stream
This stream has access to the input file for your process. 

### writeStreamManager(filename, type)
type:   `wip` | `bee_output`

factory to add write streams if bee has the option set. You can use this to create multiple files on the processing disk.
You can create work in process files or output files based on the type selection.

### timeToRun()
information on 
how much time is left before the bee will be shut down. The metric is in milliseconds.

### addParam(key,value) 
Add a parameter to the flightprocessing object. This is how we can communicate with downstream bees on the flightpath.
add data to parameter structure to be provided to next bee (changes the directive file)

### getNextId()
Sequence generator. Will return next available integer.

### mail(recipient, template, replacement)
You can attempt to send email to user. To do so you will need to know the XcooBee mail template reference and replacement values.
More details for this in the future.

### getFileType(filename)
Returns type for the file that is being processed

### getFileTags(filename)
Returns tags for the file that is being processed

### validationError(field)
Logs i18n compliant message about input validation error

### setBalanceLock(params)
Sets lock for required amount of points

### getBeeParam(param)
Returns bee's system param

## The data object
When your bee is invoked a certain set of data is made available to it via the `data` argument in your function definition [flight(services, **data**, callback)]. This allows basic information to flow to the bee for processing and it has several subkeys. All subkeys are optional.

The subkeys are: integrations, user_data, parameters, flightprocessing, and env

### integrations
If the bee requires access tokens from the XcooBee platform and the user has authorized it, the XcooBee platform will populate this node with specific information needed for each integration. The structure of object will depend on the integration accessed.

### user_data
Basic data about the user such as name and XcooBeeId. This will also contain the user's external reference passed in via `userReference` element of the bee-directive file.

### parameters
The processing parameters that were provided by the user during the hiring process of the bee and written in to the bee-directive file.

### flightprocessing
This is a communication object shared by all bees. Bees can add data using the `addParam(key, value)` service. Bees can read all data saved by previous bees (for multi-step processing). They can write new data. The can only override their own data (data that this bee has written).

### env
This node contains basic environment information such as the path to work files and output files. This can be used by programs to directly place files into them. However, this is not recommend practice. 

## Module Construction
When you write a bee a minimal set of rules should be followed.
- you should use eslint generally following the AirBnB rule set. We at XcooBee have a few changes that are made available in the `.eslintrc` example file in this project.
- you should have test converage for at least 80% of your code

## Flying Your Bee

### flight script
The bee includes the **test-utility** under the **flight** npm script.
It is used as a tool to write and test bees and mimicks the behavior of the XcooBee infrasctructure.

### Usage
`npm run flight <input-filepath> -- [--params <bee-parameters-filepath>]? [--out <output-dir-path>]? [--size [s|m|l]]? [--info <files-info-filepath>]?`

### Command args
The utility takes a variety of switches that customize the way the bee is run.

#### -o flag
This switch tells the utility to overwrite any file or folder in the workFiles and output directory. If the flag is set the utility will remove
any existent file inside the workFiles and output folder before running.

#### <a id="params"></a>--params <bee-parameters-filepath>
The parameters file mimicks the `data` argument of your `flight()` function. You can change it to test different conditions.
The test utility will use <bee-parameters-filepath> as the parameter file. The referenced file must be a valid JSON file and might contain
four main nodes:
- integrations
    A JSON object that represents the app integrations the bee will need, it will be passed to the bee in the data.integrations object.

- parameters
    A JSON object that represents the named parameters the bee will use, it will be passed to the bee in the data.parameters object.
    By default we will look for a file named `parameters.json` in the same directory. If this file is not there then the the test utility will pass an empty parameters container to the code for execution. The objects will be made available to the bee as `data.parameters` argument in the function call.

- flightprocessing
    This is the state container for the flightpath. When you use the `services.addParam()` method, a paramater pair (key, value) will be added to this object and included for downstream processing. Later bees can read the message placed here and include in their processing. This is the way to communicate between bees as the flightpath is flown. Your parameters will also be assigned a prefix based on the system name of your bee.

- user_data
    This object contains basic data about the user hiring the bee. The user_data will be made available via the `data.user_data` argument of the function call.
    
#### usage examples
* Minimum call, 'input.png' located in the current directory:

 ```npm run flight input.png```

 * Call specifying the output directory, this is where `workFiles` folder and `output` folder will be placed. 

 ```npm run flight input.png -- --out /path/to/folder```
 
 *NOTICE* write streams retrieved through writeStreamManager service
 will be placed in these folders based on the types passed to it, `workFiles` type will put the files in `/path/to/folder/workFiles/` folder, otherwise they will be put in `/path/to/folder/output` folder.

* Call specifying the JSON file to be used as parameters for the bee (See [parameters](#params))

```npm run flight input.png -- --params /path/to/parameters.json```

* Call specifying the size of the instance to mimick (See [execution](#exec))

```npm run flight input.png -- --size m```

* Call specifying the JSON file that contains additional information about input files

```npm run flight input.png -- --info /path/to/info.json```

*NOTICE* You need to put the '--' (without the quotes) before passing any switch to the script

* Call with -o flag, deleting any file inside the workFiles and output folders before executing

```npm run flight input.png -- -o --out /path/to/output```

#### Sample parameters file
```
{
    "integrations" : {
        "facebook": {            
            "access_token": "valid access token",            
            "user_name": "test user"
        }
    },
    "parameters": {
        "favoriteColor": "green",
        "age": 27
    },
    "user_data": {
        "first_name": "Brian",
        "last_name": "Smith",
        "xcoobeeid": "~bmsith"
    },
    "flightprocessing": {
        "imagebee": {
            "color":"green"
        },
        "crunchbee": {
            "color": "yellow"
        }
    },
    "transaction_key": "transaction_id",
    "bee_system_params": {
        "important_param": 10
    }    
}
```

### --out <output-dir-path>
The processing root directory. The test utility will create to subdirectories inside your provided path. An `output` directory. 
This is where all output that needs to be returned back to the XcooBee main process should be placed, and, 
a `workFiles` directory. This is where all intermediate processing files should be placed. 
Please be mindfull of the disk space you use, the combined quota is 512 MB. Thus it is recommended that you delete workfiles that are not needed
during your processing.
This directory  must exists as the utility will not create it.
The default is the current directory of program.

### --size [s|m|l]
This switch, among other things, determines the resource envelope available to the bee. 
The test utility will provide some information when you finish whether you have execeeded limits.
The default size is `m`

### --info <files-info-filepath>
Path to JSON file that contains additional information about files that are being processed, e.g. file type, file tags etc.
This data can be accessed inside bee using appropriate service.

#### Sample information file
```
{
    "image.jpg" : {
        "file_type": 1015,
        "file_tags": ["awesome image"]
    }
}
```






