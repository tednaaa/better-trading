const tradingviewURL = "tradingview.com";
const coinglassURL = "coinglass.com";

let currentSettings = {
	exchange: "binance",
};

browser.storage.sync.get({ exchange: "binance" }).then(function (items) {
	currentSettings = items;
});

browser.runtime.onMessage.addListener(function (message) {
	if (message.action === "settingsChanged") {
		currentSettings = message.settings;

		processedCoinglassRows.clear();
		const oldLinks = document.querySelectorAll(".coinglass-tv-link");
		oldLinks.forEach((link) => link.remove());

		setTimeout(() => {
			initCoinglassMainPageLinks();
		}, 100);
	}
});

function getCoinglassTVUrl(symbolText) {
	const tradingPair = symbolText + "USDT";

	switch (currentSettings.exchange) {
		case "bybit":
			return `https://www.coinglass.com/tv/Bybit_${tradingPair}`;
		case "bingx":
			const bingxPair = symbolText + "-USDT";
			return `https://www.coinglass.com/tv/BingX_${bingxPair}`;
		case "binance":
		default:
			return `https://www.coinglass.com/tv/Binance_${tradingPair}`;
	}
}

function getTradingViewUrl(symbolText) {
	const tradingPair = symbolText + "USDT.P";

	switch (currentSettings.exchange) {
		case "bybit":
			return `https://www.tradingview.com/chart?symbol=Bybit:${tradingPair}`;
		case "bingx":
			return `https://www.tradingview.com/chart?symbol=BingX:${tradingPair}`;
		case "binance":
		default:
			return `https://www.tradingview.com/chart?symbol=Binance:${tradingPair}`;
	}
}

const watchlistHeatmapState = new WeakMap();
const watchlistWidgetSelector = '[data-test-id-widget-type="watchlist"]';
const watchlistSymbolSelector = "[data-symbol-short]";
const watchlistActiveSelector =
	'[data-symbol-short][data-active="true"], [data-symbol-short][data-selected="true"]';

function extractHeatmapCoin(symbolShort, symbolFull) {
	const candidates = [symbolShort, symbolFull];
	const suffixes = ["USDT", "USDC", "BUSD", "USD", "PERP"];

	for (const candidate of candidates) {
		if (!candidate) continue;

		let value = candidate.trim().toUpperCase();
		if (!value) continue;

		if (value.includes(":")) {
			value = value.split(":").pop();
		}

		value = value.replace(/\.P$/i, "");
		value = value.replace(/\.D$/i, "");
		value = value.replace(/-PERP$/i, "");
		value = value.replace(/PERP$/i, "");
		value = value.replace(/[-_]/g, "");

		for (const suffix of suffixes) {
			if (value.endsWith(suffix)) {
				value = value.slice(0, -suffix.length);
				break;
			}
		}

		value = value.replace(/[^A-Z0-9]/g, "");
		if (value) return value;
	}

	return null;
}

function getTradingViewHeatmapUrl(coin) {
	if (!coin) {
		return "https://www.coinglass.com/pro/futures/LiquidationHeatMap";
	}

	return `https://www.coinglass.com/pro/futures/LiquidationHeatMap?coin=${encodeURIComponent(
		coin,
	)}`;
}

function getActiveWatchlistSymbol(widget) {
	const activeRow =
		widget.querySelector(watchlistActiveSelector) ||
		widget.querySelector(watchlistSymbolSelector);

	if (!activeRow) return null;

	return {
		short: activeRow.getAttribute("data-symbol-short"),
		full: activeRow.getAttribute("data-symbol-full"),
	};
}

function ensureTradingViewHeatmapLink(widget) {
	const header = widget.querySelector('div[class*="widgetHeader"]');
	if (!header) return;

	let state = watchlistHeatmapState.get(widget);
	let container = state?.container;
	let link = state?.link;

	if (!container || !container.isConnected) {
		container = document.createElement("div");
		container.className = "tv-liq-heatmap-container";
		header.insertAdjacentElement("afterend", container);
	}

	if (!link || !link.isConnected) {
		link = document.createElement("a");
		link.className = "tv-liq-heatmap-link";
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = "Liq Heatmap";
		container.appendChild(link);
	}

	const activeSymbol = getActiveWatchlistSymbol(widget);
	const coin = extractHeatmapCoin(activeSymbol?.short, activeSymbol?.full);
	const nextHref = getTradingViewHeatmapUrl(coin);

	if (link.getAttribute("href") !== nextHref) {
		link.href = nextHref;
	}

	if (coin) {
		link.classList.remove("is-disabled");
		link.removeAttribute("aria-disabled");
		link.title = `${coin} Liquidation Heatmap`;
	} else {
		link.classList.add("is-disabled");
		link.setAttribute("aria-disabled", "true");
		link.title = "Select a crypto symbol to open the heatmap";
	}

	watchlistHeatmapState.set(widget, { container, link, lastCoin: coin });
}

function updateTradingViewHeatmapLinks() {
	const widgets = document.querySelectorAll(watchlistWidgetSelector);
	widgets.forEach((widget) => ensureTradingViewHeatmapLink(widget));
}

let tradingViewHeatmapDebounceTimer;
function debouncedTradingViewHeatmapInit() {
	clearTimeout(tradingViewHeatmapDebounceTimer);
	tradingViewHeatmapDebounceTimer = setTimeout(
		updateTradingViewHeatmapLinks,
		250,
	);
}

