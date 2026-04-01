# Browser Test Debugging

For remote servers without a GUI, the simplest debugging path is to run Playwright headless with traces enabled and inspect the generated `trace.zip` locally.

## Run the seating flow with traces

```bash
npm run test:browser:trace:seating
```

Or the full browser suite:

```bash
npm run test:browser:trace
```

This keeps the browser headless on the server and stores Playwright artifacts under `playwright-artifacts/<timestamp>/`.

The repository now keeps browser artifacts under timestamped folders in `playwright-artifacts/` and automatically prunes older runs, keeping only the latest 5.

## Run everything and open the latest video

```bash
npm run test
```

This runs Vitest and Playwright, records Playwright video for every browser test, and starts an autoplay viewer for the latest `.webm` on port `9325`.

On a machine with a desktop session, the script tries to open the viewer automatically. On a remote server, forward port `9325` and open the forwarded URL locally.

## Find the trace artifact

```bash
find playwright-artifacts -name trace.zip
```

If a test retries or more than one test runs, there may be multiple `trace.zip` files.

## Open the trace locally

Option 1:
- copy the `trace.zip` to your machine
- open `https://trace.playwright.dev`
- drag the file into the page

Option 2:
- on the remote server, run:

```bash
npm run test:browser:show-last-trace
```

- forward port `9324` to your machine
- open the forwarded URL in your local browser

## Open the HTML report

If you can forward a port from the remote server:

```bash
npm run test:browser:report
```

Then open the local forwarded URL in your browser.
