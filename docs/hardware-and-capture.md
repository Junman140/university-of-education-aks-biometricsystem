# MVP hardware path & capture contract

## Selected vendor (MVP)

**SecuGen Hamster Pro** (USB optical fingerprint reader) is the default MVP target:

- Common in Nigerian government and banking deployments (`bio.md`).
- USB + Windows/Linux SDK support for image capture.
- Good balance of accuracy vs cost for institutional pilots.

**Abstraction rule:** Application code must not depend on SecuGen types. All capture goes through the **CaptureDriver** contract in `packages/shared` (see `CapturePayload`, `VENDOR_SECUGEN`, `HttpCaptureDriver`) so you can swap to Futronic, Suprema, or a file-based mock for CI.

## Capture contract summary

| Field | Description |
|--------|-------------|
| `vendor` | e.g. `secugen` (`VENDOR_SECUGEN` in `@bio/shared`) |
| `deviceId` | Optional stable device serial |
| `capturedAt` | ISO 8601 |
| `width`, `height` | Image dimensions (pixels) |
| `dpi` | Dots per inch (e.g. 500) |
| `format` | `png` \| `raw_gray8` |
| `imageBase64` | PNG or raw bytes as base64 |

Enrollment and verification flows send this payload to the API; the matching service consumes **decoded grayscale** for SourceAFIS.
Hardware Integration (futronic_bridge.py)
Since you are using Futronic hardware, browsers strictly cannot access proprietary USB devices directly. The standard way to handle this (which the app architecture was already designed for) is to run a local "Capture Bridge" in the background on the Windows PC that has the scanner plugged in.

I have created a starter Python bridge for you at: services/capture-bridge/futronic_bridge.py

You or your hardware engineer will just need to drop your Futronic SDK Python bindings (like ftrScanAPI.dll wrappers) into the capture_futronic_image_bytes() function in that script.

To run the bridge on the enrollment PC:

pip install flask flask-cors
python services/capture-bridge/futronic_bridge.py
As long as that is running, your Admin UI running in Chrome/Edge will seamlessly communicate with the Futronic hardware!
## SecuGen Hamster Pro — integration architecture

1. **USB + SDK** live on a **Windows (or Linux) PC** next to the reader. The vendor SDK is **not** embedded in this monorepo (license and native binaries).

2. **Capture bridge** — a tiny **local HTTP service** you maintain using SecuGen sample code:
   - Implements `POST /capture` and returns JSON matching `CapturePayload` (see `services/capture-bridge/README.md`).
   - Runs on `127.0.0.1` only for development.

3. **Hall node** (`apps/hall-node`) — set:

   ```env
   CAPTURE_BRIDGE_URL=http://127.0.0.1:5055
   ```

   The UI exposes **“Capture from device”**, which calls `POST /api/capture/device` → `HttpCaptureDriver` → your bridge. `/api/health` reports `captureBridge: true` when `CAPTURE_BRIDGE_URL` is set.

4. **Admin (browser)** — standard browsers **cannot** access SecuGen USB directly. Use **PNG file upload** (scanner vendor export) or a **desktop** tool that uses the same SDK and posts to the API.

5. **Matching** — unchanged: PNG/raw → Java SourceAFIS service (`services/matching-java`) for template extract and 1:1 match.

## Driver implementation notes

- **Production:** native SecuGen SDK wrapped in the local bridge process above (`services/capture-bridge/README.md`).
- **Development:** mock bridge, **file upload** in admin, or paste base64 in hall UI.
- **Hall node:** scanner attaches to the hall PC; `CAPTURE_BRIDGE_URL` points at the bridge on that machine.

## Security

- Raw images should **not** be stored long-term; only **templates** (encrypted) persist after enrollment.
- Optional: transient image in memory for extract-only, then discard.
