/**
	Prism Live: Code editor based on Prism.js
	Works best in Chrome. Currently only very basic support in other browsers (no snippets, no shortcuts)
	@author Lea Verou
*/
(async function() {
"use strict";

const $ = Bliss, $$ = Bliss.$;
let ready = Promise.resolve();

if (document.currentScript) {
	// Tiny dynamic loader. Use e.g. ?load=css,markup,javascript to load components
	const base = document.currentScript.src;
	const load = new URL(base).searchParams.get("load");

	if (load !== null) {
		const files = ["../prism-live.css"];

		if (load) {
			files.push(...load.split(/,/).map(c => /\./.test(c)? c : `prism-live-${c}.js`));
		}

		ready = Promise.all(files.map(url => $.load(url, base)));
	}
}

const superKey = navigator.platform.startsWith("Mac") ? "metaKey" : "ctrlKey";

const _ = Prism.Live = class PrismLive {
	constructor(source) {
		this.source = source;
		this.sourceType = source.nodeName.toLowerCase();

		this.wrapper = $.create({
			className: "prism-live",
			around: this.source
		});

		if (this.sourceType === "textarea") {
			this.textarea = this.source;
			this.code = $.create("code");

			this.pre = $.create("pre", {
				className: `${this.textarea.className} no-whitespace-normalization line-numbers`,
				contents: this.code,
				before: this.textarea
			});
		}
		else {
			this.pre = this.source;

			this.textarea = $.create("textarea", {
				className: this.pre.className,
				value: this.pre.textContent,
				after: this.pre
			});
		}

		_.all.set(this.textarea, this);
		_.all.set(this.pre, this);
		_.all.set(this.code, this);

		this.pre.classList.add("prism-live");
		this.textarea.classList.add("prism-live");

		if (self.Incrementable) {
			// TODO data-* attribute for modifier
			// TODO load dynamically if not present
			new Incrementable(this.textarea);
		}

		$.bind(this.textarea, {
			input: this.update.bind(this),

			keyup: evt => {
				if (evt.key == "Enter") { // Enter
					// Maintain indent on line breaks
					this.insert(this.currentIndent);
					this.syncScroll();
				}
			},

			keydown: evt => {
				if (evt.key == "Tab" && !evt.altKey) {
					// Default is to move focus off the textarea
					// this is never desirable in an editor
					evt.preventDefault();

					if (this.tabstops && this.tabstops.length > 0) {
						// We have tabstops to go
						this.moveCaret(this.tabstops.shift());
					}
					else if (this.hasSelection) {
						const before = this.beforeCaret("\n");
						const outdent = evt.shiftKey;

						this.selectionStart -= before.length;

						const selection = _.adjustIndentation(this.selection, {
							relative: true,
							indentation: outdent ? -1 : 1
						});

						this.replace(selection);

						if (outdent) {
							const indentStart = _.regexp.gm`^${this.indent}`;
							const isBeforeIndented = indentStart.test(before);
							this.selectionStart += before.length + 1 - (outdent + isBeforeIndented);
						}
						else { // Indent
							const hasLineAbove = before.length == this.selectionStart;
							this.selectionStart += before.length + 1 + !hasLineAbove;
						}
					}
					else {
						// Nothing selected, expand snippet
						/*const selector = _.match(this.beforeCaret(), /\S*$/);
						const snippetExpanded = this.expandSnippet(selector);

						if (snippetExpanded) {
							requestAnimationFrame(() => $.fire(this.textarea, "input"));
						}
						else {
							this.insert(this.indent);
						}*/
					}
				}
				else if(_.pairs[evt.key]) {
					const other = _.pairs[evt.key];
					this.wrapSelection({
						before: evt.key,
						after: other,
						outside: true
					});
					evt.preventDefault();
				}
				else {
					for (const shortcut in _.shortcuts) {
						if (_.checkShortcut(shortcut, evt)) {
							_.shortcuts[shortcut].call(this, evt);
							evt.preventDefault();
						}
					}
				}
			},
/*
			click: evt => {
				const l = this.getLine();
				const v = this.value;
				const ss = this.selectionStart;
				//console.log(ss, v[ss], l, v.slice(l.start, l.end));
			},
*/
			"click keyup": evt => {
				if (!evt.key || evt.key.lastIndexOf("Arrow") > -1) {
					// Caret moved
					this.tabstops = null;
				}
			}
		});

		// this.syncScroll();
		this.textarea.addEventListener("scroll", this, {passive: true});

		$.bind(window, {
			"resize": evt => this.syncStyles()
		});

		// Copy styles with a delay
		requestAnimationFrame(() => {
			this.syncStyles();

			const sourceCS = getComputedStyle(this.source);
			const { style } = this.source;

			this.pre.style.height = style.height || sourceCS.getPropertyValue("--height");
			this.pre.style.maxHeight = style.maxHeight || sourceCS.getPropertyValue("--max-height");
		});

		this.update();
		this.lang = this.code.className.match(/lang(?:uage)?-(\w+)/i)[1];
	}

	handleEvent(evt) {
		if (evt.type === "scroll") {
			this.syncScroll();
		}
	}

	expandSnippet(text) {
		if (!text) {
			return false;
		}

		const context = this.context;
		let expansion;

		if (text in context.snippets || text in _.snippets) {
			// Static Snippets
			expansion = context.snippets[text] || _.snippets[text];
		}
		else if (context.snippets.custom) {
			expansion = context.snippets.custom.call(this, text);
		}

		if (expansion) {
			// Insert snippet
			const stops = [];
			const replacements = [];
			let str = expansion;
			let match;

			while (match = _.CARET_INDICATOR.exec(str)) {
				stops.push(match.index + 1);
				replacements.push(str.slice(0, match.index + match[1].length));
				str = str.slice(match.index + match[0].length);
				_.CARET_INDICATOR.lastIndex = 0;
			}

			replacements.push(str);
			const replacement = replacements.join("");

			if (stops.length > 0) {
				// make first stop relative to end, all others relative to previous stop
				stops[0] -= replacement.length;
			}

			this.delete(text);
			this.insert(replacement, {matchIndentation: true});
			this.tabstops = stops;
			this.moveCaret(this.tabstops.shift());
		}

		return !!expansion;
	}

	get selectionStart() {
		return this.textarea.selectionStart;
	}
	set selectionStart(v) {
		this.textarea.selectionStart = v;
	}

	get selectionEnd() {
		return this.textarea.selectionEnd;
	}
	set selectionEnd(v) {
		this.textarea.selectionEnd = v;
	}

	get hasSelection() {
		return this.selectionStart != this.selectionEnd;
	}

	get selection() {
		return this.value.slice(this.selectionStart, this.selectionEnd);
	}

	get value() {
		return this.textarea.value;
	}
	set value(v) {
		this.textarea.value = v;
	}

	get indent() {
		return _.match(this.value, /^[\t ]+/m, _.DEFAULT_INDENT);
	}

	get currentIndent() {
		const before = this.value.slice(0, this.selectionStart-1);
		return _.match(before, /^[\t ]*/mg, "", -1);
	}

	// Current language at caret position
	get currentLanguage() {
		const node = this.getNode()?.parentNode || this.code;
		const lang = _.match(node.closest('[class*="language-"]').className, /language-(\w+)/, 1);
		return _.aliases[lang] || lang;
	}

	// Get settings based on current language
	get context() {
		const lang = this.currentLanguage;
		return _.languages[lang] || _.languages.DEFAULT;
	}

	update() {
		let code = this.value;

		if (/\n$/.test(code)) {
			code += "\u200b";
		}

		this.code.textContent = code;

		Prism.highlightElement(this.code);
	}

	syncStyles() {
		// Copy pre metrics over to textarea
		const cs = getComputedStyle(this.pre);

		// Copy styles from <pre> to textarea
		this.textarea.style.caretColor = cs.color;

		const properties = /^(font|lineHeight)|[tT]abSize/gi;

		for (const prop in cs) {
			if (cs[prop] && prop in this.textarea.style && properties.test(prop)) {
				this.wrapper.style[prop] = cs[prop];
				this.textarea.style[prop] = this.pre.style[prop] = "inherit";
			}
		}

		this.textarea.style.paddingLeft = cs.paddingLeft;
		this.textarea.style.paddingTop = cs.paddingTop;

		this.update();
	}

	syncScroll() {
		if (this.pre.clientWidth === 0 && this.pre.clientHeight === 0) {
			return;
		}

		this.pre.scrollTop = this.textarea.scrollTop;
		this.pre.scrollLeft = this.textarea.scrollLeft;
	}

	beforeCaretIndex(until = "") {
		return this.value.lastIndexOf(until, this.selectionStart);
	}

	afterCaretIndex(until = "") {
		return this.value.indexOf(until, this.selectionEnd);
	}

	beforeCaret(until = "") {
		let index = this.beforeCaretIndex(until);

		if (index === -1 || !until) {
			index = 0;
		}

		return this.value.slice(index, this.selectionStart);
	}

	getLine(offset = this.selectionStart) {
		const value = this.value;
		const lf = "\n", cr = "\r";
		let start, end, char;

		for (start = offset; char = value[start]; start--) {
			if (char === lf || char === cr || !start) {
				break;
			}
		}

		for (end = this.selectionStart; char = value[end]; end++) {
			if (char === lf || char === cr) {
				break;
			}
		}

		return {start, end};
	}

	afterCaret(until = "") {
		let index = this.afterCaretIndex(until);

		if (index === -1 || !until) {
			index = undefined;
		}

		return this.value.slice(this.selectionEnd, index);
	}

	setCaret(pos) {
		this.selectionStart = this.selectionEnd = pos;
	}

	moveCaret(chars) {
		if (chars) {
			this.setCaret(this.selectionEnd + chars);
		}
	}

	insert(text, {index} = {}) {
		if (!text) {
			return;
		}

		this.textarea.focus();

		if (index === undefined) {
			// No specified index, insert in current caret position
			this.replace(text);
		}
		else {
			// Specified index, first move caret there
			const start = this.selectionStart;
			const end = this.selectionEnd;

			this.selectionStart = this.selectionEnd = index;
			this.replace(text);

			this.selectionStart = start + (index < start? text.length : 0);
			this.selectionEnd = end + (index <= end? text.length : 0);
		}
	}

	// Replace currently selected text
	replace(text) {
		if (_.supportsExecCommand) {
			const hadSelection = this.hasSelection;
			document.execCommand("insertText", false, text);
			if (hadSelection) {
				// By default inserText places the caret at the end, losing any selection
				// What we want instead is the replaced text to be selected
				this.selectionStart = this.selectionEnd - text.length;
			}
		}
		else {
			this.textarea.setRangeText(text);
			this.update();
		}
	}

	// Set text between indexes and restore caret position
	set(text, {start, end} = {}) {
		if (_.supportsExecCommand) {
			const ss = this.selectionStart;
			const se = this.selectionEnd;

			this.selectionStart = start;
			this.selectionEnd = end;

			document.execCommand("insertText", false, text);

			this.selectionStart = ss;
			this.selectionEnd = se;
		}
		else {
			this.textarea.setRangeText(text);
			this.update();
		}
	}

	/**
	 * Wrap text with strings
	 * @param before {String} The text to insert before
	 * @param after {String} The text to insert after
	 * @param start {Number} Character offset
	 * @param end {Number} Character offset
	 */
	wrap({before, after, start = this.selectionStart, end = this.selectionEnd} = {}) {
		let ss = this.selectionStart;
		let se = this.selectionEnd;
		const between = this.value.slice(start, end);

		this.set(before + between + after, {start, end});

		if (ss > start) {
			ss += before.length;
		}

		if (se > start) {
			se += before.length;
		}

		if (ss > end) {
			ss += after.length;
		}

		if (se > end) {
			se += after.length;
		}

		this.selectionStart = ss;
		this.selectionEnd = se;
	}

	wrapSelection(o = {}) {
		const hadSelection = this.hasSelection;

		this.replace(o.before + this.selection + o.after);

		if (hadSelection) {
			if (o.outside) {
				// Do not include new text in selection
				this.selectionStart += o.before.length;
				this.selectionEnd -= o.after.length;
			}
		}
		else {
			this.moveCaret(-o.after.length);
		}
	}

	toggleComment() {
		let comments = this.context.comments;

		// Are we inside a comment?
		const commentNode = this.getNode().parentNode.closest(".token.comment");

		if (commentNode) {
			// Remove comment
			const start = this.getOffset(commentNode);
			const commentText = commentNode.textContent;

			if (comments.singleline && commentText.indexOf(comments.singleLine) === 0) {
				// TODO
			}
			else {
				comments = comments.multiline || comments;
				const end = start + commentText.length - comments[1].length;
				this.set(this.value.slice(start + comments[0].length, end), {start, end: end + comments[1].length});
			}
		}
		else {
			// Not inside comment, add
			if (this.hasSelection) {
				comments = comments.multiline || comments;

				this.wrapSelection({
					before: comments[0],
					after: comments[1]
				});
			}
			else {
				// No selection, wrap line
				// FIXME *inside indent*
				comments = comments.singleline
					? [comments.singleline, "\n"]
					: comments.multiline || comments;
				const end = this.afterCaretIndex("\n");
				this.wrap({
					before: comments[0],
					after: comments[1],
					start: this.beforeCaretIndex("\n") + 1,
					end: end < 0? this.value.length : end
				});
			}
		}
	}

	duplicateContent() {
		const before = this.beforeCaret("\n");
		const after = this.afterCaret("\n");
		const text = before + this.selection + after;

		this.insert(text, {index: this.selectionStart - before.length});
	}

	delete(characters, {forward, pos} = {}) {
		characters = characters > 0 ? characters : (characters + "").length;

		if (pos) {
			const selectionStart = this.selectionStart;
			this.selectionStart = pos;
			this.selectionEnd = pos + this.selectionEnd - selectionStart;
		}

		for (let i = characters; i !== 0; i--) {
			document.execCommand(forward ? "forwardDelete" : "delete");
		}

		if (pos) {
			// Restore caret
			this.selectionStart = selectionStart - characters;
			this.selectionEnd = this.selectionEnd - pos + this.selectionStart;
		}
	}

	/**
	 * Get the text node at a given chracter offset
	 */
	getNode(offset = this.selectionStart, container = this.code) {
		let node, sum = 0;
		const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

		while (node = walk.nextNode()) {
			sum += node.data.length;

			if (sum >= offset) {
				return node;
			}
		}

		// if here, offset is larger than maximum
		return null;
	}

	/**
	 * Get the character offset of a given node in the highlighted source
	 */
	getOffset(node) {
		const range = document.createRange();
		range.selectNodeContents(this.code);
		range.setEnd(node, 0);
		return range.toString().length;
	}

	// Utility method to get regex matches
	static match(str, regex, def, index = 0) {
		if (typeof def === "number" && arguments.length === 3) {
			index = def;
			def = undefined;
		}

		const match = str.match(regex);

		if (index < 0) {
			index = match.length + index;
		}

		return match ? match[index] : def;
	}

	static checkShortcut(shortcut, evt) {
		return shortcut.trim().split(/\s*\+\s*/).every(key => {
			switch (key) {
				case "Cmd":   return evt[superKey];
				case "Ctrl":  return evt.ctrlKey;
				case "Shift": return evt.shiftKey;
				case "Alt":   return evt.altKey;
				default: return evt.key === key;
			}
		});
	}

	static registerLanguage(name, context, parent = _.languages.DEFAULT) {
		Object.setPrototypeOf(context, parent);
		return _.languages[name] = context;
	}

	static matchIndentation(text, currentIndent) {
		// FIXME this assumes that text has no indentation of its own
		// to make this more generally useful beyond snippets, we should first
		// strip text's own indentation.
		text = text.replace(/\r?\n/g, "$&" + currentIndent);
	}

	static adjustIndentation(text, {indentation, relative = true, indent = _.DEFAULT_INDENT}) {
		if (!relative) {
			// First strip min indentation
			const minIndent = text.match(_.regexp.gm`^(${indent})+`).sort()[0];

			if (minIndent) {
				text.replace(_.regexp.gm`^${minIndent}`, "");
			}
		}

		if (indentation < 0) {
			return text.replace(_.regexp.gm`^${indent}`, "");
		}
		else if (indentation > 0) { // Indent
			return text.replace(/^/gm, indent);
		}
	}
};

// Static properties
Object.assign(_, {
	all: new WeakMap(),
	ready,
	DEFAULT_INDENT: "\t",
	CARET_INDICATOR: /(^|[^\\])\$(\d+)/g,
	snippets: {
		"test": "Snippets work!",
	},
	pairs: {
		// removed these on-purpose
	},
	shortcuts: {
		"Cmd + /": function() {
			this.toggleComment();
		},
		"Ctrl + Shift + D": function() {
			this.duplicateContent();
		}
	},
	languages: {
		DEFAULT: {
			comments: {
				multiline: ["/*", "*/"]
			},
			snippets: {}
		}
	},
	// Map of Prism language ids and their canonical name
	aliases: (() => {
		const ret = {};
		const canonical = new WeakMap(
			Object.entries(Prism.languages).map(x => x.reverse()).reverse()
		);

		for (const id in Prism.languages) {
			const grammar = Prism.languages[id];

			if (typeof grammar !== "function") {
				ret[id] = canonical.get(grammar);
			}
		}

		return ret;
	})(),

	regexp: (() => {
		const escape = s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
		const _regexp = (flags, strings, ...values) => {
			const pattern = strings[0] + values.map((v, i) => escape(v) + strings[i+1]).join("");
			return RegExp(pattern, flags);
		};
		const cache = {};

		return new Proxy(_regexp.bind(_, ""), {
			get: (t, property) => {
				return t[property] || cache[property]
					   || (cache[property] = _regexp.bind(_, property));
			}
		});
	})()
});

$.ready().then(() => {
	const t = $.create("textarea", {inside: document.body});
	t.focus();
	document.execCommand("insertText", false, "a");
	_.supportsExecCommand = !!t.value;
	t.remove();

	$$(":not(.prism-live) > textarea.prism-live").forEach(textarea => {
		if (!_.all.get(textarea)) {
			new _(textarea);
		}
	});
});

})(); // end IIFE
