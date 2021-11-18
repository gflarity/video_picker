import {
      walk, WalkEntry, WalkOptions
    }                             from "https://deno.land/std@0.88.0/fs/mod.ts";
import { readKeypress, Keypress } from "https://deno.land/x/keypress@0.0.7/mod.ts";
import { CHAR_NO_BREAK_SPACE }    from "https://deno.land/std@0.88.0/path/_constants.ts";

// processStdEntry prompts the user to delete or keep the file/entry (or quit altogether).
async function processStdEntry(entry: WalkEntry, videoPlayer: string, videoPlayerOptions: string | undefined, processed: Map<string, boolean>) {
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
      await saveProcessedFile(processed)
      Deno.exit(0)
    } else if (keypress.key == "d") {
      console.log(`deleting ${entry.path}`)
      await Deno.remove(entry.path)
    } else if (keypress.key == "r") {
      console.log(`replaying ${entry.path}`)
      await processStdEntry(entry, videoPlayer, videoPlayerOptions, processed)
    } else {
      console.log(`Keeping ${entry.path}`)
      processed.set(entry.path, true)
      await saveProcessedFile(processed)
    }
    break FOR
  }
}


async function main() {
  const videoPlayer = Deno.env.get("VIDEO_PLAYER") || "mplayer";
  const videoPlayerOptions = Deno.env.get("VIDEO_PLAYER_OPTIONS")
  const walker = walk(".", { match: [new RegExp("(mp4|mkv|mov)$")] })
  
  let processed = await loadProcessedFile()
  for await (const entry of walker) {
      if (!processed.get(entry.path)) {
        await processStdEntry(entry, videoPlayer, videoPlayerOptions, processed)
      }
  }
  await saveProcessedFile(processed)
}


async function loadProcessedFile(): Promise<Map<string, boolean>> {
  const decoder = new TextDecoder('utf-8')
  try {
    const data = await Deno.readFile('./.processed.json')
    let jsonObject = JSON.parse(decoder.decode(data))
    let processed = new Map<string, boolean>()
    for (var value in jsonObject) {  
      processed.set(value,jsonObject[value])  
    }
    return processed
  } catch (e) {
    console.log(e)
    return new Map<string, boolean>()
  }
}

async function saveProcessedFile(processed: Map<string, boolean>){
  try {
      await Deno.writeTextFile("./.processed.json", JSON.stringify(Object.fromEntries(processed)));
  } catch(e) {
      console.log(e);
    }
}


main().catch(err => {
  console.log(err)
}).then(() => {
  console.log("done")
})
