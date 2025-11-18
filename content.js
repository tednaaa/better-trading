// content.js
console.log("TradingView Quick Links extension loaded!");
console.log("Current URL:", window.location.href);

// Wait for TradingView to load
function initQuickLinks() {
	console.log("initQuickLinks called!");
	const symbolRows = document.querySelectorAll("[data-symbol-short]");
	console.log("Found symbol rows:", symbolRows.length);

	symbolRows.forEach((row) => {
		// Skip if already processed
		if (row.querySelector(".quick-links-button")) return;

		const symbolShort = row.getAttribute("data-symbol-short");
		const symbolFull = row.getAttribute("data-symbol-full");

		// Create the 3-dot button
		const menuButton = document.createElement("span");
		menuButton.className = "quick-links-button";
		menuButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
        <circle cx="3.5" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="14.5" cy="9" r="1.5" fill="currentColor"/>
      </svg>
    `;

		// Create the popover menu
		const popover = document.createElement("div");
		popover.className = "quick-links-popover";
		popover.innerHTML = generateMenuHTML(symbolShort, symbolFull);

		// Insert button before the remove button
		const overlayEnd = row.querySelector(".overlayEnd-RsFlttSS");
		if (overlayEnd) {
			overlayEnd.insertBefore(menuButton, overlayEnd.firstChild);
			// Append popover to body instead of overlayEnd for better positioning
			document.body.appendChild(popover);
		}

		// Toggle popover on click
		menuButton.addEventListener("click", (e) => {
			e.stopPropagation();

			// Close other popovers
			document.querySelectorAll(".quick-links-popover.active").forEach((p) => {
				if (p !== popover) p.classList.remove("active");
			});

			// Position the popover near the button
			const rect = menuButton.getBoundingClientRect();
			popover.style.top = `${rect.bottom + 4}px`;
			popover.style.right = `${window.innerWidth - rect.right}px`;

			popover.classList.toggle("active");
		});

		// Close popover when clicking outside
		document.addEventListener("click", (e) => {
			if (!popover.contains(e.target) && !menuButton.contains(e.target)) {
				popover.classList.remove("active");
			}
		});
	});
}

function generateMenuHTML(symbolShort, symbolFull) {
	// Extract base symbol and determine if it's futures or spot
	let baseSymbol = symbolShort.replace(".D", "");
	let isFutures = false;

	// Check if it's a perpetual futures contract (.P suffix)
	if (baseSymbol.endsWith(".P")) {
		isFutures = true;
		baseSymbol = baseSymbol.replace(".P", "");
	}

	// Remove USDT if present to get clean base symbol
	const cleanSymbol = baseSymbol.replace("USDT", "");
	const tradingPair = cleanSymbol + "USDT";

	// Build URLs based on whether it's futures or spot
	let binanceUrl, bybitUrl;

	if (isFutures) {
		// Futures trading URLs
		binanceUrl = `https://www.binance.com/en/futures/${tradingPair}`;
		bybitUrl = `https://www.bybit.com/trade/usdt/${tradingPair}`;
	} else {
		// Spot trading URLs
		binanceUrl = `https://www.binance.com/en/trade/${tradingPair}`;
		bybitUrl = `https://www.bybit.com/en/trade/spot/${tradingPair}`;
	}

	const marketType = isFutures ? "Futures" : "Spot";

	return `
    <div class="quick-links-item" data-url="${binanceUrl}">
      <img src="https://www.binance.com/favicon.ico" class="quick-links-icon" onerror="this.style.display='none'">
      <span>Binance ${marketType}</span>
    </div>
    <div class="quick-links-item" data-url="${bybitUrl}">
      <img src="https://www.bybit.com/favicon.ico" class="quick-links-icon" onerror="this.style.display='none'">
      <span>Bybit ${marketType}</span>
    </div>
    <div class="quick-links-separator"></div>
    <div class="quick-links-item" data-url="https://www.coinglass.com/tv/Binance_${tradingPair}">
      <img src="https://www.coinglass.com/favicon.ico" class="quick-links-icon" onerror="this.style.display='none'">
      <span>CoinGlass Chart</span>
    </div>
    <div class="quick-links-item" data-url="https://www.coinglass.com/LiquidationData">
      <img src="https://www.coinglass.com/favicon.ico" class="quick-links-icon" onerror="this.style.display='none'">
      <span>Check Liquidations</span>
    </div>
    <div class="quick-links-item" data-url="https://www.coinglass.com/pro/futures/Footprint">
      <img src="https://www.coinglass.com/favicon.ico" class="quick-links-icon" onerror="this.style.display='none'">
      <span>Check Footprint</span>
    </div>
    <div class="quick-links-separator"></div>
    <div class="quick-links-item" data-url="https://coinmarketcap.com/currencies/${cleanSymbol.toLowerCase()}/">
      <img src="https://coinmarketcap.com/favicon.ico" class="quick-links-icon" onerror="this.style.display='none'">
      <span>CoinMarketCap Info</span>
    </div>
  `;
}

// Handle link clicks
document.addEventListener("click", (e) => {
	const item = e.target.closest(".quick-links-item");
	if (item) {
		const url = item.getAttribute("data-url");
		if (url) {
			window.open(url, "_blank");
		}
	}
});

// Initialize and watch for new symbols added
console.log("Starting initial setup...");
initQuickLinks();

// Debounce function to prevent too many calls
let debounceTimer;
function debouncedInit() {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		initQuickLinks();
	}, 500);
}

// Use MutationObserver to catch dynamically added symbols
console.log("Setting up MutationObserver...");
const observer = new MutationObserver(() => {
	debouncedInit();
});

observer.observe(document.body, {
	childList: true,
	subtree: true,
});

// Re-init every 10 seconds as backup (TradingView is heavily dynamic)
console.log("Setting up interval timer...");
setInterval(() => {
	initQuickLinks();
}, 10000);
