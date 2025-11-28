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

			let hideTimeout;
			let isHoveringButton = false;
			let isHoveringPopover = false;

			const showPopover = () => {
				clearTimeout(hideTimeout);

				document
					.querySelectorAll(".quick-links-popover.active")
					.forEach((p) => {
						if (p !== popover) p.classList.remove("active");
					});

				const rect = menuButton.getBoundingClientRect();
				popover.style.top = `${rect.bottom}px`;
				popover.style.right = `${window.innerWidth - rect.right + 20}px`;

				popover.classList.add("active");
			};

			const hidePopover = () => {
				hideTimeout = setTimeout(() => {
					if (!isHoveringButton && !isHoveringPopover) {
						popover.classList.remove("active");
					}
				}, 200);
			};

			menuButton.addEventListener("mouseenter", () => {
				isHoveringButton = true;
				showPopover();
			});

			menuButton.addEventListener("mouseleave", () => {
				isHoveringButton = false;
				hidePopover();
			});

			popover.addEventListener("mouseenter", () => {
				isHoveringPopover = true;
				clearTimeout(hideTimeout);
			});

			popover.addEventListener("mouseleave", () => {
				isHoveringPopover = false;
				hidePopover();
			});

			menuButton.addEventListener("click", (e) => {
				e.stopPropagation();

				if (popover.classList.contains("active")) {
					popover.classList.remove("active");
				} else {
					showPopover();
				}
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
		<div class="quick-links-item">
			<span>${symbolShort}</span>
		</div>
		<div class="quick-links-separator"></div>
		<a class="quick-links-item" href="https://www.coinglass.com/tv/Binance_${tradingPair}" target="_blank">
			<img src="https://www.coinglass.com/favicon.ico" class="quick-links-icon">
			<span>CoinGlass Chart</span>
		</a>
		<a class="quick-links-item" href="https://www.coinglass.com/pro/futures/LiquidationHeatMap?coin=${cleanSymbol}" target="_blank">
			<img src="https://www.coinglass.com/favicon.ico" class="quick-links-icon">
			<span>Liquidations Heatmap</span>
		</a>
		<div class="quick-links-separator"></div>
		<a class="quick-links-item" href="${binanceUrl}" target="_blank">
			<img src="https://bin.bnbstatic.com/static/images/common/favicon.ico" class="quick-links-icon">
			<span>Binance ${marketType}</span>
		</a>
		<a class="quick-links-item" href="${bybitUrl}" target="_blank">
			<img src="https://www.bybit.com/favicon.ico" class="quick-links-icon">
			<span>Bybit ${marketType}</span>
		</a>
	`;
}

// Close popovers when clicking outside
document.addEventListener("click", (e) => {
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
