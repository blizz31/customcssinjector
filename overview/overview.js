
const $ = Bliss, $$ = Bliss.$;
const {
	whitelist = "",
	blacklist = "",
	customCSSObj = {},
} = await browser.storage.local.get();

$("#whitelist").innerText = whitelist?.hostnames || "none";
$("#blacklist").innerText = blacklist?.hostnames || "none";

function createSection(title, contents, parent = main) {
	return $.create("details", {
		contents: [
			{ tag: "summary", contents: [title] },
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
	createSection("Global rules", customCSSObj.css);
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

for(const [domainName, domain] of Object.entries(domains))
{
	const domainElement = createSection(domainName, domain[css] || "");
	for(const path in domain)
		createSection(path, domain[path], $(".codeContainer", domainElement));
}

Prism.highlightAllUnder(main);