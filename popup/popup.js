"use strict";
document.getElementById("txtAreaCSS").value = "";

// Starting point at which we get the URL and DOMAIN of the active tab.
obtainActiveTabData();
// Active tab variables
let activeTabDomain;
let activeTabUrl;
// JSON Object that contains all CSS
let tempCSSObj;

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

const rglobal = document.getElementById("rglobal");
const rurl = document.getElementById("rurl");
const rdomain = document.getElementById("rdomain");

rglobal.addEventListener("change", function(event) {
	if(this.checked)
		document.getElementById("txtAreaCSS").value = tempCSSObj.css || "";
});
rurl.addEventListener("change", function(event) {
	if(this.checked)
		document.getElementById("txtAreaCSS").value = tempCSSObj[activeTabUrl] || "";
});
rdomain.addEventListener("change", function(event) {
	if(this.checked)
		document.getElementById("txtAreaCSS").value = tempCSSObj[activeTabDomain] || "";
});

// Checks the current active tab domain/url against the CSS object and applies appropriate radio button
function filterCustomCSSObj(customCSSObj) {
	if (!customCSSObj) {customCSSObj = {};}
	tempCSSObj = customCSSObj; // Set global css in temp object to retain global style-sheet.
	if (activeTabUrl in customCSSObj) {
		rurl.checked = true;
		return customCSSObj[activeTabUrl];
	}
	if (activeTabDomain in customCSSObj) {
		rdomain.checked = true;
		return customCSSObj[activeTabDomain];
	}
	if (customCSSObj.css == null) {
		return "";
	}
	else {
		return customCSSObj.css;	
	}
}

// Error handling
function onError(error) {
	console.info("An error occurred: " + error);
}

// Upon clicking 'Save', save the custom CSS to browser storage
// This will call update() in customcss.js and apply the CSS to the DOM
document.getElementById("btnSubmit").addEventListener("click", function() {
	const customCSS = document.getElementById("txtAreaCSS").value;
	const whitelistHostnames = document.getElementById("whitelistText").value;
	const blacklistHostnames = document.getElementById("blacklistText").value;
	// Check radio buttons and apply appropriate LocalStorage configuration
	if (rglobal.checked) {
		tempCSSObj.css = customCSS;
	}
	else if (rurl.checked) {
		tempCSSObj[activeTabUrl] = customCSS;
	}
	else {
		tempCSSObj[activeTabDomain] = customCSS;
	}
	
	browser.storage.local.set({
		customCSSObj: cleanup(tempCSSObj),
		whitelist: { hostnames: whitelistHostnames },
		blacklist: { hostnames: blacklistHostnames },
	});
});

function onError(error) {
  console.error(error);
}

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
	for (const key in customCSSObj) {
		if (customCSSObj[key] == "") {
			delete customCSSObj[key];
		}
	}
	return customCSSObj;
}


document.getElementById("btnOverview").addEventListener("click", () => {
	window.open("/overview/index.html");
})
