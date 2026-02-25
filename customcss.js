"use strict";

function update() {
	browser.storage.local.get().then(onGot, onError);
}

update();
browser.storage.local.onChanged.addListener(update);

// Get CSS and whitelist/blacklist from storage object and call apply()
function onGot(items) {
	if (items.customCSSObj !== null) {
		apply(items.customCSSObj, items.whitelist, items.blacklist);
	}
}

// Error checking when obtaining CSS from storage
function onError(error) {
	console.info("An error occurred: " + error);
}

// Takes in a String parameter of the CSS code and applies it to the DOM
// or updates the DOM if the style element already exists.
// Conditional statements for whitelist and blacklists if user applied.
function apply(customCSSObj, whitelist, blacklist) {
	console.log("[CustomCSS Injector] Applied custom CSS.");
	const css = filterCustomCSSObj(customCSSObj);
	const hostname = window.location.hostname;
	const cssLink = document.getElementById("custom-css-injector");
	if (!whitelist.hostnames || whitelist.hostnames.includes(hostname)) {
		if (!blacklist.hostnames.includes(hostname)) {
			if (cssLink === null) {
				const cssLink = document.createElement("style");
				cssLink.setAttribute("type", "text/css");
				cssLink.setAttribute("id", "custom-css-injector");
				cssLink.textContent = css;
				document.documentElement.appendChild(cssLink);
				return;
			}
			else {
				cssLink.textContent = css;
				return;
			}
		}
	}
	if (cssLink != null) {
		cssLink.parentElement.removeChild(cssLink);
	}
}

function getUrl() {
	return window.location.hostname + window.location.pathname;
}

// Checks for site-specific or domain-specific applied CSS and returns it to apply()
function filterCustomCSSObj(customCSSObj) {
	if (customCSSObj == null) {
		return "";
	}
	const url = getUrl();
	const domain = window.location.hostname;
	const css = [
		customCSSObj.css, // global rules
		customCSSObj[domain],
		customCSSObj[url],
	];
	return css.filter(Boolean).join("\n");
}

// Handles message from Popup script and returns the URL and DOMAIN name of the active tab.
browser.runtime.onMessage.addListener(request => {
  return Promise.resolve({domain: window.location.hostname, url: getUrl()});
});
