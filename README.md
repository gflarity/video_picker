# Intro

The following is a functional learning project meant to achieve the following goals:
  1. Create a working utility as a means to learn [Deno](https://deno.land).
  2. Solve the problem of going through a collection of videos and quickly decided to keep or delete them.

Note: This works well for me, but **use at your own risk**.

# Usage

Install deno by follow instructions etc [here](https://deno.land). 

```bash
deno compile --unstable --allow-run --allow-read --allow-write --allow-env picker.ts
```

Move the picker executable somewhere into your path. Then run it in the directory that contains the videos you wish to sort through.

```bash
picker
```


