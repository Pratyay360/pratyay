// Pageview counter using GoatCounter's public counter endpoint.
//
// The path is rendered into the markup with data-path (Zine's $page.link()),
// so the count always matches the path the tracking pixel reports.
//
// GoatCounter replies 404 for paths that have no hits yet, but the body is
// still valid JSON ({"count": "0", "count_unique": "0"}), so the body must be
// parsed before the status is treated as a failure. Otherwise new posts would
// never show a count.
(() => {
	const el = document.querySelector("[data-view-counter]");
	if (!el) return;

	const path = el.dataset.path || window.location.pathname;
	const url =
		"https://pratyay.goatcounter.com/counter/" + encodeURIComponent(path) + ".json";

	fetch(url)
		.then((res) => res.json().catch(() => Promise.reject(new Error(`HTTP ${res.status}`))))
		.then((data) => {
			const count = Number(String(data.count).replace(/[^\d]/g, ""));
			if (!Number.isFinite(count)) throw new Error("invalid count");

			const output = el.querySelector("[data-views]");
			if (output) output.textContent = count.toLocaleString();

			const label = el.querySelector("[data-views-label]");
			if (label) label.textContent = count === 1 ? "view" : "views";

			el.hidden = false;
		})
		.catch(() => {
			// Only leave the counter hidden when GoatCounter is genuinely
			// unreachable or public counts are disabled.
			el.hidden = true;
		});
})();
