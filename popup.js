document.addEventListener("DOMContentLoaded", function () {
	loadSettings();
	document.getElementById("save").addEventListener("click", saveSettings);
});

function loadSettings() {
	browser.storage.sync
		.get({
			exchange: "binance",
		})
		.then(function (items) {
			document.getElementById("exchange").value = items.exchange;
		});
}

function saveSettings() {
	const settings = {
		exchange: document.getElementById("exchange").value,
	};

	browser.storage.sync.set(settings).then(function () {
		const status = document.getElementById("status");
		status.textContent = "✓ Saved!";
		setTimeout(() => {
			status.textContent = "";
		}, 2000);

		browser.tabs
			.query({ active: true, currentWindow: true })
			.then(function (tabs) {
				browser.tabs
					.sendMessage(tabs[0].id, {
						action: "settingsChanged",
						settings: settings,
					})
					.catch(() => {});
			});
	});
}
