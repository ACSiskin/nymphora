#!/usr/bin/env python3
# ============================================================================
# NYMPHORA – Unified Setup & Installer (Linux-focused)
# - Installs Node deps + Prisma
# - Verifies (and can install) required OSINT CLI tools used by the app:
#   rustscan, naabu, nmap, whatweb, whois, dig, amass, nuclei
# - Creates/validates .env template (includes OpenAI/NOVA placeholders)
#
# ============================================================================
import argparse
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

APP_NAME = "NYMPHORA OSINT ENGINE"
AUTHOR = "sh@dowrig"
VERSION = "1.0.0 (Setup Script – Full)"
NODE_PORT = "3002"

# ---- Color helpers ----
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"

def print_banner():
    banner = f"""{Colors.CYAN}{Colors.BOLD}
    _   ___   ____  __ ____  _   _  ____ ___     _
   / | / / | / /  |/  / __ \\/ / / // _\\ / \\  / \\
  /  |/ /\\ \\/ /  \\_/ / /_/ / /_/ / / / / /_/ / / _ \\
 / /|  /  |  / /  / / ____/ __  / /_/ / _, _/ / ___ \\
/_/ |_/   |_/_/  /_/_/   /_/ /_/  \\_/_/ |_| /_/     \\_\\

{Colors.ENDC}"""
    print(banner)
    print(f"{Colors.GREEN}=================================================={Colors.ENDC}")
    print(f"{Colors.BOLD} Name:    {APP_NAME}")
    print(f" Author:  {AUTHOR}")
    print(f" Version: {VERSION}{Colors.ENDC}")
    print(f"{Colors.GREEN}=================================================={Colors.ENDC}\n")

def run_cmd(cmd: str, cwd: str | None = None, exit_on_fail: bool = True) -> int:
    try:
        p = subprocess.run(cmd, cwd=cwd, shell=True, check=True)
        return p.returncode
    except subprocess.CalledProcessError as e:
        print(f"{Colors.FAIL}[!] Error while executing: {cmd}{Colors.ENDC}")
        if exit_on_fail:
            sys.exit(1)
        return e.returncode

def capture(cmd: str) -> str:
    return subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True).strip()

def has_cmd(cmd: str) -> bool:
    return shutil.which(cmd) is not None

def require_linux_apt() -> bool:
    return platform.system() == "Linux" and has_cmd("apt-get")

def detect_arch() -> str:
    m = platform.machine().lower()
    if m in ("x86_64", "amd64"):
        return "amd64"
    if m in ("aarch64", "arm64"):
        return "arm64"
    return m

def ensure_project_root():
    # Make paths robust (run from script location)
    script_dir = Path(__file__).resolve().parent
    os.chdir(script_dir)

    # sanity checks
    if not Path("package.json").exists():
        print(f"{Colors.FAIL}[!] I can't find package.json w {script_dir}. Run this script from the NYMPHORA project root directory.{Colors.ENDC}")
        sys.exit(1)

def ensure_node(min_major: int = 18):
    if not has_cmd("node"):
        print(f"{Colors.FAIL}[!] Node.js not found. Install Node.js (>= {min_major}) and run again.{Colors.ENDC}")
        sys.exit(1)

    try:
        v = capture("node -v")  # e.g. v20.11.0
        m = re.match(r"v?(\\d+)\\.", v)
        major = int(m.group(1)) if m else 0
    except Exception:
        major = 0

    if major < min_major:
        print(f"{Colors.FAIL}[!] Node.js is too old ({v}). Required >= {min_major}.{Colors.ENDC}")
        sys.exit(1)

    if not (has_cmd("npm") or has_cmd("pnpm") or has_cmd("yarn")):
        print(f"{Colors.FAIL}[!] No package manager found (npm/pnpm/yarn). Zainstaluj npm and run again.{Colors.ENDC}")
        sys.exit(1)

    print(f"  {Colors.GREEN}✔ Node.js ({capture('node -v')}){Colors.ENDC}")

