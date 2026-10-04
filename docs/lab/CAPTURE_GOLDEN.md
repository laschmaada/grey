# Capturing golden outputs

Goal: improve simulator output to match the real tools.

## When the simulator disagrees with the real tool

1. **Capture the real output** from your lab into a fixture file:
   ```bash
   nmap -sV -sC 192.0.2.10 -oN fixtures/nmap/scan-basic.txt
   msfconsole -q -x 'use auxiliary/scanner/portscan/tcp; set RHOSTS 192.0.2.10; run' \
     | tee fixtures/msf/aux-tcp-portscan.txt
   ```
2. **Sanitise.** Replace any IPs in the capture with the equivalent from the reserved
   documentation ranges (`192.0.2.0/24`). Replace MACs. Replace banners that reveal the
   build hostname.
3. **Save under** `src/test/fixtures/golden/<tool>/<case>.txt` with the tool key in
   `goldenStatus: 'verified'` in the sim formatter.
4. **Add a transcript** at `content/missions/<id>/transcripts/verified-<case>.json`
   that uses this fixture.

## What "verified" means here

The capture was made by running the real tool in a head-only lab against the documented
vulnerable target. The simulator output was diffed against the capture (after the
sanitisation step) and the diff is empty for the canonical inputs. This is the strongest
guarantee we can offer without running the lab in CI.