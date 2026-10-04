# Lab build — Kali attacker + Metasploitable 2 target

This is the host-only lab the field assignments in every mission assume. Build it once,
snapshot it, fork-and-clone for each field assignment.

## Topology
- **Kali** (attacker) — VirtualBox/VMware/KVM, two NICs: (1) NAT for updates, (2)
  host-only adapter on `192.0.2.0/24` for the lab.
- **Metasploitable 2** (target) — single host-only NIC, IP `192.0.2.10`.

The host-only network **must not route** to the internet. Use a separate VMnet on
VMware, or a separate `vboxnet` interface on VirtualBox.

## Steps

```bash
# 1. Provision the attacker
sudo apt install -y nmap metasploit-framework wireshark tshark burpsuite gobuster sqlmap \
  theharvester hydra john snort
# 2. Provision the target from the Metasploitable 2 OVA/Vagrant box.
#    Do NOT change the default credentials until you've captured the initial scan.
# 3. Take a snapshot: "fresh-lab"
vboxmanage snapshot "metasploitable2" take "fresh-lab"
# 4. Fork for each field assignment: clone the VM from "fresh-lab" → msf-<id>.
```

## Verifying isolation
From Kali, `nmap -sV 192.0.2.10` should succeed. `ping 8.8.8.8` should **not** from the
host-only NIC.

## First lab session
```bash
nmap -sV -sC -p- 192.0.2.10 -oN first-scan.txt
msfconsole -q -x 'use auxiliary/scanner/portscan/tcp; set RHOSTS 192.0.2.10; run; exit'
```
You should see vsftpd 2.3.4 backdoor on port 21, Samba 3.x on 139/445, IRC on 6667,
and a few web apps on 80/8180.

See [`CAPTURE_GOLDEN.md`](CAPTURE_GOLDEN.md) for capturing golden outputs.