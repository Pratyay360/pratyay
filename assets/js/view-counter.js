// Pageview counter using GoatCounter's public counter endpoint.
//
// The path is rendered into the markup with data-path (Zine's $page.link()),
// so the count always matches the path the tracking pixel reports.
(() => {
	const el = document.querySelector("[data-view-counter]");
	if (!el) return;

	const path = el.dataset.path || window.location.pathname;
	const url =
		"https://pratyay.goatcounter.com/counter/" + encodeURIComponent(path) + ".json";

	fetch(url)
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		})
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
			// Leave the counter hidden if GoatCounter is unreachable, the
			// page has no hits yet, or public counts are disabled.
			el.hidden = true;
		});
})();
