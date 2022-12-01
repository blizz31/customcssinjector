document.getElementById("txtAreaCSS").value = "";

// Starting point at which we get the URL and DOMAIN of the active tab.
obtainActiveTabData();
// Active tab variables
var activeTabDomain;
var activeTabUrl;
// JSON Object that contains all CSS
var tempCSSObj;

// Get stored CSS object from local storage.
function getCSSObject() {
	var customCSSObj = browser.storage.local.get();
	customCSSObj.then(onGot, onError);
}

// When stored CSS is obtained, fill text fields appropriately.
function onGot(items) {
	document.getElementById("txtAreaCSS").value = filterCustomCSSObj(items.customCSSObj);
	document.getElementById("whitelistText").value = items.whitelist.hostnames;
	document.getElementById("blacklistText").value = items.blacklist.hostnames;
}

// Checks the current active tab domain/url against the CSS object and applies appropriate radio button
function filterCustomCSSObj(customCSSObj) {
	if (!customCSSObj) {customCSSObj = {};}
	tempCSSObj = customCSSObj; // Set global css in temp object to retain global style-sheet.
	for (var key in customCSSObj) {
		if (key == activeTabDomain) {
			document.getElementById("rdomain").checked = true;
			document.getElementById("rglobal").checked = false;
			document.getElementById("rurl").checked = false;
			return customCSSObj[key];
		}
		else if (key == activeTabUrl) {
			document.getElementById("rurl").checked = true;
			document.getElementById("rglobal").checked = false;
			document.getElementById("rdomain").checked = false;
			return customCSSObj[key];
		}
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
	var customCSS = document.getElementById("txtAreaCSS").value;
	var whitelistHostnames = document.getElementById("whitelistText").value;
	var blacklistHostnames = document.getElementById("blacklistText").value;
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
	var customCSSObj = tempCSSObj;
	customCSSObj = cleanup(customCSSObj);
	browser.storage.local.set({
		customCSSObj
	});
	browser.storage.local.set({
		whitelist: {
			hostnames: whitelistHostnames
		}
	});
	browser.storage.local.set({
		blacklist: {
			hostnames: blacklistHostnames
		}
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
	for (var key in customCSSObj) {
		if (customCSSObj[key] == "") {
			delete customCSSObj[key];
		}
	}
	return customCSSObj;
}


