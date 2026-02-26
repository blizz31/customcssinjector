"use strict";
document.getElementById("txtAreaCSS").value = "";

// Active tab variables
let activeTabDomain;
let activeTabUrl;
// JSON Object that contains all CSS
let tempCSSObj;

// Starting point at which we get the URL and DOMAIN of the active tab.
obtainActiveTabData();

// Get stored CSS object from local storage.
function getCSSObject() {
	browser.storage.local.get().then(onGot, onError);
}

// When stored CSS is obtained, fill text fields appropriately.
function onGot(items) {
	document.getElementById("txtAreaCSS").value = filterCustomCSSObj(items.customCSSObj);
	document.getElementById("whitelistText").value = items.whitelist?.hostnames || "";
	document.getElementById("blacklistText").value = items.blacklist?.hostnames || "";
}

// Checks the current active tab domain/url against the CSS object and applies appropriate radio button
function filterCustomCSSObj(customCSSObj) {
	tempCSSObj = customCSSObj || {}; // Set global css in temp object to retain global style-sheet.
	if (activeTabUrl in tempCSSObj) {
		document.getElementById("rurl").checked = true;
		return tempCSSObj[activeTabUrl];
	}
	if (activeTabDomain in tempCSSObj) {
		document.getElementById("rdomain").checked = true;
		return tempCSSObj[activeTabDomain];
	}

	return tempCSSObj.css || "";
}

// Upon clicking 'Save', save the custom CSS to browser storage
// This will call update() in customcss.js and apply the CSS to the DOM
document.getElementById("btnSubmit").addEventListener("click", function() {
	const customCSS = document.getElementById("txtAreaCSS").value;
	const whitelistHostnames = document.getElementById("whitelistText").value;
	const blacklistHostnames = document.getElementById("blacklistText").value;
	// Check radio buttons and apply appropriate LocalStorage configuration
	if (document.getElementById("rglobal").checked) {
		tempCSSObj.css = customCSS;
		delete tempCSSObj[activeTabDomain];
		delete tempCSSObj[activeTabUrl];
	}
	else if (document.getElementById("rurl").checked) {
		tempCSSObj[activeTabUrl] = customCSS;
		delete tempCSSObj[activeTabDomain];
	}
	else {
		tempCSSObj[activeTabDomain] = customCSS;		
		delete tempCSSObj[activeTabUrl];
	}
	
	browser.storage.local.set({
		customCSSObj: cleanup(tempCSSObj),
		whitelist: { hostnames: whitelistHostnames },
		blacklist: { hostnames: blacklistHostnames },
	});
});

// Send the message to the content_script and wait for response which will contain the URL and DOMAIN. 
// Once URL/DOMAIN variables are set, then get the stored CSS and apply it to the textbox.
function sendMessageToTabs(tabs) {
    browser.tabs.sendMessage(
      tabs[0].id,
      {message: "getwebsitedata" }
    ).then(response => {
      activeTabDomain = response.domain;
	  activeTabUrl = response.url;
	  getCSSObject(); 
    }).catch(onError);
}

// Set up a message to send to the content_script to trigger it to respond with the URL and DOMAIN 
function obtainActiveTabData() {
	browser.tabs.query({
		currentWindow: true,
		active: true
	}).then(sendMessageToTabs).catch(onError);	
}

// Checks for and removes empty string values in customCSSObj
function cleanup(customCSSObj) {
	if (!customCSSObj.css) {
		delete customCSSObj.css;
	}
	if (!customCSSObj[activeTabDomain]) {
		delete customCSSObj[activeTabDomain];
	}
	if (!customCSSObj[activeTabUrl]) {
		delete customCSSObj[activeTabUrl];
	}
	return customCSSObj;
}


// Error handling
function onError(error) {
	console.info("An error occurred: ", error);
}
