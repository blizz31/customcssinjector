"use strict";
Prism.Live.registerLanguage("css", {
	snippets: {
		custom(property) {
			const style = document.documentElement.style;

			if(!/^--/.test(property) && !(property in style))
			{
				// Nonexistent property, try as a shortcut
				const allProperties = Object.keys(style)
									.map(a => a.replace(/[A-Z]/g, $0 => "-" + $0.toLowerCase()));
				const properties = allProperties.filter(p => {
					return p.indexOf(property) === 0 // starts with
						|| p.split("-").map(b => b[0]).join("") === property; // abbreviation
				}).sort((a, b) => a.length - b.length);

				if(properties.length)
				{
					// Many options, don't add the 1.5 colons (mimic terminal autocomplete)
					if(properties.length > 1)
						return properties[0];

					property = properties[0];
				}
			}

			return `${property}: $1;`;
		}
	}
});
