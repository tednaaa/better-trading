const processedRows = new WeakSet();

function initQuickLinks() {
	const symbolRows = document.querySelectorAll("[data-symbol-short]");
	let newRowsProcessed = 0;

	symbolRows.forEach((row) => {
		if (processedRows.has(row)) return;

		const symbolShort = row.getAttribute("data-symbol-short");
		const symbolFull = row.getAttribute("data-symbol-full");

		if (!symbolShort) return;

		const menuButton = document.createElement("button");
		menuButton.className = "quick-links-button";
		menuButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18">
        <circle cx="3.5" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="14.5" cy="9" r="1.5" fill="currentColor"/>
      </svg>
    `;

		const popover = document.createElement("div");
		popover.className = "quick-links-popover";
		popover.innerHTML = generateMenuHTML(symbolShort, symbolFull);

		const overlayEnd = row.querySelector(".overlayEnd-RsFlttSS");
		if (overlayEnd) {
			overlayEnd.style.zIndex = "100";
			overlayEnd.style.position = "relative";

			overlayEnd.insertBefore(menuButton, overlayEnd.firstChild);
			document.body.appendChild(popover);

			menuButton.addEventListener("click", (e) => {
				e.stopPropagation();

				document
					.querySelectorAll(".quick-links-popover.active")
					.forEach((p) => {
						if (p !== popover) p.classList.remove("active");
					});

				const rect = menuButton.getBoundingClientRect();
				popover.style.top = `${rect.bottom + 4}px`;
				popover.style.right = `${window.innerWidth - rect.right}px`;

				popover.classList.toggle("active");
			});

			processedRows.add(row);
			newRowsProcessed++;
		}
	});

	if (newRowsProcessed > 0) {
		console.debug(`Processed ${newRowsProcessed} new symbol rows`);
	}
}

function generateMenuHTML(symbolShort, symbolFull) {
	let baseSymbol = symbolShort.replace(".D", "");
	let isFutures = false;

	if (baseSymbol.endsWith(".P")) {
		isFutures = true;
		baseSymbol = baseSymbol.replace(".P", "");
	}

	const cleanSymbol = baseSymbol.replace("USDT", "");
	const tradingPair = cleanSymbol + "USDT";

	let binanceUrl, bybitUrl;

	if (isFutures) {
		binanceUrl = `https://www.binance.com/en/futures/${tradingPair}`;
		bybitUrl = `https://www.bybit.com/trade/usdt/${tradingPair}`;
	} else {
		binanceUrl = `https://www.binance.com/en/trade/${tradingPair}`;
		bybitUrl = `https://www.bybit.com/en/trade/spot/${tradingPair}`;
	}

	const marketType = isFutures ? "Futures" : "Spot";

	return `
    <div class="quick-links-item" data-url="${binanceUrl}">
      <img src="https://bin.bnbstatic.com/static/images/common/favicon.ico" class="quick-links-icon" onerror="this.style.display='none'">
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

document.addEventListener("click", (e) => {
	const item = e.target.closest(".quick-links-item");
	if (item) {
		const url = item.getAttribute("data-url");
		if (url) {
			window.open(url, "_blank");
		}
		return;
	}

	// Close popovers when clicking outside
	if (
		!e.target.closest(".quick-links-button") &&
		!e.target.closest(".quick-links-popover")
	) {
		document.querySelectorAll(".quick-links-popover.active").forEach((p) => {
			p.classList.remove("active");
		});
	}
});

setTimeout(() => {
	console.debug("Running initial setup...");
	initQuickLinks();
}, 1000);

let debounceTimer;
function debouncedInit() {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		initQuickLinks();
	}, 300);
}

// Optimized MutationObserver - only watch for new symbol rows
const observer = new MutationObserver((mutations) => {
	let shouldInit = false;

	for (const mutation of mutations) {
		// Check if any added nodes contain or are symbol rows
		if (mutation.addedNodes.length > 0) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType === 1) {
					// Element node
					// Check if the node itself or any descendant has data-symbol-short
					if (
						node.hasAttribute?.("data-symbol-short") ||
						node.querySelector?.("[data-symbol-short]")
					) {
						shouldInit = true;
						break;
					}
				}
			}
		}
		if (shouldInit) break;
	}

	if (shouldInit) {
		debouncedInit();
	}
});

observer.observe(document.body, { childList: true, subtree: true });
