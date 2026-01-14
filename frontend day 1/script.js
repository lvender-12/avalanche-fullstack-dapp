const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("status");
const addressEl = document.getElementById("address");
const networkEl = document.getElementById("network");
const balanceEl = document.getElementById("balance");

// ================= STATE =================
let currentAccount = null;
let currentChainId = null;

// Avalanche Fuji Testnet
const AVALANCHE_FUJI_CHAIN_ID = "0xa869";

// ================= UTILS =================
function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAvaxBalance(balanceHex) {
  const balance = parseInt(balanceHex, 16);
  return (balance / 1e18).toFixed(4);
}

function resetUI() {
  statusEl.textContent = "Not Connected";
  statusEl.style.color = "#e5e7eb";
  addressEl.textContent = "-";
  networkEl.textContent = "-";
  balanceEl.textContent = "-";
  connectBtn.disabled = false;
  connectBtn.textContent = "Connect Wallet";
}

// ================= CORE =================
async function connectWallet() {
  if (!window.ethereum) {
    alert("Core Wallet tidak terdeteksi. Silakan install Core Wallet.");
    return;
  }

  try {
    statusEl.textContent = "Connecting...";

    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    currentAccount = accounts[0];
    currentChainId = await ethereum.request({
      method: "eth_chainId",
    });

    connectBtn.disabled = true;
    connectBtn.textContent = "Wallet Connected";

    renderUI();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Connection Failed ❌";
    statusEl.style.color = "#e84118";
  }
}

async function renderUI() {
  if (!currentAccount) return;

  // Wallet address + identitas (WAJIB)
  addressEl.textContent =
    `${shortenAddress(currentAccount)}\n` +
    `Muhammad Nur Jagat Arya Damar - 241011400372`;

  if (currentChainId === AVALANCHE_FUJI_CHAIN_ID) {
    networkEl.textContent = "Avalanche Fuji Testnet";
    statusEl.textContent = "Connected ✅";
    statusEl.style.color = "#4cd137";

    const balanceWei = await ethereum.request({
      method: "eth_getBalance",
      params: [currentAccount, "latest"],
    });

    balanceEl.textContent = formatAvaxBalance(balanceWei);
  } else {
    networkEl.textContent = "Wrong Network ❌";
    statusEl.textContent = "Please switch to Avalanche Fuji";
    statusEl.style.color = "#fbc531";
    balanceEl.textContent = "-";
  }
}

// ================= EVENTS (SAFE) =================
if (window.ethereum) {
  ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      currentAccount = null;
      resetUI();
    } else {
      currentAccount = accounts[0];
      renderUI();
    }
  });

  ethereum.on("chainChanged", (chainId) => {
    currentChainId = chainId;
    renderUI();
  });
}

// ================= AUTO RECONNECT =================
window.addEventListener("load", async () => {
  if (!window.ethereum) return;

  const accounts = await ethereum.request({ method: "eth_accounts" });

  if (accounts.length > 0) {
    currentAccount = accounts[0];
    currentChainId = await ethereum.request({ method: "eth_chainId" });
    connectBtn.disabled = true;
    connectBtn.textContent = "Wallet Connected";
    renderUI();
  }
});

// ================= LISTENER =================
connectBtn.addEventListener("click", connectWallet);
