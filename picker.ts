import {
      walk, WalkEntry, WalkOptions
    }                             from "https://deno.land/std@0.88.0/fs/mod.ts";
import { readKeypress, Keypress } from "https://deno.land/x/keypress@0.0.7/mod.ts";
import { CHAR_NO_BREAK_SPACE }    from "https://deno.land/std@0.88.0/path/_constants.ts";

// processStdEntry prompts the user to delete or keep the file/entry (or quit altogether).
async function processStdEntry(entry: WalkEntry, videoPlayer: string, videoPlayerOptions: string | undefined) {
  console.log(`Processing std entry ${entry.path}`)
  // some video players (mpv) need options to be usable by default
  let cmd = [videoPlayer]
  if (videoPlayerOptions != null) {
    cmd = cmd.concat(videoPlayerOptions)
  }
  const p = Deno.run({cmd: cmd.concat(entry.path), stdout: "null", stderr: "null"})
  await p.status()
  console.log("(D)elete/(K)eep/(R)eplay/(Q)uit")
  
  FOR: for await (const keypress of readKeypress()) {
    if (keypress.key == "q") {
      Deno.exit(0)
    } else if (keypress.key == "d") {
      console.log(`deleting ${entry.path}`)
      await Deno.remove(entry.path)
    } else if (keypress.key == "r") {
      console.log(`replaying ${entry.path}`)
      await processStdEntry(entry, videoPlayer, videoPlayerOptions)
    } else {
      console.log(`Keeping ${entry.path}`)
    }
    break FOR
  }
}

// processSkipEntry let's us treat the first N entries as quickly skippable which is useful for resuming a run for whatever reason.
async function processSkipEntry(entry: WalkEntry, videoPlayer: string, videoPlayerOptions: string | undefined): Promise<boolean> {
  console.log(`Processing skip entry ${entry.path}`)
  console.log("(S)kip/Any Key To Process")
  let complete = false;
  for await (const keypress of readKeypress()) {
      if (keypress.key != "s") {
        await processStdEntry(entry, videoPlayer, videoPlayerOptions)
        complete = true
      }
      break
  }
  return complete
}

async function main() {
  const videoPlayer = Deno.env.get("VIDEO_PLAYER") || "mplayer";
  const videoPlayerOptions = Deno.env.get("VIDEO_PLAYER_OPTIONS")
  const walker = walk(".", { match: [new RegExp("(mp4|mkv|mov)$")] })
  
  let skipComplete = false
  for await (const entry of walker) {
    if (!skipComplete) {
      skipComplete = await processSkipEntry(entry, videoPlayer, videoPlayerOptions)
    } else {
      await processStdEntry(entry, videoPlayer, videoPlayerOptions)
    }
  }
}

main().catch(err => {
  console.log(err)
}).then(() => {
  console.log("done")
})
