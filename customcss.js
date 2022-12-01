
// When page loads, call function to get CSS from storage
const customCSSObj = browser.storage.local.get();
customCSSObj.then(onGot, onError);

// Get CSS and whitelist/blacklist from storage object and call apply()
function onGot(items) {
	apply(items.customCSSObj, items.whitelist, items.blacklist);
}

// Error checking when obtaining CSS from storage
function onError(error) {
	console.info("An error occurred: " + error);
}

// Defines a listener for the storage for when custom CSS changes in Options
browser.storage.onChanged.addListener(update);

// When custom CSS is changed this function is called.
// Extracts the CSS as a string and calls apply()
function update(changes, area) {
	browser.storage.local.get().then(onGot, onError);
}

// Takes in a String parameter of the CSS code and applies it to the DOM
// or updates the DOM if the style element already exists.
// Conditional statements for whitelist and blacklists if user applied.
function apply(customCSSObj, whitelist, blacklist) {
	console.log("[CustomCSS Injector] Applied custom CSS.");
	var css = filterCustomCSSObj(customCSSObj);
	var hostname = window.location.hostname;
	var cssLink = document.getElementById("custom-css-injector");
	if (whitelist.hostnames == "" || whitelist.hostnames == null || whitelist.hostnames.includes(hostname)) {
		if (!blacklist.hostnames.includes(hostname)) {
			if (cssLink == null) {
				var cssLink = document.createElement("style");
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

// Checks for site-specific or domain-specific applied CSS and returns it to apply()
function filterCustomCSSObj(customCSSObj) {
	var url = window.location.href;
	var domain = window.location.hostname;
	for (var key in customCSSObj) {
		if (key == url) {
			return customCSSObj[key];
		}
		else if (key == domain) {
			return customCSSObj[key];
		}
	}
	return customCSSObj.css;

}

// Handles message from Popup script and returns the URL and DOMAIN name of the active tab.
browser.runtime.onMessage.addListener(request => {
  return Promise.resolve({domain: window.location.hostname, url: window.location.href});
});