if (window.location.hostname.includes(tradingviewURL)) {
	setTimeout(updateTradingViewHeatmapLinks, 1000);

	const observer = new MutationObserver((mutations) => {
		let shouldUpdate = false;

		for (const mutation of mutations) {
			if (mutation.type === "attributes") {
				if (mutation.target.closest?.(watchlistWidgetSelector)) {
					shouldUpdate = true;
					break;
				}
			}

			if (mutation.addedNodes.length > 0) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType !== 1) continue;

					if (
						node.matches?.(watchlistWidgetSelector) ||
						node.querySelector?.(watchlistWidgetSelector) ||
						node.matches?.(watchlistSymbolSelector) ||
						node.querySelector?.(watchlistSymbolSelector)
					) {
						shouldUpdate = true;
						break;
					}
				}
			}

			if (shouldUpdate) break;
		}

		if (shouldUpdate) {
			debouncedTradingViewHeatmapInit();
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [
			"data-active",
			"data-selected",
			"data-symbol-short",
			"data-symbol-full",
		],
	});
}

const processedCoinglassRows = new WeakSet();

function initCoinglassMainPageLinks() {
	const isMainPage = window.location.hostname === "www.coinglass.com";
	if (!isMainPage) return;

	const tableRows = document.querySelectorAll(
		".ant-table-tbody tr[data-row-key]",
	);
	let newRowsProcessed = 0;

	tableRows.forEach((row) => {
		if (processedCoinglassRows.has(row)) return;

		let symbolCell = null;
		let symbolLink = null;

		const cells = row.querySelectorAll("td");

		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i];
			const link = cell.querySelector("a");
			const textContent = cell.textContent.trim();

			if (link && textContent) {
				if (/^[A-Z0-9]{0,20}$/.test(textContent)) {
					symbolCell = cell;
					symbolLink = link;
					break;
				}
			}
		}

		if (!symbolCell || !symbolLink) return;

		if (symbolCell.querySelector(".coinglass-tv-link")) return;

		const symbolText = symbolLink.textContent.trim();
		if (!symbolText) return;

		const tvLink = document.createElement("a");
		tvLink.className = "coinglass-tv-link";
		tvLink.href = getCoinglassTVUrl(symbolText);
		tvLink.target = "_blank";
		tvLink.textContent = "TV";
		tvLink.onclick = (e) => e.stopPropagation();

		const tradingViewLink = document.createElement("a");
		tradingViewLink.className = "coinglass-tv-link";
		tradingViewLink.href = getTradingViewUrl(symbolText);
		tradingViewLink.target = "_blank";
		tradingViewLink.textContent = "TV";
		tradingViewLink.onclick = (e) => e.stopPropagation();

		const parentDiv = symbolLink.parentNode;
		parentDiv.style.display = "flex";
		parentDiv.style.alignItems = "center";
		parentDiv.style.gap = "4px";
		parentDiv.style.width = "fit-content";

		const parentSpan = parentDiv.parentNode;
		if (parentSpan && parentSpan.classList.contains("ant-table-cell-content")) {
			parentSpan.style.width = "fit-content";
		}

		parentDiv.insertBefore(tvLink, symbolLink.nextSibling);
		parentDiv.insertBefore(tradingViewLink, symbolLink.nextSibling);

		processedCoinglassRows.add(row);
		newRowsProcessed++;
	});

	if (newRowsProcessed > 0) {
		console.debug(`Processed ${newRowsProcessed} new CoinGlass table rows`);
	}
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

	const liquidationHeatmapButton = `
		<a class="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium liquidations-quick-link css-1jhxbfy"
		   href="https://www.coinglass.com/pro/futures/LiquidationHeatMap?coin=${cleanSymbol}"
		   target="_blank"
	  >
			Liq Heatmap
		</a>
	`;

	tvHeader.appendChild(separator);
	tvHeader.insertAdjacentHTML("beforeend", liquidationHeatmapButton);

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

if (
	window.location.hostname.includes(coinglassURL) &&
	!window.location.pathname.includes("/tv")
) {
	let debounceTimerCoinglass;
	function debouncedCoinglassInit() {
		clearTimeout(debounceTimerCoinglass);
		debounceTimerCoinglass = setTimeout(initCoinglassMainPageLinks, 300);
	}

	function waitForTableAndInit() {
		const hasDataRows =
			document.querySelectorAll(".ant-table-tbody tr[data-row-key]").length > 0;

		if (hasDataRows) {
			initCoinglassMainPageLinks();
		}
	}

	let retryCount = 0;
	const maxRetries = 10;
	const retryInterval = setInterval(() => {
		waitForTableAndInit();
		retryCount++;
		if (retryCount >= maxRetries) {
			clearInterval(retryInterval);
		}
	}, 500);

	const coinglassObserver = new MutationObserver((mutations) => {
		let shouldInit = false;

		for (const mutation of mutations) {
			if (mutation.addedNodes.length > 0) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === 1) {
						if (
							node.classList?.contains("ant-table-tbody") ||
							node.querySelector?.(".ant-table-tbody") ||
							node.classList?.contains("ant-table-row") ||
							(node.tagName === "TR" && node.hasAttribute("data-row-key"))
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
			debouncedCoinglassInit();
		}
	});

	coinglassObserver.observe(document.body, { childList: true, subtree: true });
}
