/**
 * Node.js
 *
 * Copyright 2010, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://tinymce.moxiecode.com/license
 * Contributing: http://tinymce.moxiecode.com/contributing
 */

(function(tinymce) {
	var whiteSpaceRegExp = /^[ \t\r\n]*$/;

	// Walks the tree left/right
	function walk(node, root_node, prev) {
		var sibling, parent, startName = prev ? 'lastChild' : 'firstChild', siblingName = prev ? 'prev' : 'next';

		// Walk into nodes if it has a start
		if (node[startName])
			return node[startName];

		// Return the sibling if it has one
		if (node !== root_node) {
			sibling = node[siblingName];

			if (sibling)
				return sibling;

			// Walk up the parents to look for siblings
			for (parent = node.parent; parent && parent !== root_node; parent = parent.parent) {
				sibling = parent[siblingName];

				if (sibling)
					return sibling;
			}
		}
	};

	/**
	 * This class is a minimalistic implementation of a DOM like node used by the DomParser class.
	 *
	 * @example
	 * var node = new tinymce.html.Node('strong', 1);
	 * someRoot.append(node);
	 *
	 * @class tinymce.html.Node
	 */

	/**
	 * Constructs a new Node instance.
	 *
	 * @constructor
	 * @method Node
	 * @param {String} name Name of the node type.
	 * @param {Number} type Numeric type representing the node.
	 */
	function Node(name, type) {
		this.name = name;
		this.type = type;

		if (type === 1) {
			this.attributes = [];
			this.attributes.map = {};
		}
	}

	tinymce.extend(Node.prototype, {
		/**
		 * Replaces the current node with the specified one.
		 *
		 * @example
		 * someNode.replace(someNewNode);
		 *
		 * @method replace
		 * @param {tinymce.html.Node} node Node to replace the current node with.
		 * @return {tinymce.html.Node} The old node that got replaced.
		 */
		replace : function(node) {
			var self = this;

			if (node.parent)
				node.remove();

			self.insert(node, self);
			self.remove();

			return self;
		},

		/**
		 * Gets/sets or removes an attribute by name.
		 *
		 * @example
		 * someNode.attr("name", "value"); // Sets an attribute
		 * console.log(someNode.attr("name")); // Gets an attribute
		 * someNode.attr("name", null); // Removes an attribute
		 *
		 * @method attr
		 * @param {String} name Attribute name to set or get.
		 * @return {String} value Optional value to set.
		 */
		attr : function(name, value) {
			var self = this, attrs, i, undef;

			if (attrs = self.attributes) {
				if (value !== undef) {
					if (name in attrs.map) {
						// Remove attribute
						if (value === null) {
							delete attrs.map[name];

							i = attrs.length;
							while (i--) {
								if (attrs[i].name === name) {
									attrs = attrs.splice(i, 1);
									return;
								}
							}
						}

						// Set attribute
						i = attrs.length;
						while (i--) {
							if (attrs[i].name === name) {
								attrs[i].value = value;
								break;
							}
						}
					} else
						attrs.push({name: name, value: value});

					attrs.map[name] = value;
				} else {
					return attrs.map[name];
				}
			}
		},

		/**
		 * Does a shallow clones the node into a new node. It will also exclude id attributes since
		 * there should only be one id per document.
		 *
		 * @example
		 * var clonedNode = node.clone();
		 *
		 * @method clone
		 * @return {tinymce.html.Node} New copy of the original node.
		 */
		clone : function() {
			var self = this, clone = new Node(self.name, self.type), i, selfAttrs, selfAttr, cloneAttrs;

			// Clone element attributes
			if (selfAttrs = self.attributes) {
				i = selfAttrs.length;
				cloneAttrs = [];
				cloneAttrs.map = {};

				while (i--) {
					selfAttr = selfAttrs[i];

					// Clone everything except id
					if (selfAttr.name !== 'id') {
						cloneAttrs[cloneAttrs.length] = {name: selfAttr.name, value: selfAttr.value};
						cloneAttrs.map[selfAttr.name] = selfAttr.value;
					}
				}

				clone.attributes = cloneAttrs;
			}

			clone.value = self.value;
			clone.empty = self.empty;

			return clone;
		},

		/**
		 * Unwraps the node in other words it removes the node but keeps the children.
		 *
		 * @example
		 * node.unwrap();
		 *
		 * @method unwrap
		 */
		unwrap : function() {
			var self = this, node, next;

			for (node = self.firstChild; node; ) {
				next = node.next;
				self.insert(node, self, true);
				node = next;
			}

			self.remove();
		},

		/**
		 * Removes the node from it's parent.
		 *
		 * @example
		 * node.remove();
		 *
		 * @method remove
		 */
		remove : function() {
			var self = this, parent = self.parent, next = self.next, prev = self.prev;

			if (parent.firstChild === self) {
				parent.firstChild = next;

				if (next)
					next.prev = null;
			} else {
				prev.next = next;
			}

			if (parent.lastChild === self) {
				parent.lastChild = prev;

				if (prev)
					prev.next = null;
			} else {
				next.prev = prev;
			}

			self.parent = self.next = self.prev = null;

			return self;
		},

		/**
		 * Appends a new node as a child of the current node.
		 *
		 * @example
		 * node.append(someNode);
		 *
		 * @method append
		 * @param {tinymce.html.Node} node Node to append as a child of the current one.
		 * @return {tinymce.html.Node} The node that got appended.
		 */
		append : function(node) {
			var self = this, last = self.lastChild;

			if (node.parent)
				node.remove();

			if (last) {
				last.next = node;
				node.prev = last;
				self.lastChild = node;
			} else
				self.lastChild = self.firstChild = node;

			node.parent = self;

			return node;
		},

		/**
		 * Inserts a node at a specific position as a child of the current node.
		 *
		 * @example
		 * node.insert(newNode, oldNode);
		 *
		 * @method insert
		 * @param {tinymce.html.Node} node Node to insert as a child of the current node.
		 * @param {tinymce.html.Node} ref_node Reference node to set node before/after.
		 * @param {Boolean} before Optional state to insert the node before the reference node.
		 * @return {tinymce.html.Node} The node that got inserted.
		 */
		insert : function(node, ref_node, before) {
			var self = this, parent = self.parent || self, refParent = ref_node.parent;

			if (node.parent)
				node.remove();

			if (before) {
				if (ref_node === parent.firstChild)
					parent.firstChild = node;
				else
					ref_node.prev.next = node;

				node.prev = ref_node.prev;
				node.next = ref_node;
				ref_node.prev = node;
			} else {
				if (ref_node === parent.lastChild)
					parent.lastChild = node;
				else
					ref_node.next.prev = node;

				node.next = ref_node.next;
				node.prev = ref_node;
				ref_node.next = node;
			}

			node.parent = self;

			return node;
		},

		/**
		 * Removes all children of the current node.
		 *
		 * @method empty
		 * @return {tinymce.html.Node} The current node that got cleared.
		 */
		empty : function() {
			var self = this;

			self.firstChild = self.lastChild = null;

			return self;
		},

		/**
		 * Returns true/false if the node is to be considered empty or not
		 *
		 * @example
		 * node.isEmpty({img : true});
		 * @method isEmpty
		 * @param {Object} elements Name/value object with elements that are automatically treated as non empty elements.
		 * @return {Boolean} true/false if the node is empty or not.
		 */
		isEmpty : function(elements) {
			var self = this, node = self;

			while (node = walk(node, self)) {
				if ((node.type === 3 && !whiteSpaceRegExp.test(node.value)) || elements[node.name])
					return false;
			}

			return true;
		}
	});

	tinymce.html.Node = Node;
})(tinymce);