def ensure_python3():
    py = shutil.which("python3") or shutil.which("python")
    if not py:
        print(f"{Colors.FAIL}[!] Brak Pythona. Zainstaluj Python 3 and run again.{Colors.ENDC}")
        sys.exit(1)
    try:
        out = capture(f"{py} -c \"import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')\"")
        major, minor = map(int, out.split("."))
        if major < 3 or (major == 3 and minor < 8):
            print(f"{Colors.FAIL}[!] Python {out} jest za stary. Required >= 3.8.{Colors.ENDC}")
            sys.exit(1)
    except Exception:
        pass
    print(f"  {Colors.GREEN}✔ Python ({py}){Colors.ENDC}")

def choose_pkg_manager() -> str:
    # Respect lock files for reproducibility
    if Path("pnpm-lock.yaml").exists() and has_cmd("pnpm"):
        return "pnpm"
    if Path("yarn.lock").exists() and has_cmd("yarn"):
        return "yarn"
    # default to npm (package-lock.json exists in this project)
    return "npm"

def apt_install(packages: list[str]):
    if not require_linux_apt():
        print(f"{Colors.WARNING}[!] No apt-get found or not Linux. Install manually: {' '.join(packages)}{Colors.ENDC}")
        return
    run_cmd("sudo apt-get update", exit_on_fail=True)
    run_cmd("sudo apt-get install -y " + " ".join(packages), exit_on_fail=False)

def install_go_if_needed():
    if has_cmd("go"):
        return
    print(f"{Colors.CYAN}[*] Installing Go (required for naabu/nuclei)...{Colors.ENDC}")
    apt_install(["golang"])
    if not has_cmd("go"):
        print(f"{Colors.WARNING}[!] Nie udało się zainstalować Go automatycznie. Zainstaluj Go ręcznie and run again.{Colors.ENDC}")

def go_install_to_usr_local(bin_name: str, go_pkg: str):
    # go install puts binaries to ~/go/bin by default
    install_go_if_needed()
    if not has_cmd("go"):
        return

    print(f"{Colors.CYAN}[*] Installing {bin_name} via go install...{Colors.ENDC}")
    run_cmd(f"go install {go_pkg}@latest", exit_on_fail=False)

    src = Path.home() / "go" / "bin" / bin_name
    if not src.exists():
        print(f"{Colors.WARNING}[!] I can't find {src}. Check GOPATH/GOBIN and install {bin_name} manually.{Colors.ENDC}")
        return

    # Copy into /usr/local/bin (works best with hardcoded paths in executor.ts)
    run_cmd(f"sudo install -m 0755 {src} /usr/local/bin/{bin_name}", exit_on_fail=False)

def ensure_symlink(expected_path: str, real_path: str):
    exp = Path(expected_path)
    if exp.exists():
        return
    exp_parent = exp.parent
    # Create /usr/local/bin symlinks if needed
    if str(exp_parent) == "/usr/local/bin":
        run_cmd(f"sudo ln -sf {real_path} {expected_path}", exit_on_fail=False)

