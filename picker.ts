import {
      walk, WalkEntry, WalkOptions
    }                             from "https://deno.land/std@0.88.0/fs/mod.ts";
import { readKeypress, Keypress } from "https://deno.land/x/keypress@0.0.7/mod.ts";
import { CHAR_NO_BREAK_SPACE }    from "https://deno.land/std@0.88.0/path/_constants.ts";


// processStdEntry prompts the user to delete or keep the file/entry (or quit altogether).
async function processStdEntry(entry: WalkEntry) {
  const p = Deno.run({cmd: ["mplayer", entry.path], stdout: "null"})
  await p.status()
  console.log("(D)elete/(K)eep/(Q)uit")
  
  FOR: for await (const keypress of readKeypress()) {
    if (keypress.key == "q") {
      Deno.exit(0)
    } else if (keypress.key == "d") {
      console.log(`deleting ${entry.path}`)
      await Deno.remove(entry.path)
    } else {
      console.log(`Keeping ${entry.path}`)
    }
    break FOR
  }
}

// processSkipEntry let's us treat the first N entries as quickly skippable which is useful for resuming a run for whatever reason.
async function processSkipEntry(entry: WalkEntry): Promise<boolean> {
  console.log(`Processing ${entry.path}`)
  console.log("(S)kip/Any Key To Process")
  let complete = false;
  for await (const keypress of readKeypress()) {
      if (keypress.key != "s") {
        await processStdEntry(entry)
        complete = true
      }
      break
  }
  return complete
}

async function main() {
  const walker = walk(".", { match: [new RegExp("(mp4|mkv|mov)$")] })
  
  let skipComplete = false
  for await (const entry of walker) {
    if (!skipComplete) {
      skipComplete = await processSkipEntry(entry)
    } else {
      await processStdEntry(entry)
    }
  }
}

main().catch(err => {
  console.log(err)
}).then(() => {
  console.log("done")
})
