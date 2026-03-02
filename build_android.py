#!/usr/bin/env python3
"""
build_android.py — Remote EAS local build launcher for Spendabo.

Usage:
    python build_android.py              # build + stream log
    python build_android.py --log-only   # stream log of running build
    python build_android.py --status     # check if a build is running
"""

import argparse
import io
import select
import sys
import time

# Force UTF-8 output on Windows (avoids cp1252 UnicodeEncodeError from EAS log)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import paramiko

# ── Configuration ────────────────────────────────────────────────────────────

SSH_HOST = "192.168.88.7"
SSH_USER = "midu"
SSH_KEY  = r"C:\Users\zzhib\.ssh\random"   # Ed25519 private key

REPO_DIR    = "~/spendabo"
PROJECT_DIR = "~/spendabo/spendabo_expo"
LOG_FILE    = "~/eas-build.log"

# Clean PATH for the remote session (avoids Windows PATH leaking in via SSH env)
REMOTE_ENV = " ".join([
    "export HOME=/home/midu",
    "export ANDROID_HOME=/home/midu/android-sdk",
    "export JAVA_HOME=/home/midu/.sdkman/candidates/java/current",
    "export PATH=/home/midu/.sdkman/candidates/java/current/bin"
        ":/home/midu/android-sdk/cmdline-tools/latest/bin"
        ":/home/midu/android-sdk/platform-tools"
        ":/usr/local/bin:/usr/bin:/bin",
])

# ── Helpers ──────────────────────────────────────────────────────────────────

def connect(key_passphrase: str) -> paramiko.SSHClient:
    key = paramiko.Ed25519Key.from_private_key_file(SSH_KEY, password=key_passphrase)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SSH_HOST, username=SSH_USER, pkey=key, timeout=20)
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 60) -> str:
    _, out, err = c.exec_command(REMOTE_ENV + "; " + cmd, timeout=timeout)
    return out.read().decode(errors="replace").strip()


def stream_log(c: paramiko.SSHClient) -> bool:
    """Stream ~/eas-build.log until the build finishes. Returns True on success."""
    print("\n-- Build log --------------------------------------------------")
    _, out, _ = c.exec_command(f"tail -f {LOG_FILE}", timeout=3600)
    success = False
    while True:
        r, _, _ = select.select([out.channel], [], [], 30)
        if r:
            data = out.channel.recv(8192)
            if not data:
                break
            text = data.decode(errors="replace")
            sys.stdout.write(text)
            sys.stdout.flush()
            if "BUILD SUCCESSFUL" in text or "Artifact saved" in text:
                success = True
                time.sleep(2)
                break
            if "BUILD FAILED" in text or "Build failed" in text or "Error:" in text:
                time.sleep(2)
                break
        else:
            # No output for 30 s — check whether the process is still alive
            _, o2, _ = c.exec_command("pgrep -f eas-cli > /dev/null 2>&1 && echo running || echo done")
            status = o2.read().decode().strip()
            if status == "done":
                break
            sys.stdout.write("  [waiting…]\n")
            sys.stdout.flush()
    return success


# ── Actions ──────────────────────────────────────────────────────────────────

def do_status(c: paramiko.SSHClient) -> None:
    pid = run(c, "pgrep -f eas-cli | head -1")
    if pid:
        print(f"Build is RUNNING (PID {pid})")
        last = run(c, f"tail -5 {LOG_FILE}")
        print("Last log lines:\n" + last)
    else:
        print("No build running.")
        last = run(c, f"tail -3 {LOG_FILE} 2>/dev/null || echo '(no log)'")
        print("Last log lines:\n" + last)


def do_build(c: paramiko.SSHClient) -> None:
    # 1. Kill any stale build
    print("Killing any existing build processes…")
    run(c, "pkill -f eas-cli; pkill -f gradlew; sleep 1", timeout=15)

    # 2. Pull latest code
    print("Pulling latest code…")
    print(run(c, f"cd {REPO_DIR} && git pull", timeout=60))

    # 2b. Install/update node_modules in case package-lock.json changed
    print("Running npm ci…")
    REMOTE_PATH = (
        "export PATH=/home/midu/.nvm/versions/node/$(ls /home/midu/.nvm/versions/node | tail -1)/bin"
        ":/usr/local/bin:/usr/bin:/bin"
    )
    npm_result = run(c, f"{REMOTE_PATH}; cd {PROJECT_DIR} && npm ci 2>&1 | tail -5", timeout=180)
    print(npm_result or "(npm ci done)")

    # 3. Start build in background
    print("Starting EAS local build in background…")
    start_cmd = (
        f"cd {PROJECT_DIR} && "
        f"nohup npx eas-cli build --profile preview --platform android "
        f"--local --non-interactive > {LOG_FILE} 2>&1 &"
    )
    c.exec_command(REMOTE_ENV + "; " + start_cmd, timeout=5)
    time.sleep(6)

    pid = run(c, "pgrep -f eas-cli | head -1")
    if not pid:
        print("ERROR: build process did not start. Check ~/eas-build.log on the server.")
        sys.exit(1)
    print(f"Build started (PID {pid}). Streaming log…\n")

    # 4. Stream log
    success = stream_log(c)
    print("\n--------------------------------------------------------------")
    if success:
        apk = run(c, f"find {PROJECT_DIR} -name '*.apk' -newer {LOG_FILE} 2>/dev/null | head -1")
        if apk:
            print(f"SUCCESS — APK at: {apk}")
            print(f"\nTo copy to this machine run:\n  scp {SSH_USER}@{SSH_HOST}:{apk} .")
        else:
            print("SUCCESS — check the build output for the APK path.")
    else:
        print("FAILED — scroll up for the error, or run:")
        print(f"  ssh {SSH_USER}@{SSH_HOST} 'tail -100 {LOG_FILE}'")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Remote EAS Android build launcher")
    parser.add_argument("--log-only", action="store_true", help="stream log of running build")
    parser.add_argument("--status",   action="store_true", help="check build status")
    args = parser.parse_args()

    passphrase = input(f"SSH key passphrase for {SSH_USER}@{SSH_HOST}: ")

    print(f"Connecting to {SSH_USER}@{SSH_HOST}…")
    try:
        c = connect(passphrase)
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)
    print("Connected.\n")

    try:
        if args.status:
            do_status(c)
        elif args.log_only:
            stream_log(c)
        else:
            do_build(c)
    finally:
        c.close()


if __name__ == "__main__":
    main()
