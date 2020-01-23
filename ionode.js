/**
 * Download a file from the internet.
 */
class Download{
  /**
   * 
   * @param {string} url File to download.
   * @param {string} dest Where to store the file.
   */
  constructor(url, dest = undefined)
  {
    if (!url) {
      return console.error("URL is not defined");
    }
    this.url = url;
    this.dest = dest;
    this.downloadedBytes = 0;
    this.totalByteSize = 0;
  }

  onData(data){}

  onClose(){}

  onError(error)
  {
    console.error(error);
  }

  onEnd(){}

  downloadedInBits()
  {
    var bytes = this.downloadedBytes;
    return bytes * 8;
  }

  downloadedInKiloBytes()
  {
    var bytes = this.downloadedBytes;
    return bytes / 1024;
  }

  downloadedInMegaBytes()
  {
    var bytes = this.downloadedBytes;
    return bytes / 1024 / 1024;
  }

  downloadedInGigaBytes()
  {
    var bytes = this.downloadedBytes;
    return bytes / 1024 / 1024 / 1024;
  }

  downloadedInAuto()
  {
    var bytes = this.downloadedBytes;
    if (bytes > 1073741824) {
      return this.downloadedInGigaBytes();
    }
    else if (bytes > 1048576) {
      return this.downloadedInMegaBytes();
    }
    else if (bytes > 1024) {
      return this.downloadedInKiloBytes();
    }
    else if (bytes < 8) {
      return this.downloadedInBits();
    }
    else{
      return bytes;
    }
  }

  downloadPercent()
  {
    var bytes = this.downloadedBytes;
    return 100 * (bytes / this.totalByteSize);
  }

  setDownloadedBits(value)
  {
    this.downloadedBytes = value;
    return this;
  }

  addDownloadedBits(value)
  {
    this.downloadedBytes += value;
    return this;
  }

  /**
   * Start the download of the file.
   * @param {string} url
   * @param {string} dest
   */
  async start(url = this.url, dest = this.dest)
  {
    // File system for writing files
    const fs = require("fs");

    // HTTP/HTTPS protocol
    var http;
    // HTTPS support
    if (url.startsWith("https")) {
      http = require("https");
    }
    // Else use regular HTTP
    else {
      http = require("http");
    }
    // this.functions local vars for http.get
    var object = this;
    return http.get(url, function(res){
      object.totalByteSize = +res.headers["content-length"];
      console.log("Downloading...");
      res.on("data", function(data){
        object.addDownloadedBits(data.length)
        object.onData(data);
      });
      res.on("close", object.onClose);
      res.on("error", object.onError);
      res.on("end", object.onEnd);
      if (dest) {
        try {
          res.pipe(fs.createWriteStream(dest));
        } catch (error) {
          console.error(error);
        }
      }
      else {
        console.log("No destination specified.");
      }
    });
    // return this;
  }
}

class CommandObject {
  /**
   * Command Class
   */
  static Command = class Command {
    /**
     * Create a new Command.
     * @param {string} trigger The string that triggers this command.
     * @param {(cmd: string, args: string[], dashArgs: string[]) => any} action Action to execute when the command is called.
     */
    constructor(trigger, action) {
      /**
       * The word that triggers the command.
       */
      this.trigger = trigger;
      this.action = action;
      this.isAlias = false;

      Command.commandList.push(this);
      Command.commandDictionary[trigger] = this;
    }

    /**
     * Array of all created commands.
     * @type {Command[]}
     */
    static commandList = [];

    /**
     * Dictionary/JSON object of all created commands.
     * @type {{trigger: Command}}
     */
    static commandDictionary = {};

    /**
     * Runs a command. If a `string` is used, the trigger is case-sensitive.
     * @param {string | Command} command 
     * @param {string[]} args 
     */
    static runCommand(command, args = []) {
      if (typeof command == "string") {
        command = Command.getCommand(command);
      }

      if (command instanceof Command) {
        return command.action(command, args);
      }
      return;
    }

    /**
     * Get a command by it's trigger.
     * @param {string} trigger Trigger for the command.
     * @returns {Command}
     */
    static getCommand(trigger, caseSensitive = true) {
      if (Command.commandDictionary[trigger] instanceof Command) {
        return Command.commandDictionary[trigger];
      }
      else if (caseSensitive == false) {
        for (let i = 0; i < Command.commandList.length; i++) {
          const _command = Command.commandList[i];
          if (_command.trigger.toLowerCase() == trigger.toLowerCase()) {
            return _command;
          }
        }
        return null;
      }
      else {
        return null;
      }
    }

    /**
     * Give this command another name which will also execute the same command.
     * @param {string} alias Alias to add.
     * @returns The new command object created.
     */
    addAlias(alias) {
      var c = new Command(alias, this.action)
      c.isAlias = true;
      return c;
    }
  }

  /**
   * Parses a string input into (command, parameters[])  
   * Uses the first word as `command` and the rest is put into an array as `args[]`. Quotes capture multiple words.
   * @param {string} input Input to parse.
   */
  static parseArgs(input, parseDashArgs = false){
    var parameters = [];
    var command = input.split(" ")[0].trim();
    
    while(command.startsWith("\""))
    {
      command = command.substring(1);
    }
    while(command.endsWith("\""))
    {
      command = command.substring(0, command.length-1);
    }
    input = input.substring(input.split(" ")[0].length+1);
    
    var parts = input.split("");
    var quotes = false;
    var param = "";
    for (let i = 0; i < parts.length; i++) {
      const c = parts[i];
      if (c == "\\" && parts.length > i) {
        i++;
        param += parts[i];
        continue;
      }
      if (c == "\"") {
        quotes = !quotes;
        if (param != "") {
          parameters.push(param);
        }
        param = "";
        continue;
      }
      if (c == " " && !quotes) {
        if (param != "") {
          parameters.push(param);
        }
        param = "";
        continue;
      }
      param += c;
    }
    if (param != "") {
      parameters.push(param);
      param = "";
    }

    var rawCommand = command;
    for (let i = 0; i < parameters.length; i++) {
      const _p = parameters[i];
      rawCommand += " \""+_p+"\""
    }

    /**
     * @type {string[]}
     */
    var dashParam = [];
    if (parseDashArgs == true) {
      for (let i = 0; i < parameters.length; i++) {
        const pm = parameters[i];
        if (pm.startsWith("-")) {
          dashParam.push(parameters.splice(i, 1)[0]);
          i--;
        }
      }
      return {
        command: command,
        param: parameters,
        dashParam: dashParam,
        raw: rawCommand
      };
    }
    return {
      command: command,
      param: parameters,
      raw: rawCommand
    };
  }
}

// Exports
exports.Download = Download;
exports.CommandObject = CommandObject;