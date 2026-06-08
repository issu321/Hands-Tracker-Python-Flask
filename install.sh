#!/bin/bash
# ============================================
# Hands Tracker - Linux Installer
# Supports: Ubuntu, Debian, Kali Linux, Fedora, CentOS, Arch
# Developer: issu321
# GitHub: https://github.com/issu321
# Repository: https://github.com/issu321/Hands-Tracker-Python-Flask
# ============================================

set -e

# =========================
# COLORS
# =========================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# =========================
# SAFE CLEAR
# =========================
command -v clear >/dev/null 2>&1 && clear || true

# =========================
# SAFE LOADING BAR
# =========================
loading_bar() {
    printf "${CYAN}["
    i=0
    while [ $i -lt 40 ]
    do
        printf "="
        sleep 0.015
        i=$((i + 1))
    done
    printf "]${NC}\n"
}

# =========================
# SAFE SPINNER
# =========================
spinner() {
    pid=$1

    while kill -0 "$pid" 2>/dev/null
    do
        printf "\r${CYAN}[|] Working...${NC}"
        sleep 0.1
        printf "\r${CYAN}[/] Working...${NC}"
        sleep 0.1
        printf "\r${CYAN}[-] Working...${NC}"
        sleep 0.1
        printf "\r${CYAN}[\\] Working...${NC}"
        sleep 0.1
    done

    printf "\r${GREEN}[✓] Completed${NC}                     \n"
}

# =========================
# BANNER
# =========================
echo ""
echo -e "${CYAN}"
echo "██╗  ██╗ █████╗ ███╗   ██╗██████╗ ███████╗"
echo "██║  ██║██╔══██╗████╗  ██║██╔══██╗██╔════╝"
echo "███████║███████║██╔██╗ ██║██║  ██║███████╗"
echo "██╔══██║██╔══██║██║╚██╗██║██║  ██║╚════██║"
echo "██║  ██║██║  ██║██║ ╚████║██████╔╝███████║"
echo "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝"
echo -e "${NC}"

echo ""
echo -e "${MAGENTA}=====================================================${NC}"
echo -e "${GREEN}          HANDS TRACKER - LINUX INSTALLER${NC}"
echo -e "${GREEN}             Developed by issu321${NC}"
echo -e "${MAGENTA}=====================================================${NC}"
echo ""

loading_bar

# =========================
# SYSTEM DETECTION
# =========================
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS="$NAME"
    VER="$VERSION_ID"
else
    OS="$(uname -s)"
    VER="$(uname -r)"
fi

echo ""
echo -e "${GREEN}[OK]${NC} Operating System : $OS"
echo -e "${GREEN}[OK]${NC} Version          : $VER"

if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Python3 is not installed."
    echo "Please install Python 3 and run again."
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Python           : $(python3 --version)"
echo ""

# =========================
# VENV NOTICE
# =========================
echo -e "${YELLOW}=====================================================${NC}"
echo -e "${YELLOW}IMPORTANT NOTICE${NC}"
echo -e "${YELLOW}=====================================================${NC}"
echo ""
echo "Using a Python Virtual Environment (venv) is recommended."
echo ""
echo "Example:"
echo "---------------------------------------------"
echo "python3 -m venv venv"
echo "source venv/bin/activate"
echo "bash install.sh"
echo "---------------------------------------------"
echo ""

echo "Type yes  -> Continue installation"
echo "Type exit -> Stop installer"
echo ""

read -r -p "Enter choice (yes/exit): " USER_INPUT

if [ "$USER_INPUT" = "exit" ]; then
    echo ""
    echo -e "${RED}[EXIT] Installer terminated by user.${NC}"
    exit 1
fi

if [ "$USER_INPUT" != "yes" ]; then
    echo ""
    echo -e "${RED}[ERROR] Invalid input.${NC}"
    echo "Please run installer again."
    exit 1
fi

echo ""
echo -e "${GREEN}[ACCESS GRANTED]${NC}"
echo ""

# =========================
# STEP 1
# =========================
echo -e "${BLUE}[1/3] Upgrading pip${NC}"

(
python3 -m pip install --upgrade pip
) >/tmp/hands_tracker_pip.log 2>&1 &

spinner $!

# =========================
# STEP 2
# =========================
echo ""
echo -e "${BLUE}[2/3] Installing requirements${NC}"

(
python3 -m pip install -r requirements.txt
) >/tmp/hands_tracker_requirements.log 2>&1 &

spinner $!

# =========================
# STEP 3
# =========================
echo ""
echo -e "${BLUE}[3/3] Finalizing installation${NC}"
loading_bar

# =========================
# SUCCESS SCREEN
# =========================
echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}             INSTALLATION COMPLETE${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo ""

echo -e "${GREEN}[SUCCESS]${NC} Dependencies installed successfully"
echo -e "${GREEN}[SUCCESS]${NC} Hands Tracker is ready"
echo ""

echo "Developer : issu321"
echo "GitHub    : https://github.com/issu321"
echo "Repository: https://github.com/issu321/Hands-Tracker-Python-Flask"
echo ""

echo -e "${CYAN}Open this URL in your browser:${NC}"
echo "http://localhost:5000"
echo ""

echo -e "${MAGENTA}Launching Hands Tracker...${NC}"
echo ""

echo "Launching in 3..."
sleep 1
echo "Launching in 2..."
sleep 1
echo "Launching in 1..."
sleep 1

echo ""
echo -e "${GREEN}Starting Application...${NC}"
echo ""

python3 app.py