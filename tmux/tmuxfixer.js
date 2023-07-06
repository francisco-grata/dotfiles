#!/usr/bin/env node
/* 
  tmuxfixer.js

  USAGE:
    $ node tmuxfixer.js old-conf-path [new-conf-path]
  
  PURPOSE & CONTEXT: This script takes in a tmux configuration file and combines
  all deprecated -fg, -bg, and -attr into a single -style option line.
    
    In tmux 1.9, a new method for configuring tmux styles was introduced.
    Instead of specifying -fg, -bg, and -attr options individually, these were
    combined into a single -style option with an updated syntax. In tmux 2.9,
    these old options were officially removed. Further details can be found in
    the tmux manual (https://man.openbsd.org/tmux.1#STYLES)

    The script only modifies the deprecated -fg, -bg, and -attr options. All
    other lines are left untouched. The new -style option will be placed on the
    line of the first matching option family, and all subsequent lines deleted.
    For example: if you have `set status-fg red` on line 10 and `set status-bg
    black` on line 15, line 15 will be removed and `set status-style
    fg=red,bg=black` will be placed on line 10.

    In an effort to preserve the original intention of the input tmux config,
    different option setting commands (set, set-option, set-window-option, etc)
    are preserved along with their arguments. That means the lines `set -gwq
    status-fg red` and `set-option -g status-bg blue` are translated into the
    separate lines `set -gwq status-style fg=red` and `set-option -g
    status-style bg=blue`.

  LICENSE: Copyright 2019 Max David

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted, provided that the above
    copyright notice and this permission notice appear in all copies.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
    MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
    SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
    OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
    CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

const fs = require('fs');

if (process.argv.length < 3) {
  console.log('Usage: ');
  console.log('node tmuxfixer.js old-conf-path [new-conf-path]');
  process.exit(1);
}

const NEW_CONF_NAME = (process.argv.length >= 4) ? process.argv[3] : 'new.conf.tmux';

const OPTIONS = new Object();
const COMMENT_OR_EMPTY = /(^\s*$)|(^[ ]*#+.*)/;
const OPTION_LINE = /(set\S*\s*(?:-[a-z]+)?)\s+((?:-|[a-z])+)(fg|bg|attr)\s+(\S+)/;

fs.readFile(process.argv[2], 'utf8', function(err, contents) {
  processLines(contents.split(/\r?\n/));
});

function processLines(tmuxConf) {
  for (let lineNum = 0; lineNum < tmuxConf.length; lineNum++) {
    if (COMMENT_OR_EMPTY.exec(tmuxConf[lineNum])) { continue; }
    let matchedOption = OPTION_LINE.exec(tmuxConf[lineNum]);
    if (matchedOption) {
      let setCmd = matchedOption[1];     // 'set -g', etc
      let prefix = matchedOption[2];     // 'pane-border-', etc
      let attrType = matchedOption[3];   // [fg|bg|attr]
      let styleType = matchedOption[4];  // 'bold', 'magenta', etc
      let styling;
      if (attrType === 'attr') {
        styling = styleType;
      } else {
        styling = `${attrType}=${styleType}`;
      }

      let fullOptionSetting = `${setCmd} ${prefix}style`;
      
      if (OPTIONS.hasOwnProperty(fullOptionSetting)) { // if we've seen this style option before, add the style to the array
        OPTIONS[fullOptionSetting].push(styling);
        tmuxConf.splice(lineNum, 1); // splice out unnecessary line
        lineNum--; // jump back a line now that we've removed one
      } else { // if this is a new style option, create a key for it and save the lineno
        OPTIONS[fullOptionSetting] = [lineNum, styling];
      }
    }
  };

  let matchedOptions = Object.keys(OPTIONS);
  for (const prefix of matchedOptions) {
    const lineNum = OPTIONS[prefix].shift();
    const settings = OPTIONS[prefix].join(',');
    tmuxConf[lineNum] = `${prefix} ${settings}`;
  };

  writeToFile(tmuxConf, NEW_CONF_NAME);
} 

function writeToFile(content, filename) {
  fs.writeFile(filename, content.join('\n'), (err) => {
    if (err) throw err;
  });
  console.log('\x1b[1;32m%s\x1b[0m','Success!');
  console.log('New tmux config saved to',`\x1b[1m${NEW_CONF_NAME}\x1b[0m`);
}
