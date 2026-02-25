
browser.storage.local.onChanged.addListener(location.reload.bind(location));

const $ = Bliss, $$ = Bliss.$;
const {
	whitelist = "",
	blacklist = "",
	customCSSObj = {},
} = await browser.storage.local.get();

$("#whitelist").innerText = whitelist?.hostnames || "none";
$("#blacklist").innerText = blacklist?.hostnames || "none";

function createSection(title, url, contents, parent = main) {
	return $.create("details", {
		contents: [
			{ tag: "summary", contents: [title] },
			url ? { tag: "a", href: `https://${url}`, target: "_blank", contents: ["Open in a new tab"] } : "",
			{ tag: "div", className: "codeContainer", contents: [
				{ tag: "pre", contents: [
					{ tag: "code", className: "language-css", contents },
				] },
			]},
		],
		inside: parent,
	});
}

const main = $("main");
if(customCSSObj.css)
	createSection("Global rules", null, customCSSObj.css);
delete customCSSObj.css;

const domains = {};
const css = Symbol("css");

for(const key in customCSSObj)
{
	const pathStart = key.indexOf("/");
	if(pathStart === -1)
	{
		if(key in domains)
			domains[key][css] = customCSSObj[key];
		else
			domains[key] = { [css]: customCSSObj[key] };
	}
	else
	{
		const domain = key.substring(0, pathStart);
		const path = key.substring(pathStart);
		if(domain in domains)
			domains[domain][path] = customCSSObj[key];
		else
			domains[domain] = { [path]: customCSSObj[key] };
	}
}

for(const [domainName, domain] of Object.entries(domains).sort(sortByLocation))
{
	const domainElement = createSection(domainName, domainName, domain[css] || "");
	for(const [path, pathCSS] of Object.entries(domain).sort(sortByLocation))
		createSection(path, domainName+path, pathCSS, $(".codeContainer", domainElement));
}

function sortByLocation([la], [lb]) {
	return la > lb ? 1 : -1;
}

Prism.highlightAllUnder(main);