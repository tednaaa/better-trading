const tradingviewURL = "tradingview.com";
const coinglassURL = "coinglass.com";

const processedRows = new WeakSet();

function initTradingViewQuickLinks() {
	if (!window.location.hostname.includes(tradingviewURL)) return;

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
				popover.style.top = `${rect.bottom - 30}px`;
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

if (window.location.hostname.includes(tradingviewURL)) {
	setTimeout(initTradingViewQuickLinks, 1000);
}

let debounceTimer;
function debouncedTradingViewInit() {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(initTradingViewQuickLinks, 300);
}

if (window.location.hostname.includes(tradingviewURL)) {
	const observer = new MutationObserver((mutations) => {
		let shouldInit = false;

		for (const mutation of mutations) {
			if (mutation.addedNodes.length > 0) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === 1) {
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
			debouncedTradingViewInit();
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
}

function initCoinglassTVButton() {
	if (
		!window.location.hostname.includes(coinglassURL) ||
		!window.location.pathname.includes("/tv")
	)
		return;

	if (document.querySelector(".liquidations-quick-link")) return;

	const tvHeader = document.querySelector(".tv-head-item.css-fhzvlw");
	if (!tvHeader) return;

	const pairButton = tvHeader.querySelector('button[type="button"]');
	if (!pairButton) return;

	const pairText = pairButton.textContent.trim();
	const match = pairText.match(/(?:Binance|Bybit|OKX)\s+(\w+?)USDT/i);
	if (!match) return;

	const cleanSymbol = match[1];

	const separator = document.createElement("hr");
	separator.className =
		"MuiDivider-root MuiDivider-middle MuiDivider-vertical MuiDivider-flexItem css-16tu5e3";

	const liquidationHeatmapButton = document.createElement("a");
	liquidationHeatmapButton.className =
		"MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium liquidations-quick-link css-1jhxbfy";
	liquidationHeatmapButton.href = `https://www.coinglass.com/pro/futures/LiquidationHeatMap?coin=${cleanSymbol}`;
	liquidationHeatmapButton.target = "_blank";
	liquidationHeatmapButton.style.cssText =
		"text-decoration: none; color: inherit;";
	liquidationHeatmapButton.innerHTML = `
		<span>Liq Heatmap</span>
		<span class="MuiTouchRipple-root css-w0pj6f"></span>
	`;

	tvHeader.appendChild(separator);
	tvHeader.appendChild(liquidationHeatmapButton);

	console.debug(`Added liquidations button for ${cleanSymbol}`);
}

if (window.location.hostname.includes(coinglassURL)) {
	setTimeout(initCoinglassTVButton, 1500);

	let lastPair = "";
	setInterval(() => {
		const pairButton = document.querySelector(
			'.tv-head-item.css-fhzvlw button[type="button"]',
		);
		if (pairButton) {
			const currentPair = pairButton.textContent.trim();
			if (currentPair !== lastPair) {
				lastPair = currentPair;
				const oldButton = document.querySelector(".liquidations-quick-link");
				if (oldButton) {
					const prevSeparator = oldButton.previousElementSibling;
					if (
						prevSeparator &&
						prevSeparator.classList.contains("MuiDivider-root")
					) {
						prevSeparator.remove();
					}
					oldButton.remove();
				}
				setTimeout(() => initCoinglassTVButton(), 100);
			}
		}
	}, 2000);
}