def verify_or_install_osint_tools(auto_install: bool):
    # Tools actually used in the codebase (app/api/* and app/scanner/*):
    required = {
        "nmap": {"apt": ["nmap"], "expected": "/usr/bin/nmap"},
        "whois": {"apt": ["whois"], "expected": "/usr/bin/whois"},
        "whatweb": {"apt": ["whatweb"], "expected": "/usr/local/bin/whatweb"},   # executor.ts expects /usr/local/bin
        "dig": {"apt": ["dnsutils"], "expected": None},                          # used by deep scan routes
        "amass": {"apt": ["amass"], "expected": None},                           # used by transform/scan route
        "rustscan": {"apt": ["rustscan"], "expected": "/usr/local/bin/rustscan"},# executor.ts expects /usr/local/bin
        "naabu": {"go": "github.com/projectdiscovery/naabu/v2/cmd/naabu", "expected": "/usr/local/bin/naabu"},
        "nuclei": {"go": "github.com/projectdiscovery/nuclei/v3/cmd/nuclei", "expected": None},
    }

    missing = []
    for tool in required:
        if has_cmd(tool):
            print(f"  {Colors.GREEN}✔ {tool}{Colors.ENDC}")
        else:
            print(f"  {Colors.WARNING}⚠ Missing {tool}{Colors.ENDC}")
            missing.append(tool)

    if not missing:
        return

    if not auto_install:
        print(f"\n{Colors.WARNING}[!] Missing tools: {', '.join(missing)}.{Colors.ENDC}")
        print(f"{Colors.WARNING}    Run again with --install-tools to install automatically (Linux/apt).{Colors.ENDC}")
        return

    if not require_linux_apt():
        print(f"\n{Colors.WARNING}[!] Automatic installation is prepared for Linux + apt-get. Install manually: {', '.join(missing)}{Colors.ENDC}")
        return

    # Install apt-based ones in one shot
    apt_pkgs = []
    for tool in missing:
        meta = required[tool]
        if "apt" in meta:
            apt_pkgs += meta["apt"]
    if apt_pkgs:
        print(f"\n{Colors.CYAN}[*] Installing pakiety apt: {' '.join(sorted(set(apt_pkgs)))}{Colors.ENDC}")
        apt_install(sorted(set(apt_pkgs)))

    # rustscan fallback if apt doesn't provide it
    if "rustscan" in missing and not has_cmd("rustscan"):
        arch = detect_arch()
        if arch != "amd64":
            print(f"{Colors.WARNING}[!] RustScan auto-fallback (.deb) is prepared for amd64. Your arch: {arch}. Zainstaluj RustScan manually.{Colors.ENDC}")
        else:
            print(f"{Colors.CYAN}[*] Fallback: installing RustScan (amd64 .deb)...{Colors.ENDC}")
            run_cmd("wget -q https://github.com/RustScan/RustScan/releases/download/2.0.1/rustscan_2.0.1_amd64.deb -O /tmp/rustscan.deb", exit_on_fail=False)
            run_cmd("sudo dpkg -i /tmp/rustscan.deb", exit_on_fail=False)
            run_cmd("sudo apt-get -f install -y", exit_on_fail=False)
            run_cmd("rm -f /tmp/rustscan.deb", exit_on_fail=False)

    # Go-based tools
    if "naabu" in missing and not has_cmd("naabu"):
        go_install_to_usr_local("naabu", required["naabu"]["go"])
    if "nuclei" in missing and not has_cmd("nuclei"):
        go_install_to_usr_local("nuclei", required["nuclei"]["go"])

    # Fix hardcoded paths (executor.ts expects /usr/local/bin for some tools)
    for tool, meta in required.items():
        if not has_cmd(tool):
            continue
        expected = meta.get("expected")
        if expected:
            real = shutil.which(tool)
            if real and real != expected:
                ensure_symlink(expected, real)

    # re-check
    still_missing = [t for t in required if not has_cmd(t)]
    if still_missing:
        print(f"\n{Colors.WARNING}[!] Still missing: {', '.join(still_missing)}{Colors.ENDC}")
        print(f"{Colors.WARNING}    Install them manually or check your PATH.{Colors.ENDC}")
    else:
        print(f"\n{Colors.GREEN}[✓] OSINT tools are ready.{Colors.ENDC}")

def check_geolite():
    db = Path("data") / "GeoLite2-City.mmdb"
    if db.exists():
        print(f"  {Colors.GREEN}✔ GeoLite2-City.mmdb{Colors.ENDC}")
    else:
        print(f"  {Colors.WARNING}⚠ Missing bazy MaxMind (data/GeoLite2-City.mmdb). GeoIP module will not work.{Colors.ENDC}")

def ensure_env():
    env_path = Path(".env")
    if env_path.exists():
        return

    print(f"\n{Colors.WARNING}[!] .env file not found. Creating a template...{Colors.ENDC}")
    env_path.write_text(
        'DATABASE_URL="postgresql://user:password@localhost:5432/nymphora?schema=public"\\n'
        'NEXT_PUBLIC_BASE_URL="http://localhost:3002"\\n'
        '# --- AI / NOVA ---\\n'
        '# OPENAI_API_KEY="sk-..."\\n'
        '# NOVA_MODEL="gpt-4.1-mini"\\n'
        '# NOVA_REPORT_MODEL="gpt-4.1-mini"\\n',
        encoding="utf-8",
    )
    print(f"{Colors.WARNING} Fill in DATABASE_URL (and optionally OPENAI_API_KEY), then run the script again.{Colors.ENDC}")
    sys.exit(0)

