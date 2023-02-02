import {
  walk,
  WalkEntry,
  WalkOptions,
} from "https://deno.land/std@0.170.0/fs/mod.ts";
import {
  Keypress,
  readKeypress,
} from "https://raw.githubusercontent.com/dmitriytat/keypress/6d2ceffe2b4cca0145664b30ffccfbb28f5be737/mod.ts";
import { CHAR_NO_BREAK_SPACE } from "https://deno.land/std@0.88.0/path/_constants.ts";
import * as path from "https://deno.land/std@0.170.0/path/mod.ts"

// processStdEntry prompts the user to delete or keep the file/entry (or quit altogether).
async function processStdEntry(
  entry: WalkEntry,
  videoPlayer: string,
  videoPlayerOptions: string | undefined,
) {

  console.log(`Processing std entry ${entry.path}`);
  // some video players (mpv) need options to be usable by default
  let vpcmd = [videoPlayer];
  if (videoPlayerOptions != null) {
    vpcmd = vpcmd.concat(videoPlayerOptions);
  }
  const p = Deno.run({
    cmd: vpcmd.concat(entry.path),
    stdout: "null",
    stderr: "null",
  });
  await p.status();
  console.log("(d)elete/(k)eep/(r)eplay/(q)uit");

  FOR:
  for await (const keypress of readKeypress()) {
    if (keypress.key == "q") {
      Deno.exit(0);
    } else if (keypress.key == "d") {
      const trashName = "./trash/" + path.basename(entry.path)
      console.log(`trash: moving ${entry.path} to ${trashName}`);
      await Deno.rename(entry.path, trashName);
    } else if (keypress.key == "r") {
      console.log(`replaying ${entry.path}`);
      await processStdEntry(entry, videoPlayer, videoPlayerOptions);
    } else {
      const keeperName = "./keepers/" + path.basename(entry.path)
      console.log(`keeper: moving ${entry.path} to ${keeperName}`);
      Deno.rename(entry.path, keeperName)
    }
    break FOR;
  }
}

// processSkipEntry let's us treat the first N entries as quickly skippable which is useful for resuming a run for whatever reason.
async function processSkipEntry(
  entry: WalkEntry,
  videoPlayer: string,
  videoPlayerOptions: string | undefined,
): Promise<boolean> {
  console.log(`Processing skip entry ${entry.path}`);
  console.log("(S)kip/Any Key To Process");
  let complete = false;
  for await (const keypress of readKeypress()) {
    if (keypress.key != "s") {
      await processStdEntry(entry, videoPlayer, videoPlayerOptions);
      complete = true;
    }
    break;
  }
  return complete;
}

async function main() {
  const videoPlayer = Deno.env.get("VIDEO_PLAYER") || "mplayer";
  const videoPlayerOptions = Deno.env.get("VIDEO_PLAYER_OPTIONS");
  const walker = walk(".", { skip: [new RegExp("keepers"), new RegExp("trash")], match: [new RegExp("(mp4|mkv|mov|iso)$", "i")] });

  await Deno.mkdir("keepers", {recursive:true})
  await Deno.mkdir("trash", {recursive:true})

  for await (const entry of walker) {
    // skip directories, it's not an processable entry  
    if(entry.isDirectory) {
        continue
      }
    await processStdEntry(entry, videoPlayer, videoPlayerOptions);
  }
}

main().catch((err) => {
  console.log(err);
}).then(() => {
  console.log("done");
});
