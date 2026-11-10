// /**
//  * Rewrites image src/srcset to the WebP proxy so the proxy can convert and
//  * downscale oversized bitmaps.
//  * Proxy: https://fly.webp.se/image?url=<image_url>
//  *
//  * Only raster formats the proxy actually shrinks are sent through it. SVGs
//  * would be rasterised (losing sharpness and currentColor), GIFs would lose
//  * animation, and WebP/AVIF are already compressed, so those are left alone.
//  * Measured over the site's images: PNG/JPEG came back ~81% smaller, while
//  * everything else came back byte-identical after an extra round trip.
//  */
// (() => {
// 	const PROXY = "https://fly.webp.se/image?url=";
// 	const PROXYABLE = /\.(?:png|jpe?g|bmp|tiff?)(?:[?#]|$)/i;
//
// 	function proxyUrl(raw) {
// 		if (!raw || raw.startsWith(PROXY) || raw.startsWith("data:") || raw.startsWith("blob:")) {
// 			return null;
// 		}
// 		if (!PROXYABLE.test(raw)) return null;
// 		try {
// 			return PROXY + new URL(raw, window.location.href).href;
// 		} catch {
// 			return null;
// 		}
// 	}
//
// 	function proxyImage(img) {
// 		if (!img || img.dataset.webpProxied) return;
//
// 		const original = img.getAttribute("src");
// 		const proxied = proxyUrl(original);
// 		if (!proxied) return;
//
// 		img.dataset.webpProxied = "true";
// 		img.dataset.webpOriginal = original;
//
// 		// The proxy 415s on a few hosts (github.com/user-attachments, some
// 		// wikimedia URLs). Fall back to the original instead of a broken image.
// 		img.addEventListener(
// 			"error",
// 			() => {
// 				delete img.dataset.webpProxied;
// 				img.removeAttribute("srcset");
// 				img.src = img.dataset.webpOriginal;
// 			},
// 			{ once: true },
// 		);
//
// 		img.src = proxied;
//
// 		if (img.srcset) {
// 			img.srcset = img.srcset
// 				.split(",")
// 				.map((item) => {
// 					const parts = item.trim().split(/\s+/);
// 					const entry = proxyUrl(parts[0]);
// 					if (entry) parts[0] = entry;
// 					return parts.join(" ");
// 				})
// 				.join(", ");
// 		}
// 	}
//
// 	function run() {
// 		const images = document.querySelectorAll("img");
// 		for (let i = 0; i < images.length; i++) {
// 			proxyImage(images[i]);
// 		}
// 	}
//
// 	if (document.readyState === "loading") {
// 		document.addEventListener("DOMContentLoaded", run);
// 	} else {
// 		run();
// 	}
//
// 	// Observe dynamic DOM changes (e.g. infinite scroll, lazy rendering)
// 	const observer = new MutationObserver((mutations) => {
// 		for (const mutation of mutations) {
// 			for (const node of mutation.addedNodes) {
// 				if (node.nodeType === Node.ELEMENT_NODE) {
// 					if (node.tagName === "IMG") {
// 						proxyImage(node);
// 					} else if (node.querySelectorAll) {
// 						const nested = node.querySelectorAll("img");
// 						for (let i = 0; i < nested.length; i++) {
// 							proxyImage(nested[i]);
// 						}
// 					}
// 				}
// 			}
// 		}
// 	});
//
// 	observer.observe(document.documentElement, {
// 		childList: true,
// 		subtree: true,
// 	});
// })();