def install_node_deps():
    pkg_manager = choose_pkg_manager()
    print(f"\n{Colors.BLUE}[*] Installing Node.js dependencies ({pkg_manager})...{Colors.ENDC}")

    if pkg_manager == "npm":
        # Prefer npm ci when lockfile exists
        if Path("package-lock.json").exists():
            run_cmd("npm ci")
        else:
            run_cmd("npm install")
    else:
        run_cmd(f"{pkg_manager} install")

def setup_database():
    pkg_manager = choose_pkg_manager()
    print(f"\n{Colors.BLUE}[*] Configuring the database (Prisma)...{Colors.ENDC}")
    # Use local prisma from node_modules via npx
    run_cmd("npx prisma generate")
    run_cmd("npx prisma db push")

def setup_nova_backend():
    nova_dir = Path("nova-inet")
    if not nova_dir.exists():
        print(f"\n{Colors.WARNING}⚠ nova-inet directory not found. Skipping AI backend installation.{Colors.ENDC}")
        return

    print(f"\n{Colors.BLUE}[*] Installing Nova AI backend (Python)...{Colors.ENDC}")
    py = shutil.which("python3") or shutil.which("python")
    if not py:
        print(f"{Colors.WARNING}[!] Python not found — skipping Nova AI.{Colors.ENDC}")
        return

    venv_dir = nova_dir / "venv"
    if not venv_dir.exists():
        run_cmd(f"{py} -m venv venv", cwd=str(nova_dir))

    pip = venv_dir / ("Scripts/pip.exe" if os.name == "nt" else "bin/pip")
    req = nova_dir / "requirements.txt"
    if req.exists():
        run_cmd(f"{pip} install -r requirements.txt", cwd=str(nova_dir))
    else:
        print(f"{Colors.WARNING}⚠ Missing requirements.txt w nova-inet. Pomijam pip install.{Colors.ENDC}")

def start_app(skip_run: bool):
    if skip_run:
        print(f"\n{Colors.GREEN}{Colors.BOLD}[✓] Installation finished. Start the app manually: npm run dev{Colors.ENDC}")
        return

    print(f"\n{Colors.GREEN}{Colors.BOLD}[✓] All set! Launching NYMPHORA...{Colors.ENDC}\n")
    pkg_manager = choose_pkg_manager()

    # optional Nova AI
    nova_dir = Path("nova-inet")
    nova_proc = None
    python_bin = nova_dir / ("venv/Scripts/python.exe" if os.name == "nt" else "venv/bin/python")

    if nova_dir.exists() and python_bin.exists():
        print(f"{Colors.CYAN}[*] Starting Nova AI server in the background...{Colors.ENDC}")
        nova_proc = subprocess.Popen([str(python_bin), "main.py"], cwd=str(nova_dir))

    print(f"{Colors.CYAN}[*] Starting the interface (Next.js) on port {NODE_PORT}...{Colors.ENDC}")

    try:
        subprocess.run(f"{pkg_manager} run dev", shell=True)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Shutting down NYMPHORA...{Colors.ENDC}")
    finally:
        if nova_proc:
            nova_proc.terminate()
            print("Nova AI server stopped.")

def main():
    parser = argparse.ArgumentParser(description="NYMPHORA full installer")
    parser.add_argument("--install-tools", action="store_true", help="Install missing OSINT tools (Linux/apt)")
    parser.add_argument("--skip-run", action="store_true", help="Do not run the app after installation")
    args = parser.parse_args()

    print_banner()
    time.sleep(0.3)

    ensure_project_root()
    print(f"{Colors.BLUE}[*] Checking environment...{Colors.ENDC}")
    ensure_node()
    ensure_python3()

    print(f"\n{Colors.BLUE}[*] Checking OSINT tools required by the app...{Colors.ENDC}")
    verify_or_install_osint_tools(auto_install=args.install_tools)

    print(f"\n{Colors.BLUE}[*] Checking GeoIP data...{Colors.ENDC}")
    check_geolite()

    ensure_env()
    install_node_deps()
    setup_database()
    setup_nova_backend()
    start_app(skip_run=args.skip_run)

if __name__ == "__main__":
    main()
